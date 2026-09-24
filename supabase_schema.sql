-- AIRDROPX PRODUCTION SUPABASE SCHEMA
create extension if not exists pgcrypto;

create table if not exists public.categories(
 id uuid primary key default gen_random_uuid(), name text not null unique, slug text not null unique,
 icon text default '🪂', sort_order int default 0, status text not null default 'active',
 created_at timestamptz not null default now()
);
create table if not exists public.profiles(
 id uuid primary key references auth.users(id) on delete cascade, username text unique, email text,
 avatar_url text, wallet_address text, available_balance numeric(12,4) not null default 0,
 pending_balance numeric(12,4) not null default 0, total_earned numeric(12,4) not null default 0,
 created_at timestamptz not null default now()
);
create table if not exists public.campaigns(
 id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique,
 description text, logo_url text, category_id uuid not null references public.categories(id),
 estimated_time text, total_reward numeric(12,4) not null default 0, max_users int,
 completed_count int not null default 0, start_date timestamptz, end_date timestamptz,
 status text not null default 'active' check(status in('draft','active','paused','ended')),
 notes text, created_at timestamptz not null default now()
);
create table if not exists public.tasks(
 id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
 title text not null, description text, reward numeric(12,4) not null default 0,
 task_type text not null default 'manual', proof_type text not null default 'text',
 external_url text, max_completions int, sort_order int not null default 0,
 status text not null default 'active' check(status in('active','inactive')), created_at timestamptz not null default now()
);
create table if not exists public.task_submissions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,
 campaign_id uuid not null references public.campaigns(id) on delete cascade,
 proof_text text, proof_image_url text,
 status text not null default 'pending' check(status in('pending','approved','rejected')),
 rejection_reason text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), unique(user_id,task_id)
);
create table if not exists public.wallet_transactions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 type text not null, amount numeric(12,4) not null, reference_id uuid, description text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.withdrawals(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 amount numeric(12,4) not null check(amount>0), method text not null, destination text not null,
 status text not null default 'pending' check(status in('pending','processing','paid','rejected')),
 admin_note text, created_at timestamptz not null default now(), processed_at timestamptz
);
create table if not exists public.admin_users(user_id uuid primary key references auth.users(id) on delete cascade,role text not null default 'admin',created_at timestamptz not null default now());

