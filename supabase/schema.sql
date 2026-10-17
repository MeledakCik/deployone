-- Depup — skema Supabase. Jalankan SEKALI di Supabase Dashboard → SQL Editor (aman dijalankan ulang).
-- Semua tabel mengaktifkan RLS TANPA policy: hanya service_role (dipakai server Next.js) yang bisa akses.
-- Anon key / browser tidak bisa membaca apa pun.

create table if not exists public.user_data (
  email           text primary key,
  history         jsonb not null default '[]'::jsonb,
  domains         jsonb not null default '[]'::jsonb,
  env_vars        text,                 -- terenkripsi AES-256-GCM (lihat crypto.ts)
  settings_tokens text,                 -- terenkripsi AES-256-GCM
  updated_at      timestamptz not null default now()
);

create table if not exists public.app_users (
  email      text primary key,
  name       text not null default '',
  picture    text,
  first_seen bigint not null,
  last_seen  bigint not null,
  logins     integer not null default 0
);
create index if not exists app_users_last_seen_idx on public.app_users (last_seen desc);

create table if not exists public.daily_stats (
  day   date not null,
  field text not null,
  count integer not null default 0,
  primary key (day, field)
);

create or replace function public.bump_stat(p_day date, p_field text)
returns void language sql security invoker as $$
  insert into public.daily_stats (day, field, count) values (p_day, p_field, 1)
  on conflict (day, field) do update set count = public.daily_stats.count + 1;
$$;

create table if not exists public.admin_settings (
  key   text primary key,
  value jsonb not null
);

create table if not exists public.audit_log (
  id     bigint generated always as identity primary key,
  at     bigint not null,
  by     text not null,
  action text not null,
  detail text not null default ''
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);

create table if not exists public.abuse_reports (
  id          text primary key,
  slug        text not null,
  kind        text not null,
  owner       text,
  reason      text not null,
  contact     text,
  created_at  timestamptz not null default now(),
  status      text not null default 'open',
  resolved_at bigint,
  resolved_by text,
  note        text
);
create index if not exists abuse_reports_created_idx on public.abuse_reports (created_at desc);
create index if not exists abuse_reports_slug_idx on public.abuse_reports (slug);

create table if not exists public.support_reports (
  id          text primary key,
  email       text not null,
  created_at  timestamptz not null default now(),
  source      text not null,
  view        text,
  summary     text not null,
  transcript  jsonb not null default '[]'::jsonb,
  diagnostics jsonb,
  status      text not null default 'open',
  replies     jsonb not null default '[]'::jsonb
);
create index if not exists support_reports_created_idx on public.support_reports (created_at desc);

create table if not exists public.campaigns (
  id         text primary key,
  created_at bigint not null,
  by         text not null,
  subject    text not null,
  body       text not null,
  preheader  text not null default '',
  cta_label  text not null default '',
  cta_url    text not null default '',
  status     text not null,
  total      integer not null default 0,
  sent       integer not null default 0,
  failed     integer not null default 0,
  last_error text
);
create index if not exists campaigns_created_idx on public.campaigns (created_at desc);

create table if not exists public.email_unsubs (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.user_data       enable row level security;
alter table public.app_users       enable row level security;
alter table public.daily_stats     enable row level security;
alter table public.admin_settings  enable row level security;
alter table public.audit_log       enable row level security;
alter table public.abuse_reports   enable row level security;
alter table public.support_reports enable row level security;
alter table public.campaigns       enable row level security;
alter table public.email_unsubs    enable row level security;

-- Ukuran database (untuk meter pemakaian di panel admin).
create or replace function public.db_size_bytes()
returns bigint language sql security invoker as $$
  select pg_database_size(current_database());
$$;

revoke execute on function public.bump_stat(date, text) from public, anon, authenticated;
revoke execute on function public.db_size_bytes() from public, anon, authenticated;
grant execute on function public.bump_stat(date, text) to service_role;
grant execute on function public.db_size_bytes() to service_role;
