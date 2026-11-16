-- CRMAI 会员管理系统 · 初始结构
-- 基准货币为 USD。所有金额在写入时按当时汇率折算成 USD 并保存快照，
-- 之后汇率变化不会改动历史利润。

create extension if not exists pgcrypto;

do $$ begin
  create type public.currency_code as enum ('USD', 'CAD', 'CNY');
exception when duplicate_object then null; end $$;

-- 门店 ---------------------------------------------------------------
create table if not exists public.stores (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  phone       text,
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- 服务 ---------------------------------------------------------------
create table if not exists public.services (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  price           numeric(12,2) not null check (price >= 0),
  price_currency  public.currency_code not null default 'USD',
  cost            numeric(12,2) not null default 0 check (cost >= 0),
  cost_currency   public.currency_code not null default 'USD',
  duration_days   integer not null default 365 check (duration_days > 0),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- 会员 ---------------------------------------------------------------
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  name        text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now()
);
create unique index if not exists members_email_key on public.members (lower(email));

-- 会员订阅 / 充值记录（新开与续费都是一条记录）-----------------------
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  member_id          uuid not null references public.members(id) on delete cascade,
  service_id         uuid references public.services(id) on delete set null,
  store_id           uuid references public.stores(id) on delete set null,
  kind               text not null default 'new' check (kind in ('new', 'renewal')),
  start_date         date not null,
  end_date           date not null,
  paid_at            date not null default current_date,
  paid_amount        numeric(12,2) not null check (paid_amount >= 0),
  paid_currency      public.currency_code not null,
  -- 以下为 USD 快照
  paid_usd           numeric(12,2) not null,
  cost_usd           numeric(12,2) not null default 0,
  list_price_usd     numeric(12,2),
  profit_usd         numeric(12,2) generated always as (paid_usd - cost_usd) stored,
  fx_snapshot        jsonb not null,
  notes              text,
  created_at         timestamptz not null default now(),
  constraint subscriptions_dates_check check (end_date >= start_date)
);
create index if not exists subscriptions_member_idx on public.subscriptions (member_id, end_date desc);
create index if not exists subscriptions_store_idx  on public.subscriptions (store_id);
create index if not exists subscriptions_paid_idx   on public.subscriptions (paid_at);

-- 汇率缓存（1 USD = rates[x]）----------------------------------------
create table if not exists public.exchange_rates (
  id          bigint generated always as identity primary key,
  rates       jsonb not null,
  rate_date   date not null,
  source      text not null,
  fetched_at  timestamptz not null default now()
);
create index if not exists exchange_rates_fetched_idx on public.exchange_rates (fetched_at desc);

-- 会员总览：每位会员最新一条订阅 + 累计金额 ---------------------------
create or replace view public.member_overview
with (security_invoker = true) as
select
  m.id,
  m.email,
  m.name,
  m.phone,
  m.notes,
  m.created_at,
  l.id              as subscription_id,
  l.service_id,
  sv.name           as service_name,
  l.store_id,
  st.name           as store_name,
  l.start_date,
  l.end_date,
  l.paid_at,
  l.paid_amount,
  l.paid_currency,
  l.paid_usd,
  l.cost_usd,
  l.profit_usd,
  coalesce(t.subscription_count, 0) as subscription_count,
  coalesce(t.total_paid_usd, 0)     as total_paid_usd,
  coalesce(t.total_profit_usd, 0)   as total_profit_usd
from public.members m
left join lateral (
  select s.* from public.subscriptions s
  where s.member_id = m.id
  order by s.end_date desc, s.created_at desc
  limit 1
) l on true
left join public.services sv on sv.id = l.service_id
left join public.stores   st on st.id = l.store_id
left join lateral (
  select count(*) as subscription_count,
         sum(s.paid_usd) as total_paid_usd,
         sum(s.profit_usd) as total_profit_usd
  from public.subscriptions s
  where s.member_id = m.id
) t on true;

-- 行级安全：只有登录的管理员可以读写 ---------------------------------
alter table public.stores         enable row level security;
alter table public.services       enable row level security;
alter table public.members        enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.exchange_rates enable row level security;

do $$
declare t text;
begin
  foreach t in array array['stores','services','members','subscriptions','exchange_rates'] loop
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format(
      'create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

revoke all on public.member_overview from anon;
grant select on public.member_overview to authenticated;
