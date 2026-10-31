-- 0002_visit_window.sql — khung giờ thăm và số người đi cùng không giới hạn
-- Chạy trong Supabase SQL Editor (một lần). An toàn khi chạy lại.

alter table public.visit_requests
  add column if not exists time_from time,
  add column if not exists time_to   time;

-- Không còn chia buổi Sáng/Chiều: giờ đến nằm ở time_from/time_to.
alter table public.visit_requests alter column session drop not null;

alter table public.visit_requests
  drop constraint if exists visit_requests_time_order;
alter table public.visit_requests
  add constraint visit_requests_time_order
  check (time_to is null or time_from is null or time_to > time_from);

-- Bỏ giới hạn 8 người đi cùng.
alter table public.visit_requests
  drop constraint if exists visit_requests_companions_check;
alter table public.visit_requests
  add constraint visit_requests_companions_check
  check (companions between 1 and 200);

-- Khung giờ thăm mặc định 08:30–15:00, ban chỉ huy sửa được trong ứng dụng.
insert into public.settings (key, value)
values ('visit_window', '{"start":"08:30","end":"15:00"}'::jsonb)
on conflict (key) do nothing;

insert into public.settings (key, value)
values ('contact', '{"address":"Số 50 Lê Văn Việt","phone":"096418047","name":"Lê Văn Mạnh"}'::jsonb)
on conflict (key) do nothing;
