-- 0001_init.sql — Tiếp thân nhân · Đại đội 5
-- Chạy trong Supabase SQL Editor (một lần). An toàn khi chạy lại.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- utilities
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.request_code()
returns text language sql volatile as $$
  select 'DK' || to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYMMDD')
           || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4))
$$;

-- ---------------------------------------------------------------- tables
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'duty' check (role in ('admin', 'commander', 'duty')),
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.classes (
  id          text primary key,
  name        text not null,
  short_name  text not null,
  sort_order  int  not null default 0,
  active      boolean not null default true
);

create table if not exists public.squads (
  id          text primary key,
  class_id    text not null references public.classes (id) on delete cascade,
  name        text not null,
  sort_order  int  not null default 0
);

create table if not exists public.soldiers (
  id          uuid primary key default gen_random_uuid(),
  code        text unique,
  full_name   text not null,
  rank        text,
  position    text,
  class_id    text references public.classes (id) on delete set null,
  squad_id    text references public.squads (id) on delete set null,
  phone       text,
  address     text,
  birth_year  int,
  note        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists soldiers_class_idx on public.soldiers (class_id, squad_id);
create index if not exists soldiers_name_idx  on public.soldiers (lower(full_name));

create table if not exists public.visit_requests (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique default public.request_code(),
  kind            text not null default 'weekend' check (kind in ('weekend', 'urgent')),
  status          text not null default 'pending'  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'checked_in')),
  soldier_id      uuid references public.soldiers (id) on delete set null,
  soldier_name    text not null,
  soldier_rank    text,
  class_id        text,
  squad_id        text,
  visit_date      date not null,
  session         text not null check (session in ('sang', 'chieu')),
  visitor_name    text not null,
  relation        text not null,
  phone           text not null,
  id_card         text,
  address         text,
  companions      smallint not null default 1 check (companions between 1 and 8),
  companion_names text,
  purpose         text,
  note            text,
  urgent_reason   text,
  proof_path      text,
  decision_note   text,
  decided_by      uuid references public.profiles (id) on delete set null,
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists visit_requests_day_idx   on public.visit_requests (visit_date, session, status);
create index if not exists visit_requests_phone_idx on public.visit_requests (phone, created_at desc);
create index if not exists visit_requests_status_idx on public.visit_requests (status, created_at desc);

drop trigger if exists visit_requests_touch on public.visit_requests;
create trigger visit_requests_touch before update on public.visit_requests
  for each row execute function public.touch_updated_at();

-- Bàn trực cập nhật trực tiếp khi có phiếu mới/đổi trạng thái.
do $$
begin
  alter publication supabase_realtime add table public.visit_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

create table if not exists public.notices (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  kind        text not null default 'general' check (kind in ('closure', 'general')),
  start_date  date,
  end_date    date,
  class_ids   text[],
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists notices_date_idx on public.notices (start_date desc, created_at desc);

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  audience    text not null check (audience in ('staff', 'family')),
  staff_id    uuid references public.profiles (id) on delete cascade,
  request_id  uuid references public.visit_requests (id) on delete cascade,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_staff_idx   on public.push_subscriptions (audience, staff_id);
create index if not exists push_request_idx on public.push_subscriptions (request_id);

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

-- ---------------------------------------------------------------- defaults
insert into public.settings (key, value) values
  ('capacity',    '{"weekend": 40, "urgent": 6}'::jsonb),
  ('cutoff_hour', '20'::jsonb),
  ('unit',        '{"don_vi":"Đại đội 5","tieu_doan":"Tiểu đoàn 2","truong":"Trường Cao đẳng Hậu cần 2","hotline":""}'::jsonb),
  ('sessions',    '[{"id":"sang","label":"Sáng","time":"08:00 – 10:30"},{"id":"chieu","label":"Chiều","time":"14:00 – 16:30"}]'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------- access
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.role in ('admin', 'commander', 'duty') from public.profiles p where p.id = auth.uid()), false)
$$;

alter table public.profiles            enable row level security;
alter table public.classes             enable row level security;
alter table public.squads              enable row level security;
alter table public.soldiers            enable row level security;
alter table public.visit_requests      enable row level security;
alter table public.notices             enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.settings            enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists staff_read_classes on public.classes;
create policy staff_read_classes on public.classes for select to authenticated using (public.is_staff());
drop policy if exists staff_read_squads on public.squads;
create policy staff_read_squads on public.squads for select to authenticated using (public.is_staff());

drop policy if exists staff_all_soldiers on public.soldiers;
create policy staff_all_soldiers on public.soldiers for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_all_requests on public.visit_requests;
create policy staff_all_requests on public.visit_requests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_all_notices on public.notices;
create policy staff_all_notices on public.notices for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_own_push on public.push_subscriptions;
create policy staff_own_push on public.push_subscriptions for select to authenticated
  using (staff_id = auth.uid());

drop policy if exists staff_read_settings on public.settings;
create policy staff_read_settings on public.settings for select to authenticated using (public.is_staff());

-- profile on first sign-in
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), 'duty')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- private bucket for giấy tờ đột xuất
insert into storage.buckets (id, name, public) values ('chung-tu', 'chung-tu', false)
on conflict (id) do nothing;


-- seed.sql — danh sách quân nhân thật của đơn vị
-- Sinh tự động từ roster.json. Chạy sau 0001_init.sql.

insert into public.classes (id, name, short_name, sort_order) values
  ('K2', 'K2', 'K2', 1),
  ('K3', 'K3', 'K3', 2),
  ('NVQYc43', 'NVQYc43', 'NVQY', 3)
on conflict (id) do update set name = excluded.name, short_name = excluded.short_name, sort_order = excluded.sort_order;

insert into public.squads (id, class_id, name, sort_order) values
  ('K3-1', 'K3', 'Tiểu đội 1', 1),
  ('K3-2', 'K3', 'Tiểu đội 2', 2),
  ('K3-3', 'K3', 'Tiểu đội 3', 3),
  ('K3-4', 'K3', 'Tiểu đội 4', 4),
  ('K3-5', 'K3', 'Tiểu đội 5', 5),
  ('K2-1', 'K2', 'Tiểu đội 1', 1),
  ('K2-2', 'K2', 'Tiểu đội 2', 2),
  ('K2-3', 'K2', 'Tiểu đội 3', 3),
  ('K2-4', 'K2', 'Tiểu đội 4', 4),
  ('NVQYc43-1', 'NVQYc43', 'Tiểu đội 1', 1),
  ('NVQYc43-2', 'NVQYc43', 'Tiểu đội 2', 2),
  ('NVQYc43-3', 'NVQYc43', 'Tiểu đội 3', 3),
  ('NVQYc43-4', 'NVQYc43', 'Tiểu đội 4', 4),
  ('NVQYc43-5', 'NVQYc43', 'Tiểu đội 5', 5),
  ('NVQYc43-6', 'NVQYc43', 'Tiểu đội 6', 6),
  ('NVQYc43-7', 'NVQYc43', 'Tiểu đội 7', 7)
