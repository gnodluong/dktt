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
