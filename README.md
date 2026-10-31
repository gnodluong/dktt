# Tiếp thân nhân · Đại đội 5

Web app đăng ký và xác nhận **tiếp thân nhân quân nhân** cho Đại đội 5 — Tiểu đoàn 2 —
Trường Cao đẳng Hậu cần 2. Thân nhân đăng ký trước, chỉ huy nhận thông báo đẩy và duyệt
ngay trên điện thoại.

- Next.js 16 (App Router) · Supabase (Postgres, Auth) · Web Push (VAPID) · Vercel
- Giao diện tiếng Việt, mobile-first, sáng/tối theo hệ thống.

## Việc app làm

| Luồng | Ai làm | Kết quả |
|---|---|---|
| Đăng ký thăm cuối tuần | Thân nhân, không cần tài khoản | Xem lại thông tin đã nhập, chờ chỉ huy duyệt |
| Đơn đột xuất | Thân nhân, chọn ngày trong 2 tuần tới | Đơn có lý do, cần chỉ huy duyệt, suất giới hạn |
| Duyệt / từ chối / ghi nhận đã tiếp | Chỉ huy, trực ban | Thân nhân nhận thông báo đẩy ngay |
| Tạm dừng tiếp theo ngày | Chỉ huy | Khoá ngày đó, gửi thông báo cho toàn bộ hoặc từng lớp |
| Lịch sử đăng ký | Chỉ huy | Sổ toàn bộ phiếu, lọc theo ngày và trạng thái, xuất CSV |
| Quản lý lớp, tiểu đội, quân nhân | Chỉ huy | Tạo lớp mới, thêm/sửa/ẩn quân nhân |
| Nhập danh sách | Chỉ huy | Tải file Excel/Word, tự tạo lớp và tiểu đội |

Quy tắc mặc định (sửa được trong bảng `settings`):

- **Thứ Bảy và Chủ nhật mở tiếp hằng tuần.** Không cần bật gì.
- Phải đăng ký **trước ít nhất 2 ngày** (`min_lead_days`) để đơn vị chốt cơm; đăng ký sát 1 ngày không nhận.
- **Không giới hạn lượt cuối tuần** (`capacity.weekend = 0`); đặt số dương nếu muốn chặn.
  **6 suất đột xuất/ngày** (`capacity.urgent`).
- Ngày bị thông báo tạm dừng thì không nhận phiếu, kể cả phiếu đã có sẵn.
- **Khung giờ thăm 08:30 – 15:00** (`visit_window`), ban chỉ huy sửa trong *Cài đặt*.
  Thân nhân chọn khoảng 30 phút trong khung đó khi đăng ký; không giới hạn số người đi cùng.

## 1. Cài đặt Supabase

1. Tạo project (hoặc dùng project hiện có).
2. Mở **SQL Editor**, chạy lần lượt:
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — bảng, chính sách truy cập, bucket `chung-tu`.
   - [`supabase/migrations/0002_visit_window.sql`](supabase/migrations/0002_visit_window.sql) — cột giờ đến, bỏ giới hạn số người, khung giờ thăm.
   - [`supabase/seed.sql`](supabase/seed.sql) — 3 lớp, 16 tiểu đội, **191 quân nhân** lấy từ `roster.json` của đơn vị.

   Hoặc dán một lần [`supabase/setup.sql`](supabase/setup.sql) (gộp cả ba file trên).
3. **Authentication → Sign In / Providers**: tắt *Allow new users to sign up* để chỉ người được tạo mới đăng nhập được.
4. Tạo tài khoản chỉ huy: **Authentication → Users → Add user** (email + mật khẩu). Trigger tự tạo hồ sơ với vai trò `duty`.
5. Nâng quyền chỉ huy:

```sql
update public.profiles set role = 'commander', full_name = 'Nguyễn Văn A'
where id = (select id from auth.users where email = 'chihuy@daidoi5.vn');
```

**Đăng nhập bằng họ tên.** Trang đăng nhập nhận họ tên ("Lê Văn Mạnh"), tên viết liền
("levanmanh") hoặc email; hệ thống tự ghép `levanmanh@daidoi5.vn`. Vì vậy tài khoản phải
được tạo với email đúng quy tắc đó.

Vai trò: `admin` (toàn quyền) · `commander` (chỉ huy) · `duty` (trực ban). Cả ba đều
duyệt phiếu và đăng thông báo.

## 2. Biến môi trường

Sao chép `.env.example` thành `.env.local` rồi điền:

| Biến | Lấy ở đâu |
|---|---|
| `SUPABASE_URL` | Project Settings → API |
| `SUPABASE_PUBLISHABLE_KEY` | API key `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | API key `sb_secret_…` — **chỉ dùng ở server** |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cùng giá trị, để trình duyệt dùng |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npm run vapid` |
| `VAPID_SUBJECT` | URL `https:` của ứng dụng (chuẩn Web Push, **không phải email**) |
| `CRON_SECRET` | chuỗi ngẫu nhiên, dùng cho cron nhắc lịch |

Khoá VAPID phải cố định: đổi khoá là mọi thiết bị phải bật thông báo lại.