on conflict (id) do update set class_id = excluded.class_id, name = excluded.name, sort_order = excluded.sort_order;

insert into public.soldiers (code, full_name, rank, position, class_id, squad_id, phone, address, note) values
  ('K3-001', 'Trần Quang Hưng', 'H2', 'HV', 'K3', 'K3-1', null, 'Xã Đông Sơn, T. Thanh Hóa', null),
  ('K3-002', 'Đặng Hữu Tài', 'H1', 'HV', 'K3', 'K3-1', null, 'Xã Tân Hòa, T. Vĩnh Long', null),
  ('K3-003', 'Nguyễn Trọng Vũ', 'H2', 'HV', 'K3', 'K3-1', null, 'Phường Tân Dân, T. Thanh Hóa', null),
  ('K3-004', 'Phạm Văn Nghĩa', 'H2', 'HV', 'K3', 'K3-1', null, 'Xã Tân Thuận, T. Hưng Yên', null),
  ('K3-005', 'Nguyễn Nam Hải', 'H2', 'HV', 'K3', 'K3-1', null, 'Xã Phúc Thọ, TP. Hà Nội', null),
  ('K3-006', 'Cao Hoàng Việt Phi', 'H2', 'HV', 'K3', 'K3-1', null, 'Phường Hoài Nhơn Đông, T. Gia Lai', null),
  ('K3-007', 'Nguyễn Đức Dũng', 'H2', 'HV', 'K3', 'K3-1', null, 'Xã Hậu Lộc, T. Thanh Hoá', null),
  ('K3-008', 'Vũ Nguyễn Toàn Anh', 'H2', 'HV', 'K3', 'K3-1', null, 'Phường Chí Linh, TP. Hải Phòng', null),
  ('K3-009', 'Nguyễn Hoàng Long', 'H1', 'HV', 'K3', 'K3-1', null, '140/18 Lê Đức Thọ, Phường An Nhơn, TP. Hồ Chí Minh', null),
  ('K3-010', 'Tăng Văn Dũng', 'H1', 'HV', 'K3', 'K3-1', null, 'Phường Thành Đông, TP. Hải Phòng', null),
  ('K3-011', 'Lê Bá Xuân Kiên', 'H1', 'HV', 'K3', 'K3-1', null, 'Xã Phú Sơn Lâm Hà, T. Lâm Đồng', null),
  ('K3-012', 'Lê Minh Đức', null, 'HV', 'K3', 'K3-1', null, 'Phường Trảng Dài, T. Đồng Nai', null),
  ('K3-013', 'Phạm Hồng Tiến', 'H2', 'HV', 'K3', 'K3-2', null, 'Phường Yên Tử, T. Quảng Ninh', null),
  ('K3-014', 'Đặng Quốc Hùng', 'H2', 'HV', 'K3', 'K3-2', null, 'Xã Chiên Đàn, TP. Đà Nẵng', null),
  ('K3-015', 'Trần Nguyễn Anh Tuấn', 'H2', 'HV', 'K3', 'K3-2', null, 'Xã Thăng An, TP. Đà Nẵng', null),
  ('K3-016', 'Nguyễn Đức Thành', 'H1', 'HV', 'K3', 'K3-2', null, 'Phường Trảng Dài, T. Đồng Nai', null),
  ('K3-017', 'Ngô Đức Mạnh', 'H2', 'HV', 'K3', 'K3-2', null, 'Xã Hảo Đước, T. Tây Ninh', null),
  ('K3-018', 'Trần Duy Khánh', 'H2', 'HV', 'K3', 'K3-2', null, 'Xã Đại Hải, TP. Cần Thơ', null),
  ('K3-019', 'Trần Quang Anh', 'H2', 'HV', 'K3', 'K3-2', null, 'Phường Cầu Giấy, TP. Hà Nội', null),
  ('K3-020', 'Trần Xuân Anh Tuấn', 'H1', 'HV', 'K3', 'K3-2', null, 'Xã A Lưới 2, TP. Huế', null),
  ('K3-021', 'Nguyễn Hà Vĩnh Hưng', 'H1', 'HV', 'K3', 'K3-2', null, 'Xã Thăng Trường, TP. Đà Nẵng', null),
  ('K3-022', 'Phạm Gia Long', 'H2', 'HV', 'K3', 'K3-2', null, 'Phường Thượng Cát, TP. Hà Nội', null),
  ('K3-023', 'Nguyễn Xuân Khánh', 'H1', 'HV', 'K3', 'K3-2', null, 'Phường Phú Bài, TP. Huế', null),
  ('K3-024', 'Dương Hữu Tường', 'H1', 'HV', 'K3', 'K3-2', null, 'Ấp Bình Khương I, Xã An Thạnh Thuỷ, T. Đồng Tháp', null),
  ('K3-025', 'Nguyễn Duy Bảo', 'H1', 'HV', 'K3', 'K3-3', null, 'Xã Ba Gia, T. Quảng Ngãi', null),
  ('K3-026', 'Phạm Văn Thành', 'H1', 'HV', 'K3', 'K3-3', null, 'Xã Thạnh Phú, TP. Cần Thơ', null),
  ('K3-027', 'Phạm Chu Lai', 'H2', 'HV', 'K3', 'K3-3', null, 'Xã Biển Hồ, T. Gia Lai', null),
  ('K3-028', 'Phạm Văn Nam', 'H2', 'HV', 'K3', 'K3-3', null, 'Xã Khánh Thiện, T. Ninh Bình', null),
  ('K3-029', 'Lê Phước Khôi', 'H1', 'HV', 'K3', 'K3-3', null, 'Phường Nam Đông Hà, T. Quảng Trị', null),
  ('K3-030', 'Trịnh Hoài Đức', 'H2', 'HV', 'K3', 'K3-3', null, 'Xã An Phước, T. Đồng Nai', null),
  ('K3-031', 'Danh Sái', 'H2', 'HV', 'K3', 'K3-3', null, 'Xã Châu Thành, T.An Giang', null),
  ('K3-032', 'Nguyễn Quang Đức', 'H1', 'HV', 'K3', 'K3-3', null, 'Phường Long Hưng, TP. Đồng Nai', null),
  ('K3-033', 'Lê Ngọc Long', 'H2', 'HV', 'K3', 'K3-3', null, 'Xã Triệu Sơn, T. Thanh Hóa', null),
  ('K3-034', 'Nguyễn Trường Duy', 'H1', 'HV', 'K3', 'K3-3', '0393544390', 'Xã Vạn Xuân, T. Phú Thọ', 'SĐT bố 0393890887, SĐT mẹ 0329280850'),
  ('K3-035', 'Nguyễn Chí Vĩ', 'H1', 'HV', 'K3', 'K3-3', '0364415781', 'Xã Cát Tiên 2, T.Lâm Đồng', 'SĐT mẹ 0385294055'),
  ('K3-036', 'Nguyễn Văn Ngọc', 'H1', 'HV', 'K3', 'K3-3', '0976015805', 'Xã Vĩnh Thanh, TP. Hà Nội', 'SĐT bố 0393614716, SĐT mẹ 0368488385'),
  ('K3-037', 'Hà Mạnh Quyết Tiến', 'H1', 'HV', 'K3', 'K3-4', null, 'Xã Cẩm Mỹ, T. Đồng Nai', null),
  ('K3-038', 'Phan Văn Đạt', 'H2', 'HV', 'K3', 'K3-4', null, 'Xã Đan Hải, T.Hà Tĩnh', null),
  ('K3-039', 'Nguyễn Đức Anh', 'H1', 'HV', 'K3', 'K3-4', null, 'Xã Nguyễn Du, T. Hưng Yên', null),
  ('K3-040', 'Trần Quốc Việt', 'H2', 'HV', 'K3', 'K3-4', null, 'Phường Trần Hưng Đạo, T. Hưng Yên', 'SĐT bố 0397270775, SĐT mẹ 0989353643'),
  ('K3-041', 'Đặng Lê Trân', 'H2', 'HV', 'K3', 'K3-4', null, 'Xã Vĩnh Phước, T. Cà Mau', null),
  ('K3-042', 'Nguyễn Bá Hưng', 'H2', 'HV', 'K3', 'K3-4', null, 'Xã Biển Hồ, T. Gia Lai', null),
  ('K3-043', 'Lê Văn Duyến', 'H2', 'HV', 'K3', 'K3-4', null, 'Xã Tiên Trang, T. Thanh Hóa', null),
  ('K3-044', 'Nguyễn Minh Sang', 'H1', 'HV', 'K3', 'K3-4', null, 'Xã Bờ Y, T. Quảng Ngãi', null),
  ('K3-045', 'Lê Văn Quân', 'H1', 'HV', 'K3', 'K3-4', null, 'Phường Quảng Hưng, T. Thanh Hoá', null),
  ('K3-046', 'Phan Tấn Quàng', 'H1', 'HV', 'K3', 'K3-4', null, 'Xã Tân Thành, T. Lâm Đồng', null),
  ('K3-047', 'Nguyễn Ngọc Sơn', 'H1', 'HV', 'K3', 'K3-4', null, 'Xã Long Hưng, T. Hưng Yên', 'SĐT bố 0945763434'),
  ('K3-048', 'Đinh Xuân Hoà', 'H2', 'HV', 'K3', 'K3-5', null, 'Xã Kim Bôi, T. Phú Thọ', null),
  ('K3-049', 'Lê Đức Anh', 'H2', 'HV', 'K3', 'K3-5', '0357169919', 'Phường An Khê, T. Gia Lai', 'SĐT bố 0984177239, SĐT mẹ 0975299245'),
  ('K3-050', 'Võ Văn Thành', 'H1', 'HV', 'K3', 'K3-5', '0383111078', 'Phường An Nhơn Bắc, T. Gia Lai', 'SĐT bố 0985249990, SĐT mẹ 0333017818'),
  ('K3-051', 'Nguyễn Quốc Huy', 'H2', 'HV', 'K3', 'K3-5', '0385911864', 'Phường Thông Tây Hội, TP. Hồ Chí Minh', 'SĐT bố 0908390931, SĐT mẹ 0355148246'),
  ('K3-052', 'Nguyễn Kiên Nhẫn', 'H2', 'HV', 'K3', 'K3-5', '0947589580', 'Phường Giá Rai, T. Cà Mau', 'SĐT bố 0916249207, SĐT mẹ 0916821883'),
  ('K3-053', 'Nguyễn Trần Lê Huy', 'H2', 'HV', 'K3', 'K3-5', '0912564614', 'Phường Bắc Cam Ranh, T. Khánh Hoà', 'SĐT bố 0914434758, SĐT mẹ 0948781282'),
  ('K3-054', 'Nguyễn Trường Sơn', 'H1', 'HV', 'K3', 'K3-5', '0384537698', 'Phường Tây Hoa Lư, T. Ninh Bình', null),
  ('K3-055', 'Lê Minh An', 'H2', 'HV', 'K3', 'K3-5', '0388098252', 'Xã Tam Hải, TP. Đà Nẵng', 'SĐT mẹ 0383801684'),
  ('K3-056', 'Lê Ngọc Phi Hùng', 'H2', 'HV', 'K3', 'K3-5', '0358194820', 'Xã Trương Phú, T. Quảng Trị', 'SĐT mẹ 0934998127'),
  ('K3-057', 'Phạm Tiến Việt', 'H1', 'HV', 'K3', 'K3-5', '0366105593', 'Phường Móng Cái 3, Tp Quảng Ninh', 'SĐT bố 0378131569, SĐT mẹ 0981258216'),
  ('K3-058', 'Hoàng Xuân Long', 'H1', 'HV', 'K3', 'K3-5', '0989932843', 'Phường Trảng Bom, Tp Đồng Nai', 'SĐT bố 0375456784, SĐT mẹ 0394808587'),
  ('K3-059', 'Tạ Nguyên Phương', 'H1', 'HV', 'K3', 'K3-5', '0337277495', 'Phường Buôn Ma Thuột, T. Đắk Lắk', 'SĐT bố 0394936380, SĐT mẹ 0346828331'),
  ('K2-001', 'Nguyễn Đình Trung Hiếu', 'H3', 'TDT', 'K2', 'K2-1', '0374733980', 'Khúc Thừa Du - Hải Phòng', 'SĐT bố 0979034009, SĐT mẹ 0354232772'),
  ('K2-002', 'Nguyễn Văn Phú', 'H3', 'TDP', 'K2', 'K2-1', '0982011510', 'Quý Lộc - Thanh Hoá', 'SĐT bố 0984856649, SĐT mẹ 0987587843'),
  ('K2-003', 'Trần Viết Thuần', 'H2', 'LP', 'K2', 'K2-1', '0376971738', 'Thiên Cầm - Hà Tĩnh', null),
  ('K2-004', 'Nguyễn Thanh Hoàn', 'H2', 'HV', 'K2', 'K2-1', '0977979234', 'Đức Thịnh - Hà Tĩnh', 'SĐT mẹ 0348223239'),
  ('K2-005', 'Tạ Đặng Hồng Anh', 'H2', 'HV', 'K2', 'K2-1', '0388030143', 'Đông Hoa Lư - Ninh Bình', 'SĐT bố 0903857376, SĐT mẹ 0984404580'),
  ('K2-006', 'Hoàng Đức Linh', 'H3', 'HV', 'K2', 'K2-1', '0947621440', 'Lập Thanh - Phú Thọ', 'SĐT bố 0948433469, SĐT mẹ 0333943626'),
  ('K2-007', 'Đào Duy Khánh', 'H1', 'HV', 'K2', 'K2-1', '0355767982', 'Vũ Vân - Hưng Yên', 'SĐT bố 0948324200, SĐT mẹ 0918105383'),
  ('K2-008', 'Nguyễn Văn Quang', 'H3', 'HV', 'K2', 'K2-1', '0929374734', 'Vĩnh Lai - Tp Hải Phòng', 'SĐT mẹ 0929374734'),
  ('K2-009', 'Nguyễn Văn Minh', 'H2', 'HV', 'K2', 'K2-1', '0979544235', 'Nam Đông Hà - Quảng Trị', 'SĐT bố 0944535793, SĐT mẹ 0858868634'),
  ('K2-010', 'Zơ Râm Duy Tuyền', 'H2', 'HV', 'K2', 'K2-1', '0332466036', 'La Dee - Đà Nẵng', 'SĐT mẹ 0365570344'),
  ('K2-011', 'Đoàn Quang Tú', 'H2', 'HV', 'K2', 'K2-1', '0364922972', 'Lai Thành - Ninh Bình', 'SĐT bố 0329926128, SĐT mẹ 0363318838'),
  ('K2-012', 'Nguyễn Quyết Thắng', 'H2', 'HV', 'K2', 'K2-1', '0352677858', 'Vĩnh Tường - Phú Thọ', 'SĐT bố 0367082311'),
  ('K2-013', 'Trần Minh Huy', 'H3', 'TDT', 'K2', 'K2-2', '0813824502', 'Thọ Phong - Quãng Ngãi', 'SĐT bố 0918320506, SĐT mẹ 0915621923'),
  ('K2-014', 'Nguyễn Đại Thành', 'H3', 'TDP', 'K2', 'K2-2', '0364862042', 'Hiệp Cường - Hưng Yên', 'SĐT bố 0971117946, SĐT mẹ 0933001161'),
  ('K2-015', 'Giàng Minh Cương', 'H2', 'LT', 'K2', 'K2-2', '0348852304', 'Nghĩa Thuận - Tuyên Quang', 'SĐT bố 0348437401, SĐT mẹ 0354341431'),
  ('K2-016', 'Tao Văn Bình', 'H2', 'HV', 'K2', 'K2-2', '0354521196', 'Mường Chà - Điện Biên', 'SĐT bố 0945123561, SĐT mẹ 0862045490'),
  ('K2-017', 'Phạm Ngọc Lộc', 'H2', 'HV', 'K2', 'K2-2', '0344599542', 'Giao Thuỷ - Ninh Bình', 'SĐT mẹ 0333723028'),
  ('K2-018', 'Phạm Đăng Khôi', 'H3', 'HV', 'K2', 'K2-2', '0949223251', 'Vĩnh Trạch - Cà Mau', 'SĐT bố 0919581016, SĐT mẹ 0947627715'),
  ('K2-019', 'Nguyễn Huy Nam', 'H2', 'HV', 'K2', 'K2-2', '0847766000', 'Phú Lý - Ninh Bình', 'SĐT bố 0984823963, SĐT mẹ 0339009886'),
  ('K2-020', 'Nguyễn Trung Nguyên', 'H2', 'HV', 'K2', 'K2-2', '0582276477', 'Hải Xuân - Ninh Bình', 'SĐT bố 0382866865, SĐT mẹ 0933947388'),
  ('K2-021', 'Đinh Việt Hoàng', 'H3', 'HV', 'K2', 'K2-2', '0848131005', 'Xuân Viên - Phú Thọ', 'SĐT bố 0398577299, SĐT mẹ 0254388896'),
  ('K2-022', 'Văn Ngọc Hải', 'H3', 'HV', 'K2', 'K2-2', '0984263805', 'Bình Lợi - Tp. Hồ Chí Minh', 'SĐT mẹ 0395198158'),
  ('K2-023', 'Lê Tiến Minh Quang', 'H3', 'HV', 'K2', 'K2-2', '0374960805', 'Sơn Tây - Hà Tĩnh', 'SĐT bố 0968014899, SĐT mẹ 0336977768'),
  ('K2-024', 'Lý Đức Duy', 'H3', 'HV', 'K2', 'K2-2', '0828216870', 'Na Rì - Thái Nguyên', null),
  ('K2-025', 'Nguyễn Duy Khánh', 'H3', 'TDT', 'K2', 'K2-3', '0975360739', 'Nam Định - Ninh Bình', 'SĐT bố 0915505060, SĐT mẹ 0961479407'),
  ('K2-026', 'Huỳnh Văn Duẫn', 'H3', 'TDP', 'K2', 'K2-3', '0387950446', 'Trà Liên - Đà Nẵng', 'SĐT bố 0349537978, SĐT mẹ 0396171152'),
  ('K2-027', 'Lê Văn Phú', 'H2', 'HV', 'K2', 'K2-3', '0388664485', 'Nghĩa Khánh - Nghệ An', 'SĐT bố 0974778426, SĐT mẹ 0805819482'),
  ('K2-028', 'Nguyễn Thành Nam', 'H2', 'HV', 'K2', 'K2-3', '0345270403', 'Kim Liên - Hà Nội', 'SĐT mẹ 0988879959'),
  ('K2-029', 'Lê Thanh Bình', 'H3', 'HV', 'K2', 'K2-3', '0985917360', 'Đặc khu Lý Sơn - Quảng Ngãi', 'SĐT bố 0383631148, SĐT mẹ 0989231152'),
  ('K2-030', 'Phạm Ngọc Quý', 'H2', 'HV', 'K2', 'K2-3', '0866570235', 'Tây Hoa Lư - Ninh Bình', 'SĐT bố 0979923175, SĐT mẹ 0368367232'),
  ('K2-031', 'Nguyễn Thái Tuấn', 'H2', 'HV', 'K2', 'K2-3', '0899566530', 'Thành Sen - Hà Tĩnh', 'SĐT mẹ 0916488681'),
  ('K2-032', 'Bùi Xuân Thành', 'H3', 'HV', 'K2', 'K2-3', '0395223804', 'Ninh Bình - Hưng Yên', 'SĐT bố 0254977799, SĐT mẹ 0976636319'),
  ('K2-033', 'Mai Hải Thanh', 'H3', 'HV', 'K2', 'K2-3', '0377762431', 'Nhà Bè - Tp. Hồ Chí Minh', 'SĐT bố 0961335267, SĐT mẹ 0365180135'),
  ('K2-034', 'Nguyễn Lê Thiện Chí', 'H3', 'HV', 'K2', 'K2-3', '0969930899', 'Hoà Thành - Tây Ninh', 'SĐT bố 0967971241, SĐT mẹ 0329899166'),
  ('K2-035', 'Nguyễn Quang Ngọc', 'H2', 'HV', 'K2', 'K2-3', '0383014077', 'Ninh Hoà - Khánh Hoà', 'SĐT bố 0325337324'),
  ('K2-036', 'Lê Hoàng Nhân', 'H2', 'HV', 'K2', 'K2-3', '0967275498', 'Ngũ Hiệp - Đồng Tháp', 'SĐT mẹ 0387576650'),
  ('K2-037', 'Phạm Trí Tín', 'H3', 'TDT', 'K2', 'K2-4', '0328022378', 'Hoà Hội - Gia Lai', null),
  ('K2-038', 'Bùi Đình Long', 'H3', 'TDP', 'K2', 'K2-4', '0847766000', 'Ninh Giang - Ninh Bình', 'SĐT mẹ 0796213527'),
  ('K2-039', 'Hồ Anh Quân', 'H3', 'HV', 'K2', 'K2-4', '0979544235', 'Quỳnh Sơn - Nghệ An', 'SĐT bố 0394444567'),
  ('K2-040', 'Phạm Văn Vang', 'H3', 'HV', 'K2', 'K2-4', '0365489922', 'Trần Thương - Ninh Bình', 'SĐT bố 0947353734, SĐT mẹ 0336009481'),
  ('K2-041', 'Nguyễn Hữu Thành', 'H2', 'HV', 'K2', 'K2-4', '0373808432', 'Hà Na - Tp Đà Nẵng', 'SĐT bố 0398474473, SĐT mẹ 0342193449'),
  ('K2-042', 'Nguyễn Đình Bảo Phúc', 'H3', 'HV', 'K2', 'K2-4', '0822996971', 'Vĩnh Hoà - Quảng Trị', 'SĐT bố 0776889818, SĐT mẹ 0822996971'),
  ('K2-043', 'Nguyễn Quốc Hậu', 'H3', 'HV', 'K2', 'K2-4', '0765991154', 'Chi Lòng - An Giang', 'SĐT bố 0939571112, SĐT mẹ 0869688142'),
  ('K2-044', 'Đặng Đình Ngọc Trung', 'H3', 'HV', 'K2', 'K2-4', '0393717612', 'Phú Lương - Hà Nội', 'SĐT mẹ 0349920198'),
  ('K2-045', 'Phan Viết Hoàng', 'H2', 'HV', 'K2', 'K2-4', '0395111230', 'Hồng Lộc - Hà Tĩnh', 'SĐT bố 0986313282, SĐT mẹ 0338115021'),
  ('K2-046', 'Hoàng Anh Đức', 'H3', 'HV', 'K2', 'K2-4', '0815288184', 'Tâm Ninh - Thanh Hoá', 'SĐT mẹ 0789051533'),
  ('K2-047', 'Vũ Phước Huy', 'H3', 'HV', 'K2', 'K2-4', '0949907194', 'U Minh - Cà Mau', null),
  ('K2-048', 'Bùi Minh Chiến', 'H3', 'LP', 'K2', 'K2-4', '0395965705', 'Hồng Minh - Hưng Yên', 'SĐT bố 0354812459, SĐT mẹ 0397830594'),
  ('NVQY-001', 'Trương Văn Tài', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Thôn Mepu5, xã Nam Thành, Lâm Đồng', 'SĐT bố 0375323659, SĐT mẹ 0375323659; Ngày sinh: 17/12/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-002', 'Phạm Nguyễn Bình An', 'B1', 'TDP', 'NVQYc43', 'NVQYc43-1', null, 'Bình Hiệp, Tây Ninh', 'SĐT mẹ 0949009818; Ngày sinh: 08/11/2001; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: apa1'),
  ('NVQY-003', 'Dương Duy Anh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Phưởng Hố Nai, Tp Đồng Nai', 'SĐT bố 0366994729, SĐT mẹ 0354501228; Ngày sinh: 08/07/2001; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-004', 'Ngô Tấn Bảo', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Xuân Thành, Tp Đồng Nai', 'SĐT mẹ 0969572845; Ngày sinh: 26/06/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-005', 'Ngô Quang Thông', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Xã Trung Pha, Thĩ xã Phú Nguyễn', 'SĐT bố 0932274786, SĐT mẹ 0932274768; Ngày sinh: 25/07/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-006', 'Cóng Thanh Bình', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Tân Ro, Châu Phà, thị xã Phú Mỹ, Bà Rịa Vũng tàu', 'SĐT bố 0914097752, SĐT mẹ 0395609496; Ngày sinh: 16/11/2003; Giới tính: Nam; Dân tộc: Hoa; Tôn giáo: Không'),
  ('NVQY-007', 'Tạ Hoàng Việt', 'B1', 'LP', 'NVQYc43', 'NVQYc43-1', null, 'Xã Châu Thành, Tây Ninh', 'SĐT mẹ 0347603435; Ngày sinh: 24/11/2001; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: Lớp phó hc a9'),
  ('NVQY-008', 'Nguyễn Hữu Phong', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Hưng Hòa, Bàu Bàng, Bình Dương', 'SĐT bố 0916936496, SĐT mẹ 0342156382; Ngày sinh: 08/06/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-009', 'Nguyễn Hoàng Thanh Hùng', 'B1', 'TDT', 'NVQYc43', 'NVQYc43-1', null, '517/3 Nguyễn Thị Định, Phường Cát Lái, Tp Hồ Chí Minh', 'SĐT bố 0901227791, SĐT mẹ 0913227730; Ngày sinh: 09/05/1999; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: ata1'),
  ('NVQY-010', 'Thái Vạn Phát', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Thủ Đức, Tp Hồ Chí Minh', 'SĐT mẹ 0909360209; Ngày sinh: 01/09/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Phật giáo'),
  ('NVQY-011', 'Nguyễn Cao Minh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Xã Long Thuận, Tây Ninh', 'SĐT mẹ 0845135168; Ngày sinh: 21/04/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-012', 'Đỗ Duy Minh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-1', null, 'Bình Minh,Tp Đồng Nai', 'SĐT bố 0907366629, SĐT mẹ 0372225225; Ngày sinh: 17/01/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-013', 'Lê Phú Đạt', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Xã Hành Liên, Lâm Đồng', 'SĐT bố 0944308816, SĐT mẹ 0975417671; Ngày sinh: 22/02/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-014', 'Nguyễn Gia Huy', 'B1', 'TDT', 'NVQYc43', 'NVQYc43-2', null, '26/22/27 Đường Nguyễn Văn Khối,Phường Thông Tây Hội, Gò Vấp', 'Ngày sinh: 26/02/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: ata2'),
  ('NVQY-015', 'Thàm Hưng Quang', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Phường Tân Thành', 'SĐT bố 0362322317, SĐT mẹ 0978810852; Ngày sinh: 25/05/2003; Giới tính: Nam; Dân tộc: Hoa; Tôn giáo: Không'),
  ('NVQY-016', 'Huỳnh Bảo Phước', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Phường Long Hương, Tp Hồ Chí Minh', 'SĐT bố 0964999949, SĐT mẹ 0903174925; Ngày sinh: 18/07/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-017', 'Nguyễn Dương Luân', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Xã Nhà bè, Tp Hồ Chí Minh', 'SĐT bố 0906024467, SĐT mẹ 0792095451; Ngày sinh: 08/12/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-018', 'Nguyễn Võ Bảo Toàn', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Phú Nhuận, Tp Hồ Chí Minh', 'SĐT bố 0938684745, SĐT mẹ 0909845330; Ngày sinh: 20/10/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-019', 'Nguyễn Quốc Thái', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Xã Hưng Long, Bình Chánh, Tp Hồ Chí Minh', 'SĐT bố 0918894646, SĐT mẹ 0782276379; Ngày sinh: 05/06/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-020', 'Nguyễn Anh Đức', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'xã Bình Ninh, Đồng Tháp', 'SĐT bố 0976211394, SĐT mẹ 0356168011; Ngày sinh: 02/04/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-021', 'Nguyễn Minh Trí', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Xã Cầu Khởi, Tây Ninh', 'SĐT bố 0395155834, SĐT mẹ 0333249733; Ngày sinh: 25/02/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-022', 'Nguyễn Trọng Phúc', 'B1', 'LT', 'NVQYc43', 'NVQYc43-2', null, 'Phường Gò Dầu, Tây Ninh', 'SĐT bố 0933357592, SĐT mẹ 0933056944; Ngày sinh: 04/09/2002; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Phật giáo; Ghi chú DS lớp: Lớp trưởng a9'),
  ('NVQY-023', 'Nguyễn Minh Thuận', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Xã Thạnh Bịnh, Tây Ninh', 'SĐT bố 0343957105, SĐT mẹ 0862960252; Ngày sinh: 08/09/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-024', 'Nguyễn Lê Bình Kiên', 'B1', 'HV', 'NVQYc43', 'NVQYc43-2', null, 'Phường Ninh Thạnh, Tây Ninh', 'SĐT mẹ 0986124339; Ngày sinh: 25/10/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-025', 'Lương Phi Hùng', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'Quảng Sơn, Lâm Đồng', 'SĐT bố 0346084620, SĐT mẹ 0392990385; Ngày sinh: 23/10/2005; Giới tính: Nam; Dân tộc: Tày; Tôn giáo: Không'),
  ('NVQY-026', 'Lê Nguyên Tú', 'B1', 'LP', 'NVQYc43', 'NVQYc43-3', null, 'Thạnh Mỹ Tây, Tp Hồ Chí Minh', 'SĐT bố 0913048605, SĐT mẹ 0977885597; Ngày sinh: 17/9/2002; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: Lớp phó ht a9'),
  ('NVQY-027', 'Nguyễn Hoàng Minh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'Hố Nai, Đồng Nai', 'SĐT bố 0918258857, SĐT mẹ 0916719010; Ngày sinh: 07/10/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Công giáo'),
  ('NVQY-028', 'Trần Hoàng Tín', 'B1', 'TDT', 'NVQYc43', 'NVQYc43-3', null, 'Hiệp Phước, Tp Hồ Chí Minh', 'SĐT bố 0933017633, SĐT mẹ 0326347109; Ngày sinh: 04/05/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: ata3'),
  ('NVQY-029', 'Nguyễn Võ Bảo Quốc', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'Phú Nhuận, Tp Hồ Chí Minh', 'SĐT bố 0938684745, SĐT mẹ 0909845330; Ngày sinh: 20/10/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-030', 'Nguyễn Quốc Vương', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'Tân Minh, Lâm Đồng', 'SĐT bố 0365153813, SĐT mẹ 0937236671; Ngày sinh: 01/01/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Công giáo'),
  ('NVQY-031', 'Huỳnh Nhật Lâm', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'Thuận Mỹ, Tây Ninh', 'SĐT bố 0767256319, SĐT mẹ 0704442027; Ngày sinh: 03/01/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-032', 'Phan Ngọc Sơn', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'An Lục Long, Tây Ninh', 'SĐT mẹ 0984335297; Ngày sinh: 15/4/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-033', 'Tô Đức Sinh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'Chơn Thành, Tp Đồng Nai', 'SĐT bố 0945939539, SĐT mẹ 0973145766; Ngày sinh: 26/11/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-034', 'Nguyễn Phước Hoàng', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'An Thế Đông, Tp Hồ Chí Minh', 'SĐT mẹ 0393131164; Ngày sinh: 7/9/2004.; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-035', 'Nguyễn Văn Phú', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'Ấp Bộ Xô, Bình Thành, Tây Ninh', 'SĐT bố 0359060027, SĐT mẹ 0965967548; Ngày sinh: 29/08/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-036', 'Biện Văn Đua', 'B1', 'HV', 'NVQYc43', 'NVQYc43-3', null, 'ấp 4, xã Mỹ Quý, Tây Ninh', 'SĐT bố 0352182254, SĐT mẹ 0975842147; Ngày sinh: 07/10/2002; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-037', 'Hoàng Mạnh Tú', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Trường Xuân, Lâm Đồng', 'SĐT bố 0385070571; Ngày sinh: 15/6/2007; Giới tính: Nam; Dân tộc: Nùng; Tôn giáo: Không'),
  ('NVQY-038', 'Lương Quốc Đông', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Mỹ Tây, Tp Hồ Chí Minh', 'SĐT bố 0908265957, SĐT mẹ 0938443099; Ngày sinh: 05/12/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Phật Giáo'),
  ('NVQY-039', 'Trình Đức Bình', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Đa Kia, Đồng Nai', 'SĐT bố 0973119534, SĐT mẹ 0966308240; Ngày sinh: 29/7/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-040', 'Nguyễn Hưng', 'B1', 'TDT', 'NVQYc43', 'NVQYc43-4', null, 'Hiệp Phước, Tp Hồ Chí Minh', 'SĐT bố 0988454549, SĐT mẹ 0972890407; Ngày sinh: 26/2/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: ata4'),
  ('NVQY-041', 'Lương Minh Huy', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Khánh Hội, Tp Hồ Chí Minh', 'SĐT bố 0336647962, SĐT mẹ 0983058021; Ngày sinh: 25/12/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Công giáo'),
  ('NVQY-042', 'Bùi Duy Khánh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Tân Long, Tây Ninh', 'SĐT bố 0948523282, SĐT mẹ 0837402872; Ngày sinh: 19/12/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-043', 'Trần Đình Lộc', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Bình Minh, Tây Ninh', 'SĐT mẹ 0858627310; Ngày sinh: 16/7/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-044', 'Nguyễn Quốc Thịnh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Hòa Khánh, Tây Ninh', 'SĐT bố 0967572716, SĐT mẹ 0358444229; Ngày sinh: 08/12/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-045', 'Bùi Trọng Nhân', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'La Ngà, Tp Đồng Nai', 'SĐT mẹ 0379413329; Ngày sinh: 22/7/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Phật giáo'),
  ('NVQY-046', 'Võ Đại Phú Vinh', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Thủ Đức, Tp Hồ Chí Minh', 'SĐT bố 0938243875, SĐT mẹ 0908795852; Ngày sinh: 11/08/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-047', 'Hồ Tân Tấn', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'An Ninh, Tây Ninh', 'SĐT bố 0385501341, SĐT mẹ 0392236624; Ngày sinh: 13/8/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-048', 'Nguyễn Minh Dũng', 'B1', 'HV', 'NVQYc43', 'NVQYc43-4', null, 'Phường Trảng Dài, Tp Đồng Nai', 'SĐT bố 0988476982, SĐT mẹ 0982397954; Ngày sinh: 20/08/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-049', 'Nguyễn Quốc Huy', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Tổ dân phố, xã Đơn Dương, Lâm Đồng', 'SĐT mẹ 0914630480; Ngày sinh: 22/04/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-050', 'Đào Xuân Chiến', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Phường Long Hưng, Tp Đồng Nai', 'SĐT bố 0982475848, SĐT mẹ 0385070326; Ngày sinh: 31/10/206; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-051', 'Ninh Công Chức', 'B1', 'LT', 'NVQYc43', 'NVQYc43-5', null, 'Xã Di Linh, Lâm Đồng', 'SĐT bố 03252237418; Ngày sinh: 26/04/2001; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: lớp trưởng a10'),
  ('NVQY-052', 'Nguyễn Quốc Thái', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Xã Hóc Môn, Tp Hồ Chí Minh', 'SĐT bố 0934959932, SĐT mẹ 0983357933; Ngày sinh: 13/06/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-053', 'Đặng Thành Quý', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Phường Bình Phước, Tp Hồ Chí Minh', 'SĐT bố 0918095968, SĐT mẹ 0814257765; Ngày sinh: 01/01/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-054', 'Nguyễn Hoàng Minh Hiếu', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Châu Thành, Tây Ninh', 'SĐT bố 0389176354, SĐT mẹ 0342022257; Ngày sinh: 25/07/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Thiên chúa'),
  ('NVQY-055', 'Nguyễn Hoàng Sơn', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Xã Cần Giuộc, Tây Ninh', 'SĐT bố 0868614917, SĐT mẹ 0327734130; Ngày sinh: 10/01/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-056', 'Nguyễn Hoàng Hiệp', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Phường Phước Long, Tp Hồ Chí Minh', 'SĐT bố 0984317448, SĐT mẹ 0356140396; Ngày sinh: 02/07/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Công giáo'),
  ('NVQY-057', 'Quách Gia Huy', 'B1', 'TDT', 'NVQYc43', 'NVQYc43-5', null, 'Xã Cần Giuộc, Long An', 'SĐT bố 0918027669, SĐT mẹ 0359894532; Ngày sinh: 28/10/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: ata5'),
  ('NVQY-058', 'Trần Hồ Gia Bảo', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Phường Bàn Cờ, Tp Hồ Chí Minh', 'SĐT bố 0936263776, SĐT mẹ 0902815049; Ngày sinh: 17/05/2002; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Phật giáo'),
  ('NVQY-059', 'Phạm Quốc Thành', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Xã Phú Hòa, Tp Đồng Nai', 'SĐT bố 0369580935, SĐT mẹ 0981004380; Ngày sinh: 05/03/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-060', 'Nguyễn Văn Tùng', 'B1', 'HV', 'NVQYc43', 'NVQYc43-5', null, 'Phường Trảng Dài, Tp Đồng Nai', 'SĐT bố 0902646599, SĐT mẹ 0902038683; Ngày sinh: 24/02/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-061', 'Dương Thế Duy', 'B1', 'TDT', 'NVQYc43', 'NVQYc43-5', null, 'Tổ 12, thôn Phú Tân, xã Phú Riềng, Tp Đồng Nai', 'SĐT bố 0862124142, SĐT mẹ 0973551551; Ngày sinh: 25/10/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: ata6'),
  ('NVQY-062', 'Đào Thành Thiện', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'xã Tân Lài, Tp Đồng Nai', 'SĐT bố 0377110778, SĐT mẹ 0377110778; Ngày sinh: 19/01/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-063', 'Phạm Văn Đình Tài', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Phường Tân Thành, Tp Hồ Chí Minh', 'SĐT bố 0916803908, SĐT mẹ 0971113354; Ngày sinh: 01/03/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-064', 'Huỳnh Thanh Huy', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Xã Long Thành, Tp Đồng Nai', 'SĐT mẹ 0777758857; Ngày sinh: 01/02/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-065', 'Trần Tuấn Duy', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Phường Phú Định, Tp Hồ Chí Minh', 'SĐT bố 0363465172, SĐT mẹ 0984069073; Ngày sinh: 21/02/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-066', 'Nguyễn Gia Bảo', 'B1', 'LP', 'NVQYc43', 'NVQYc43-6', null, 'Phường Tam Phước, Tp Đồng Nai', 'SĐT bố 0983512168, SĐT mẹ 0962568288; Ngày sinh: 26/09/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: Lớp phó htap a10'),
  ('NVQY-067', 'Nguyễn Nam Khởi', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Xã Hảo Đức, Châu Thành, Tây Ninh', 'SĐT bố 0976158159, SĐT mẹ 0946586623; Ngày sinh: 23/04/2002; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-068', 'Nguyễn Minh Duy', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Xã Thạnh Bình, Tây Ninh', 'SĐT bố 0353024204, SĐT mẹ 0334650734; Ngày sinh: 05/10/2007; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-069', 'Nguyễn Hữu Chí', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Ninh Thạnh, Tây Ninh', 'SĐT bố 0366412586, SĐT mẹ 0938588454; Ngày sinh: 18/12/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-070', 'Nguyễn Phan Hoàng Hảo', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Xã Hòa Khánh, Tây Ninh', 'SĐT mẹ 0866776459; Ngày sinh: 02/10/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-071', 'Phạm Văn Trường', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Xuân Đồng, Tp Đồng Nai', 'SĐT bố 0976196782, SĐT mẹ 0962676954; Ngày sinh: 23/08/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-072', 'Nguyễn Minh Kiệt', 'B1', 'HV', 'NVQYc43', 'NVQYc43-6', null, 'Tân Ninh, Tây Ninh', 'SĐT mẹ 0792945984; Ngày sinh: 05/09/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Cao đài'),
  ('NVQY-073', 'Trần Văn Công', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Xã Nghĩa Đức, Lâm Đồng', 'SĐT bố 0385844150, SĐT mẹ 0356597236; Ngày sinh: 17/02/2004; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-074', 'Mai Phương Nam', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Xã An Viễn, Tp Đồng Nai', 'SĐT bố 0966303557; Ngày sinh: 05/05/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Phật giáo'),
  ('NVQY-075', 'Phạm Ngọc Hải', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Xã Hiệp Phước, Tp Hồ Chí Minh', 'SĐT bố 0989875327, SĐT mẹ 0989875327; Ngày sinh: 06/07/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-076', 'Lai Hoàng Vũ', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Hậu Nghĩa, Tây Ninh', 'SĐT mẹ 0338078938; Ngày sinh: 01/10/2000; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-077', 'Đặng Anh Khôi', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Quận Bình Thạnh, Tp Hồ Chí Minh', 'SĐT bố 0987576867, SĐT mẹ 0335283978; Ngày sinh: 25/09/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-078', 'Trần Như Bảo', 'B1', 'LP', 'NVQYc43', 'NVQYc43-7', null, 'Tây Ninh, Long An', 'SĐT bố 0971128633, SĐT mẹ 0879379509; Ngày sinh: 15/11/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: Lớp phó hc a10'),
  ('NVQY-079', 'Nguyễn Văn Đạt', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Hội Cơ, Đồng Tháp', 'SĐT bố 0979854958, SĐT mẹ 0332963924; Ngày sinh: 11/03/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-080', 'Trịnh Minh Tiến', 'B1', 'TDT', 'NVQYc43', 'NVQYc43-7', null, 'Xã Ninh Sơn, Phường Bình Minh, Tây Ninh', 'SĐT bố 0387973229, SĐT mẹ 0919841209; Ngày sinh: 08/12/2002; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không; Ghi chú DS lớp: ata7'),
  ('NVQY-081', 'Nguyễn Tuấn Đạt', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Xã Mỹ Thạnh, Tây Ninh', 'SĐT bố 0913646881, SĐT mẹ 0916153371; Ngày sinh: 13/12/2006; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-082', 'Thạch Hoàng Cầm', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Xã Cát Tiên, Lâm Đồng', 'SĐT mẹ 0357127928; Ngày sinh: 10/05/2007; Giới tính: Nam; Dân tộc: Nùng; Tôn giáo: Không'),
  ('NVQY-083', 'Bạch Xuân Trường', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Xã Đồng Xuân, Đắk Lắk', 'SĐT mẹ 0373241176; Ngày sinh: 12/10/2003; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không'),
  ('NVQY-084', 'Trần Nguyễn Hữu An', 'B1', 'HV', 'NVQYc43', 'NVQYc43-7', null, 'Thôn Phước Tuyên 1, xã Diên Thọ, Khánh Hoà', 'SĐT bố 0356299476, SĐT mẹ 0706851958; Ngày sinh: 17/01/2005; Giới tính: Nam; Dân tộc: Kinh; Tôn giáo: Không')
on conflict (code) do update set
  full_name = excluded.full_name, rank = excluded.rank, position = excluded.position,
  class_id = excluded.class_id, squad_id = excluded.squad_id, phone = excluded.phone,
  address = excluded.address, note = excluded.note;