insert into public.categories(name,slug,icon,sort_order) values
('Telegram Bots','telegram-bots','🤖',1),('Testnets','testnets','⛓️',2),('NFT Whitelist','nft-whitelist','🖼️',3),
('NFT GTD','nft-gtd','🎟️',4),('Free Mint','free-mint','🆓',5),('Other Web3','other-web3','🌐',6)
on conflict(slug) do nothing;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,username,email) values(new.id,coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1)),new.email) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.approve_task_submission(p_submission_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare s public.task_submissions%rowtype; t public.tasks%rowtype;
begin
 if not exists(select 1 from public.admin_users where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 select * into s from public.task_submissions where id=p_submission_id for update;
 if s.id is null or s.status<>'pending' then raise exception 'Submission not found or already reviewed'; end if;
 select * into t from public.tasks where id=s.task_id;
 update public.task_submissions set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=s.id;
 update public.profiles set available_balance=available_balance+t.reward,total_earned=total_earned+t.reward where id=s.user_id;
 insert into public.wallet_transactions(user_id,type,amount,reference_id,description) values(s.user_id,'task_reward',t.reward,s.id,'Task reward: '||t.title);
 update public.campaigns set completed_count=completed_count+1 where id=s.campaign_id;
end; $$;

create or replace function public.request_withdrawal(p_amount numeric,p_method text,p_destination text) returns uuid language plpgsql security definer set search_path=public as $$
declare out_id uuid;
begin
 if p_amount<1 then raise exception 'Minimum withdrawal is $1.00'; end if;
 update public.profiles set available_balance=available_balance-p_amount where id=auth.uid() and available_balance>=p_amount;
 if not found then raise exception 'Insufficient balance'; end if;
 insert into public.withdrawals(user_id,amount,method,destination) values(auth.uid(),p_amount,p_method,p_destination) returning id into out_id;
 insert into public.wallet_transactions(user_id,type,amount,reference_id,description) values(auth.uid(),'withdrawal',-p_amount,out_id,'Withdrawal request');
 return out_id;
end; $$;

create or replace function public.mark_withdrawal_paid(p_withdrawal_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.admin_users where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 update public.withdrawals set status='paid',processed_at=now() where id=p_withdrawal_id and status='pending';
 if not found then raise exception 'Withdrawal not found or already processed'; end if;
end; $$;

create or replace function public.reject_withdrawal(p_withdrawal_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare w public.withdrawals%rowtype;
begin
 if not exists(select 1 from public.admin_users where user_id=auth.uid()) then raise exception 'Admin access required'; end if;
 select * into w from public.withdrawals where id=p_withdrawal_id for update;
 if w.id is null or w.status<>'pending' then raise exception 'Withdrawal not found or already processed'; end if;
 update public.withdrawals set status='rejected',admin_note=p_reason,processed_at=now() where id=w.id;
 update public.profiles set available_balance=available_balance+w.amount where id=w.user_id;
 insert into public.wallet_transactions(user_id,type,amount,reference_id,description) values(w.user_id,'withdrawal_refund',w.amount,w.id,'Rejected withdrawal refund');
end; $$;

alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_submissions enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists cat_read on public.categories; create policy cat_read on public.categories for select using(status='active');
drop policy if exists camp_read on public.campaigns; create policy camp_read on public.campaigns for select using(status='active');
drop policy if exists task_read on public.tasks; create policy task_read on public.tasks for select using(status='active');

drop policy if exists profile_read on public.profiles; create policy profile_read on public.profiles for select using(auth.uid()=id or exists(select 1 from public.admin_users where user_id=auth.uid()));
drop policy if exists profile_insert on public.profiles; create policy profile_insert on public.profiles for insert with check(auth.uid()=id);
drop policy if exists profile_update on public.profiles; create policy profile_update on public.profiles for update using(auth.uid()=id);

drop policy if exists sub_read on public.task_submissions; create policy sub_read on public.task_submissions for select using(auth.uid()=user_id or exists(select 1 from public.admin_users where user_id=auth.uid()));
drop policy if exists sub_insert on public.task_submissions; create policy sub_insert on public.task_submissions for insert with check(auth.uid()=user_id);
drop policy if exists sub_update_admin on public.task_submissions; create policy sub_update_admin on public.task_submissions for update using(exists(select 1 from public.admin_users where user_id=auth.uid()));

drop policy if exists tx_read on public.wallet_transactions; create policy tx_read on public.wallet_transactions for select using(auth.uid()=user_id or exists(select 1 from public.admin_users where user_id=auth.uid()));
drop policy if exists wd_read on public.withdrawals; create policy wd_read on public.withdrawals for select using(auth.uid()=user_id or exists(select 1 from public.admin_users where user_id=auth.uid()));
drop policy if exists admin_read on public.admin_users; create policy admin_read on public.admin_users for select using(auth.uid()=user_id);

drop policy if exists admin_campaigns on public.campaigns;
create policy admin_campaigns on public.campaigns for all using(exists(select 1 from public.admin_users where user_id=auth.uid())) with check(exists(select 1 from public.admin_users where user_id=auth.uid()));
drop policy if exists admin_tasks on public.tasks;
create policy admin_tasks on public.tasks for all using(exists(select 1 from public.admin_users where user_id=auth.uid())) with check(exists(select 1 from public.admin_users where user_id=auth.uid()));

insert into storage.buckets(id,name,public) values('proofs','proofs',true) on conflict(id) do update set public=true;
drop policy if exists proof_upload on storage.objects;
create policy proof_upload on storage.objects for insert to authenticated with check(bucket_id='proofs' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists proof_read on storage.objects;
create policy proof_read on storage.objects for select to authenticated using(bucket_id='proofs' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.admin_users where user_id=auth.uid())));