## 3. Chạy thử

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # kiểm tra bản production
```

Trang thân nhân: `/` · `/dang-ky` · `/dang-ky/dot-xuat` · `/thong-bao`
Bàn trực: `/chi-huy` (đăng nhập ở `/chi-huy/login`).

### Xem lại đăng ký

- Sau khi gửi, thiết bị được đặt cookie `dktt_dk`; trang chủ hiện dòng **Đăng ký gần đây**
  để mở lại đúng trang đó, kèm trạng thái mới nhất.
- Người khác mở cùng đường dẫn sẽ chỉ thấy ô nhập **4 số cuối điện thoại** đã dùng khi
  đăng ký. Sai số thì không xem được — không có danh sách công khai.
- Chỉ huy xem toàn bộ trong **Lịch sử** (kèm mã `DK…` để đối chiếu nội bộ).

## 4. Deploy Vercel

1. Import repo này vào Vercel (framework Next.js, không cần build setting riêng).
2. Thêm toàn bộ biến môi trường ở mục **Settings → Environment Variables** (cả Production và Preview).
3. Deploy. Thêm domain thật vào **Authentication → URL Configuration** của Supabase nếu dùng đăng nhập.
4. Cron nhắc lịch (`vercel.json`) chạy 17:00 giờ VN mỗi ngày tại `/api/cron/reminders`;
   Vercel tự gửi header `Authorization: Bearer $CRON_SECRET` khi biến này tồn tại.

## 5. Thông báo đẩy

- Chỉ huy bật ở **Cài đặt → Thông báo đẩy trên thiết bị này**, bấm *Gửi thông báo thử* để kiểm tra.
- Thân nhân bật ngay trên trang phiếu sau khi gửi; thiết bị được gắn với mã phiếu nên chỉ
  nhận thông báo của phiếu mình.
- **iPhone/iPad**: phải *Chia sẻ → Thêm vào Màn hình chính* rồi mở app từ biểu tượng mới
  bật được (giới hạn của iOS 16.4+). App đã hiện hướng dẫn này.
- Thông báo được gửi khi: có phiếu mới (tới chỉ huy), phiếu được duyệt/từ chối/huỷ (tới
  thân nhân), có thông báo tạm dừng (tới toàn bộ thân nhân đã bật), và nhắc trước ngày
  đến thăm lúc 17:00.

## 6. Quản lý lớp và quân nhân

**Lớp & tiểu đội** (`/chi-huy/lop`)

- Tạo lớp mới bằng mã lớp (ví dụ `K4`) và tên lớp. Lớp mới hiện ngay trong form đăng ký
  của thân nhân.
- Thêm tiểu đội cho từng lớp; mã tiểu đội tự sinh (`K4-1`, `K4-2`…).
- Tạm ẩn lớp không còn dùng — dữ liệu và phiếu cũ giữ nguyên.

**Quân nhân** (`/chi-huy/quan-nhan`)

- **Thêm quân nhân**: họ tên, lớp, tiểu đội, cấp bậc, chức vụ, điện thoại, địa chỉ.
- **Sửa** từng dòng. Bỏ tick “Đang theo học” để ẩn khỏi form đăng ký mà vẫn giữ lịch sử phiếu.
- **Nhập danh sách** (`/chi-huy/quan-nhan/nhap`): tải file mẫu, điền rồi tải lên.

| Định dạng | Ghi chú |
|---|---|
| `.xlsx` | Đọc trang tính đầu tiên — giữ dấu tiếng Việt tốt nhất |
| `.docx` | Đọc bảng đầu tiên trong file Word |
| `.csv`, `.txt` | UTF-8, hoặc tự nhận bảng mã Windows-1258 |

- Cột bắt buộc: **Họ và tên**, **Lớp**. Các cột khác (Cấp bậc, Chức vụ, Tiểu đội, Điện thoại,
  Địa chỉ, Ghi chú) tuỳ chọn; tên cột có dấu hay không dấu đều đọc được.
- Lớp hoặc tiểu đội chưa có sẽ **tự tạo**. Cùng họ tên + cùng lớp thì **cập nhật**, không
  nhân bản.
- File mẫu: nút trong trang nhập, hoặc trực tiếp `/api/mau-nhap?dinh-dang=xlsx` và
  `/api/mau-nhap?dinh-dang=docx`.

## 7. Cấu trúc

```
src/app/            tuyến công khai + bàn trực (route group (panel))
src/components/     form, phiếu, hàng chờ duyệt, điều hướng
src/lib/            domain (ngày giờ VN, mã phiếu), data (truy vấn), actions (server actions)
src/lib/supabase/   client admin (server), client cookie (@supabase/ssr), browser
supabase/           migration + seed 191 quân nhân
public/sw.js        service worker nhận thông báo đẩy
scripts/            sinh seed, sinh khoá VAPID, sinh icon, chụp ảnh kiểm tra
```

## 8. Bảo mật và giới hạn đã biết

- Thân nhân **không có tài khoản**: gửi đăng ký qua server action; sau khi gửi chỉ xem lại
  thông tin đã nhập và trạng thái duyệt — không có phiếu, mã QR hay thao tác in. Mã đăng ký
  (`DK…`) chỉ dùng nội bộ để đối chiếu trong sổ.
- Khoá `service_role` chỉ nằm ở server (server actions, route handlers); không có biến nào
  lộ khoá này ra trình duyệt.
- Chống spam nhẹ: mỗi số điện thoại 1 đăng ký/ngày, tối đa 5 lượt gửi/24 giờ, bẫy bot ẩn.
  Chưa có CAPTCHA — nếu bị spam thật thì thêm Turnstile.
- `shortcut: giới hạn sức chứa đếm theo lượt duyệt, chưa trừ khi quá giờ; nâng cấp khi cần chặn theo khung giờ 15 phút.`
- Ảnh giấy tờ cho đơn đột xuất: cột `proof_path` và bucket `chung-tu` đã có sẵn nhưng giao
  diện chưa upload — thêm khi đơn vị cần đối chiếu.
