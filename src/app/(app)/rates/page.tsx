import type { Metadata } from "next";
import { CurrencySwitch } from "@/components/currency-switch";
import { Converter, RefreshRates } from "@/components/rate-tools";
import { Notice, PageHeader } from "@/components/ui";
import { CURRENCIES, convert, formatRate, type Rates } from "@/lib/currency";
import { getRates } from "@/lib/fx";
import { getDisplayCurrency } from "@/lib/prefs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "汇率" };

const TTL = Number(process.env.FX_TTL_HOURS ?? 12);

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", { timeZone: "America/Toronto", hour12: false });
}

export default async function RatesPage() {
  const [fx, display] = await Promise.all([getRates(), getDisplayCurrency()]);
  const supabase = await createClient();
  const { data: history } = await supabase
    .from("exchange_rates")
    .select("id, rates, rate_date, source, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(20);

  return (
    <>
      <PageHeader
        title="汇率"
        description={`基准货币 USD · 每 ${TTL} 小时自动抓取一次，录入付款时保存当时的汇率快照`}
        actions={<RefreshRates />}
      />

      {fx.stale && <Notice tone="warn">最近一次抓取失败，目前使用 {fx.date} 的汇率。</Notice>}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div className="panel overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>1 单位 →</th>
                  {CURRENCIES.map((c) => (
                    <th key={c} className="text-right">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CURRENCIES.map((from) => (
                  <tr key={from}>
                    <td className="num font-medium">{from}</td>
                    {CURRENCIES.map((to) => (
                      <td key={to} className={`num text-right ${from === to ? "text-ink-3" : ""}`}>
                        {from === to ? "1.0000" : formatRate(convert(1, from, to, fx.rates))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-line px-4 py-3 text-[12px] text-ink-3">
              数据来源 {fx.source} · 汇率日期 {fx.date} · 抓取于 {fmtTime(fx.fetchedAt)}
            </p>
          </div>

          <div className="panel overflow-x-auto">
            <div className="px-4 pt-4 pb-1">
              <h2 className="text-[15px] font-semibold">抓取记录</h2>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>抓取时间</th>
                  <th>汇率日期</th>
                  <th className="text-right">USD→CAD</th>
                  <th className="text-right">USD→CNY</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                {(history ?? []).map((h: { id: number; rates: Rates; rate_date: string; source: string; fetched_at: string }) => (
                  <tr key={h.id}>
                    <td className="num text-ink-2">{fmtTime(h.fetched_at)}</td>
                    <td className="num">{h.rate_date}</td>
                    <td className="num text-right">{formatRate(Number(h.rates.CAD))}</td>
                    <td className="num text-right">{formatRate(Number(h.rates.CNY))}</td>
                    <td className="text-[12px] text-ink-3">{h.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-5">
          <Converter rates={fx.rates} />
          <div className="panel p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold">展示币种</h2>
            <p className="mt-1 mb-4 text-[12px] text-ink-3">概览、门店、会员列表里的统计金额按这个币种显示</p>
            <CurrencySwitch value={display} />
          </div>
        </div>
      </div>
    </>
  );
}
