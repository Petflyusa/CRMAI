-- 新增稳定币 USDC / USDT（汇率按市价抓取，1 USD = rates[x]）
alter type public.currency_code add value if not exists 'USDC';
alter type public.currency_code add value if not exists 'USDT';
