-- DROP ZONE TELEGRAM BOT
-- Run in Supabase SQL Editor. Uses service-role access only from the Edge Function.
create extension if not exists pgcrypto;

create table if not exists public.telegram_users (
  telegram_id bigint primary key,
  username text,
  first_name text,
  last_name text,
  referral_code text not null unique,
  referred_by bigint references public.telegram_users(telegram_id),
  points bigint not null default 0 check (points >= 0),
  submission_state text,
  submission_mission_id uuid,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bot_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'Airdrop',
  action_url text,
  reward_points bigint not null default 0 check (reward_points >= 0),
  status text not null default 'draft' check (status in ('draft','active','paused','ended')),
  starts_at timestamptz,
  ends_at timestamptz,
  max_completions integer,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_submissions (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.telegram_users(telegram_id) on delete cascade,
  mission_id uuid not null references public.bot_missions(id) on delete cascade,
  proof text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (telegram_id, mission_id)
);

create table if not exists public.bot_point_ledger (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint not null references public.telegram_users(telegram_id) on delete cascade,
  points bigint not null,
  reason text not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists bot_missions_status_idx on public.bot_missions(status, created_at desc);
create index if not exists bot_submissions_status_idx on public.bot_submissions(status, created_at asc);
create index if not exists bot_submissions_user_idx on public.bot_submissions(telegram_id, created_at desc);
create index if not exists telegram_users_referrer_idx on public.telegram_users(referred_by);

-- All bot tables are private. The Edge Function uses SUPABASE_SERVICE_ROLE_KEY.
alter table public.telegram_users enable row level security;
alter table public.bot_missions enable row level security;
alter table public.bot_submissions enable row level security;
alter table public.bot_point_ledger enable row level security;

drop policy if exists "deny direct telegram user access" on public.telegram_users;
drop policy if exists "deny direct bot mission access" on public.bot_missions;
drop policy if exists "deny direct bot submission access" on public.bot_submissions;
drop policy if exists "deny direct bot ledger access" on public.bot_point_ledger;

-- No anon/authenticated policies are intentionally created.
-- Add missions from SQL Editor initially; admin UI can be added in the next phase.


-- Atomic admin approval: locks the submission and credits points exactly once.
create or replace function public.admin_approve_bot_submission(p_submission_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.bot_submissions%rowtype; m public.bot_missions%rowtype; new_points bigint;
begin
  select * into s from public.bot_submissions where id = p_submission_id for update;
  if s.id is null then raise exception 'Submission not found'; end if;
  if s.status <> 'pending' then raise exception 'Submission already reviewed'; end if;
  select * into m from public.bot_missions where id = s.mission_id;
  update public.bot_submissions set status='approved', reviewed_at=now() where id=s.id;
  update public.telegram_users set points=points+m.reward_points, updated_at=now() where telegram_id=s.telegram_id returning points into new_points;
  insert into public.bot_point_ledger(telegram_id,points,reason,reference_id) values(s.telegram_id,m.reward_points,'Mission approved: '||m.title,s.id);
  return jsonb_build_object('telegram_id',s.telegram_id,'mission_title',m.title,'reward_points',m.reward_points,'total_points',new_points);
end; $$;
revoke all on function public.admin_approve_bot_submission(uuid) from public, anon, authenticated;
grant execute on function public.admin_approve_bot_submission(uuid) to service_role;