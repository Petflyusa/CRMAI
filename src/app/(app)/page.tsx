import Link from "next/link";
import { MonthChart } from "@/components/month-chart";
import { Empty, Money, PageHeader, Profit, StatusPill } from "@/components/ui";
import { CURRENCIES, CURRENCY_META, convert, formatMoney, type Currency } from "@/lib/currency";
import { listMembers, listStores, listSubscriptions } from "@/lib/data";
import { daysBetween, formatDate, lastMonths, memberStatus, monthKey, today } from "@/lib/dates";
import { getRates } from "@/lib/fx";
import { getDisplayCurrency } from "@/lib/prefs";

function pctChange(now: number, prev: number) {
  if (prev === 0) return null;
  return (now - prev) / Math.abs(prev);
}

function Delta({ value }: { value: number | null }) {
  if (value == null) return <span className="text-ink-3">上月无数据</span>;
  const up = value >= 0;
  return (
    <span className={up ? "text-gain" : "text-loss"}>
      较上月 <span className="num">{up ? "+" : "−"}{Math.abs(value * 100).toFixed(1)}%</span>
    </span>
  );
}

function Kpi({ label, children, foot }: { label: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="panel px-5 py-4">
      <p className="text-[12px] text-ink-3">{label}</p>
      <div className="num mt-2 text-[26px] leading-none font-semibold tracking-tight">{children}</div>
      {foot && <p className="mt-2.5 text-[12px]">{foot}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const [members, subs, stores, fx, display] = await Promise.all([
    listMembers(),
    listSubscriptions(),
    listStores(),
    getRates(),
    getDisplayCurrency(),
  ]);
  const show = (usd: number) => convert(usd, "USD", display, fx.rates);

  const d = today();
  const months = lastMonths(12, d);
  const thisMonth = months[months.length - 1];
  const prevMonth = months[months.length - 2];

  // 按月汇总（USD）
  const byMonth = new Map(months.map((m) => [m, { revenue: 0, profit: 0, count: 0 }]));
  for (const s of subs) {
    const b = byMonth.get(monthKey(s.paid_at));
    if (!b) continue;
    b.revenue += s.paid_usd;
    b.profit += s.profit_usd;
    b.count += 1;
  }
  const cur = byMonth.get(thisMonth)!;
  const prev = byMonth.get(prevMonth)!;

  const statuses = members.map((m) => ({ ...m, status: memberStatus(m.end_date, d) }));
  const active = statuses.filter((m) => m.status === "active" || m.status === "expiring").length;
  const expiring = statuses
    .filter((m) => m.status === "expiring")
    .sort((a, b) => (a.end_date! < b.end_date! ? -1 : 1));
  const recentlyExpired = statuses
    .filter((m) => m.status === "expired" && daysBetween(m.end_date!, d) <= 30)
    .sort((a, b) => (a.end_date! > b.end_date! ? -1 : 1));

  // 门店：本月 + 累计
  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  const byStore = new Map<string, { month: number; profit: number; total: number }>();
  for (const s of subs) {
    const key = s.store_id ?? "";
    const b = byStore.get(key) ?? { month: 0, profit: 0, total: 0 };
    b.total += s.paid_usd;
    if (monthKey(s.paid_at) === thisMonth) {
      b.month += s.paid_usd;
      b.profit += s.profit_usd;
    }
    byStore.set(key, b);
  }
  const storeRows = [...byStore.entries()]
    .map(([id, v]) => ({ id, name: id ? (storeName.get(id) ?? "已删除门店") : "未指定门店", ...v }))
    .sort((a, b) => b.month - a.month || b.total - a.total);
  const storeMax = Math.max(1, ...storeRows.map((r) => r.month));

  // 收款币种构成（本月，按 USD 折算）
  const mix = new Map<Currency, { usd: number; raw: number }>(CURRENCIES.map((c) => [c, { usd: 0, raw: 0 }]));
  for (const s of subs) {
    if (monthKey(s.paid_at) !== thisMonth) continue;
    const m = mix.get(s.paid_currency)!;
    m.usd += s.paid_usd;
    m.raw += s.paid_amount;
  }
  const mixTotal = [...mix.values()].reduce((a, b) => a + b.usd, 0);

  const chart = months.map((m) => ({ month: m, revenue: show(byMonth.get(m)!.revenue), profit: show(byMonth.get(m)!.profit) }));
  const margin = cur.revenue > 0 ? cur.profit / cur.revenue : null;

  return (
    <>
      <PageHeader
        title="概览"
        description={`${d.slice(0, 4)} 年 ${Number(d.slice(5, 7))} 月 · 金额以 ${CURRENCY_META[display].label}（${display}）展示，按 ${fx.date} 汇率折算`}
        actions={
          <Link href="/members/new" className="btn btn-primary">
            新增会员
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="本月收入" foot={<Delta value={pctChange(cur.revenue, prev.revenue)} />}>
          {formatMoney(show(cur.revenue), display)}
        </Kpi>
        <Kpi
          label="本月利润"
          foot={
            <span className="text-ink-3">
              利润率 <span className="num">{margin == null ? "—" : `${(margin * 100).toFixed(1)}%`}</span>
            </span>
          }
        >
          <span className={cur.profit < 0 ? "text-loss" : ""}>{formatMoney(show(cur.profit), display)}</span>
        </Kpi>
        <Kpi label="有效会员" foot={<span className="text-ink-3">共 {members.length} 位会员</span>}>
          {active}
        </Kpi>
        <Kpi
          label="30 天内到期"
          foot={
            <Link href="/members?status=expiring" className="text-ink-2 underline-offset-2 hover:underline">
              查看名单
            </Link>
          }
        >
          <span className={expiring.length > 0 ? "text-warn" : ""}>{expiring.length}</span>
        </Kpi>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
        <section className="panel p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">近 12 个月收入与利润</h2>
            <span className="num text-[12px] text-ink-3">本月 {cur.count} 笔付款</span>
          </div>
          <MonthChart data={chart} currency={display} />
        </section>

        <section className="panel p-5">
          <h2 className="text-[15px] font-semibold">本月收款币种</h2>
          <p className="mt-0.5 text-[12px] text-ink-3">实际收到的币种，按美元折算比例</p>
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-sunken">
            {CURRENCIES.map((c, i) => {
              const v = mix.get(c)!.usd;
              if (!mixTotal || !v) return null;
              const tones = ["bg-ink", "bg-accent", "bg-line-strong"];
              return <div key={c} className={tones[i]} style={{ width: `${(v / mixTotal) * 100}%` }} />;
            })}
          </div>
          <dl className="mt-4 space-y-3">
            {CURRENCIES.map((c, i) => {
              const m = mix.get(c)!;
              const tones = ["bg-ink", "bg-accent", "bg-line-strong"];
              return (
                <div key={c} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <dt className="flex items-center gap-2 text-ink-2">
                    <i className={`inline-block size-2 rounded-full ${tones[i]}`} />
                    {CURRENCY_META[c].label}
                  </dt>
                  <dd className="text-right">
                    <Money value={m.raw} currency={c} />
                    <span className="num ml-2 text-[12px] text-ink-3">
                      {mixTotal ? `${((m.usd / mixTotal) * 100).toFixed(0)}%` : "0%"}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="panel">
          <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
            <h2 className="text-[15px] font-semibold">门店业绩 · 本月</h2>
            <Link href="/stores" className="text-[12px] text-ink-3 hover:text-ink">
              全部门店
            </Link>
          </div>
          {storeRows.length === 0 ? (
            <Empty title="暂无付款记录" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>门店</th>
                  <th className="text-right">收入</th>
                  <th className="text-right">利润</th>
                </tr>
              </thead>
              <tbody>
                {storeRows.slice(0, 8).map((r) => (
                  <tr key={r.id || "none"}>
                    <td className="w-1/2">
                      <div className="text-[13px]">{r.name}</div>
                      <div className="mt-1.5 h-1 rounded-full bg-sunken">
                        <div className="h-1 rounded-full bg-accent" style={{ width: `${(r.month / storeMax) * 100}%` }} />
                      </div>
                    </td>
                    <td className="text-right">
                      <Money value={show(r.month)} currency={display} />
                    </td>
                    <td className="text-right">
                      <Profit value={show(r.profit)} currency={display} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="flex items-baseline justify-between px-5 pt-5 pb-3">
            <h2 className="text-[15px] font-semibold">待续费</h2>
            <span className="text-[12px] text-ink-3">30 天内到期与近 30 天已过期</span>
          </div>
          {expiring.length + recentlyExpired.length === 0 ? (
            <Empty title="近期没有到期的会员" />
          ) : (
            <table className="table">
              <tbody>
                {[...expiring, ...recentlyExpired].slice(0, 8).map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link href={`/members/${m.id}`} className="text-[13px] font-medium hover:underline">
                        {m.email}
                      </Link>
                      <div className="text-[12px] text-ink-3">
                        {m.service_name ?? "—"} · {m.store_name ?? "未指定门店"}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="num text-[13px]">{formatDate(m.end_date)}</div>
                      <StatusPill status={m.status} endDate={m.end_date} />
                    </td>
                    <td className="w-px">
                      <Link href={`/members/${m.id}/renew`} className="btn btn-secondary btn-sm">
                        续费
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
