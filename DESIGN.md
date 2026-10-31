# DESIGN

Hệ thống giao diện của web app Tiếp thân nhân. Mọi giá trị dưới đây là giá trị đang chạy
trong `src/app/globals.css`.

## Thế giới

Sổ tiếp thân nhân ở cổng đơn vị: giấy in biểu mẫu, mực đóng dấu đỏ, số thứ tự in bằng
kiểu chữ hẹp của biển hiệu, đường kẻ đôi dưới tiêu đề mục. Giao diện không mô phỏng giấy
bằng hoa văn — nó dùng **nhịp của biểu mẫu**: đường kẻ, khoảng trắng, số thứ tự, chữ số
condensed và một con dấu duy nhất.

Chữ ký nhận diện: **phiếu hẹn có cuống xé** (đường kẻ đứt, hai lỗ bấm tròn) và **con dấu
đỏ xoay −7°** chỉ xuất hiện khi phiếu đã được duyệt.

## Màu

Sáng (mặc định) — bộ màu đơn vị: `#E0E2DB`, `#D2D4C8`, `#B8BDB5`, `#889696`, `#5F7470`.

| Vai trò | Mã | Dùng cho | Tương phản |
|---|---|---|---|
| Nền giấy | `#e0e2db` | nền trang | — |
| Mặt giấy | `#eceee7` | ô nhập, phiếu, thẻ | — |
| Mực | `#1b2422` | chữ chính | 14.9:1 trên nền |
| Mực phụ | `#38433f` | nhãn, chữ đỡ | 8.4:1 |
| Mực mờ | `#56605c` | ghi chú, placeholder | 5.0:1 |
| Đường kẻ | `#c2c6bb` / `#889696` | viền 1px, kẻ đôi | — |
| Xanh đơn vị | `#5f7470` | nút chính, nhấn | chữ trắng 4.9:1 |
| Đỏ con dấu | `#9e4a3c` | từ chối, tạm dừng, con dấu | 5.0:1 |
| Xanh đã duyệt | `#45664f` | đã duyệt, đã tiếp | 5.6:1 |
| Hổ phách | `#75612f` | chờ duyệt | 5.2:1 |

Tối: nền `#121715`, mặt `#1a211e`, mực `#e8ebe4`, nhấn `#a9bdb4`, đỏ `#dd9a8c`.
Mọi tỉ lệ tương phản đều ≥ 4.5:1 cho chữ thân bài. Đỏ chỉ dùng cho tín hiệu trạng thái
(từ chối, tạm dừng, con dấu), không dùng làm màu thương hiệu.

Không dùng màu làm dấu hiệu duy nhất: mỗi trạng thái luôn kèm chữ ("Chờ duyệt", "Đã duyệt").

## Chữ

- **Be Vietnam Pro** (400/500/600/700/800) — toàn bộ chữ giao diện, đủ dấu tiếng Việt.
- **Barlow Condensed** (500/600/700) — chỉ dùng cho **số và mã**: ngày lớn trên bảng lịch,
  số phiếu, số thứ tự mục, số liệu tổng. Đây là tiếng nói của biển hiệu và biểu mẫu, không
  dùng cho câu.
- Thang: 0.75 / 0.8125 / 0.875 / 0.9375 / 1 / 1.2 / 1.375 / 1.75 / 2.25rem; tiêu đề trang
  `clamp(1.85rem, 5vw, 2.6rem)`, weight 800, tracking −0.032em.
- Nhãn mục dạng chữ hoa nhỏ, tracking 0.1em, 0.8125rem — chỉ dùng cho tên mục, không dùng
  làm eyebrow trang trí phía trên tiêu đề.

## Bố cục

- Trang thân nhân: một cột, tối đa **700px**, lề 20px; mọi thứ đọc được ở 320px.
- Bàn trực: rail 232px từ 900px trở lên; dưới 900px chuyển thanh điều hướng dưới 5 mục.
- Nhịp dọc: khối 8 / 18 / 26 / 34px; trên tiêu đề nhiều hơn dưới tiêu đề.
- Vùng chạm ≥ 44×44px; ô nhập cao 48px; bo góc 4–6px (biểu mẫu giấy, không phải thẻ tròn).

## Điểm nhấn và chuyển động

- Bảng hai ngày cuối tuần ở đầu trang: số ngày cỡ 3–3.7rem, trạng thái bằng chữ, sọc chéo
  khi tạm dừng. Đây là câu trả lời đầu tiên của sản phẩm.
- Con dấu: `rotate(-7deg)`, viền 2px kèm viền trong 1px, chỉ hiện trên phiếu.
- Chuyển động duy nhất: bảng và nút chính trượt lên 10px khi tải (0.45s), con dấu "đóng"
  0.5s khi phiếu vừa được duyệt. Tất cả tắt khi `prefers-reduced-motion`.

## Thành phần

| Thành phần | Quy tắc |
|---|---|
| `.board` | 2 cột, kẻ 1px, ngày lớn condensed, trạng thái bằng chữ + màu |
| `.slip` | lưới `1fr 152px`; cuống xé có 2 lỗ bấm; mobile gập cuống xuống dưới |
| `.stamp` | chỉ 3 biến thể: đã duyệt (đỏ), chờ duyệt (hổ phách), đã huỷ (xám) |
| `.seg` | chọn buổi/loại, núm chọn tô kín nền xanh quân phục |
| `.day-opt` | chọn ngày, ô đã chọn có viền trong 1px |
| `.queue-item` | hàng chờ duyệt: người, quân nhân, ngày, lý do, ghi chú, hai nút ngang nhau |
| `.field` | nhãn trên, gợi ý dưới, lỗi đỏ ngay dưới ô |

## Điều cấm đã giữ

Không gradient chữ, không glass, không bóng cứng offset, không icon thay chữ, không thẻ
lồng thẻ, không số 01/02/03 cho nội dung không phải trình tự (chỉ dùng cho bước biểu mẫu).
