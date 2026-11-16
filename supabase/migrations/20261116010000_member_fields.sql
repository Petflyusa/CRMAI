-- 会员 IM 联系方式、初始密码；门店缩写；会员总览加入首付与续费信息

alter table public.members add column if not exists im text;
alter table public.members add column if not exists initial_password text;
alter table public.stores  add column if not exists code text;

drop view if exists public.member_overview;
create view public.member_overview
with (security_invoker = true) as
select
  m.id,
  m.email,
  m.name,
  m.phone,
  m.notes,
  m.im,
  m.initial_password,
  m.created_at,
  l.id              as subscription_id,
  l.kind            as subscription_kind,
  l.service_id,
  sv.name           as service_name,
  l.store_id,
  st.name           as store_name,
  st.code           as store_code,
  l.start_date,
  l.end_date,
  l.paid_at,
  l.paid_amount,
  l.paid_currency,
  l.paid_usd,
  l.cost_usd,
  l.profit_usd,
  f.paid_amount     as first_paid_amount,
  f.paid_currency   as first_paid_currency,
  f.paid_usd        as first_paid_usd,
  r.paid_amount     as renewal_amount,
  r.paid_currency   as renewal_currency,
  r.paid_usd        as renewal_usd,
  r.paid_at         as renewed_at,
  coalesce(t.subscription_count, 0) as subscription_count,
  coalesce(t.renewal_count, 0)      as renewal_count,
  coalesce(t.total_paid_usd, 0)     as total_paid_usd,
  coalesce(t.total_profit_usd, 0)   as total_profit_usd
from public.members m
left join lateral (
  select s.* from public.subscriptions s
  where s.member_id = m.id
  order by s.end_date desc, s.created_at desc
  limit 1
) l on true
left join lateral (
  select s.* from public.subscriptions s
  where s.member_id = m.id and s.kind = 'new'
  order by s.paid_at asc, s.created_at asc
  limit 1
) f on true
left join lateral (
  select s.* from public.subscriptions s
  where s.member_id = m.id and s.kind = 'renewal'
  order by s.paid_at desc, s.created_at desc
  limit 1
) r on true
left join public.services sv on sv.id = l.service_id
left join public.stores   st on st.id = l.store_id
left join lateral (
  select count(*) as subscription_count,
         count(*) filter (where s.kind = 'renewal') as renewal_count,
         sum(s.paid_usd) as total_paid_usd,
         sum(s.profit_usd) as total_profit_usd
  from public.subscriptions s
  where s.member_id = m.id
) t on true;

revoke all on public.member_overview from anon;
grant select on public.member_overview to authenticated;
