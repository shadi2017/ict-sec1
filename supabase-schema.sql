-- ============================================================
--  منصة ICT الثانوية — مخطط قاعدة البيانات (Supabase / Postgres)
--  طريقة التشغيل: Supabase → SQL Editor → New query → الصق الكل → Run
-- ============================================================

create extension if not exists "pgcrypto";

-- الطلاب -----------------------------------------------------
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  phone         text        not null unique,          -- رقم الموبايل (بعد التنظيف)
  grade         text        not null default 'y1',    -- y1 | y2 | y3
  pass_hash     text        not null,                 -- scrypt (سيرفر فقط)
  status        text        not null default 'pending'
                check (status in ('pending','active','blocked')),
  points        integer     not null default 0,
  certs         integer     not null default 0,
  progress      jsonb       not null default '{}'::jsonb,
  note          text,                                 -- ملاحظة الأدمن
  created_at    timestamptz not null default now(),
  activated_at  timestamptz,
  last_seen     timestamptz
);

-- الأجهزة (بحد أقصى 2 لكل حساب) -----------------------------
create table if not exists public.devices (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid        not null references public.students(id) on delete cascade,
  token       text        not null unique,            -- جلسة عشوائية
  fp          text        not null,                   -- بصمة الجهاز (مُجزّأة في المتصفح)
  label       text,                                   -- وصف مقروء للجهاز
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  revoked     boolean     not null default false
);
create index if not exists devices_student_idx on public.devices (student_id);
create index if not exists devices_token_idx   on public.devices (token);

-- الأحداث (للتحليلات) ---------------------------------------
create table if not exists public.events (
  id          bigserial primary key,
  student_id  uuid        references public.students(id) on delete cascade,
  kind        text        not null,     -- login | lesson | quiz | lab | game | demo | tutor | unit | register
  ref         text,                     -- معرّف الدرس/المعمل/اللعبة
  value       integer,                  -- مثلاً نسبة درجة الاختبار
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_student_idx on public.events (student_id);
create index if not exists events_kind_idx    on public.events (kind);

-- الأمان: مفيش سياسات (RLS) — يعني محدش يقدر يوصل للجداول
-- إلا بمفتاح service_role اللي بيفضل على السيرفر بس.
alter table public.students enable row level security;
alter table public.devices  enable row level security;
alter table public.events   enable row level security;
