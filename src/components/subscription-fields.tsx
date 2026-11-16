"use client";

import { useMemo, useState } from "react";
import { CURRENCIES, CURRENCY_META, formatMoney, formatRate, type Currency, type Rates } from "@/lib/currency";
import { addDays } from "@/lib/dates";
import { computePrice, serviceCostUsd, servicePriceIn } from "@/lib/pricing";
import type { Service, Store } from "@/lib/types";

export type SubscriptionDefaults = {
  service_id: string;
  store_id: string;
  start_date: string;
  end_date: string;
  paid_at: string;
  paid_amount: string;
  paid_currency: Currency;
  cost_usd: string;
  sub_notes: string;
};

export function SubscriptionFields({
  services,
  stores,
  rates,
  rateDate,
  defaults,
  autoEnd = true,
}: {
  services: Service[];
  stores: Store[];
  rates: Rates;
  rateDate: string;
  defaults: SubscriptionDefaults;
  /** 新建/续费时根据服务时长自动推算到期日 */
  autoEnd?: boolean;
}) {
  const [serviceId, setServiceId] = useState(defaults.service_id);
  const [start, setStart] = useState(defaults.start_date);
  const [end, setEnd] = useState(defaults.end_date);
  const [endTouched, setEndTouched] = useState(!autoEnd);
  const [paid, setPaid] = useState(defaults.paid_amount);
  const [cur, setCur] = useState<Currency>(defaults.paid_currency);
  const [cost, setCost] = useState(defaults.cost_usd);

  const service = services.find((s) => s.id === serviceId) ?? null;

  function onService(id: string) {
    setServiceId(id);
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setCost(String(serviceCostUsd(s, rates)));
    if (!endTouched && start) setEnd(addDays(start, s.duration_days));
  }

  function onStart(v: string) {
    setStart(v);
    if (!endTouched && service && v) setEnd(addDays(v, service.duration_days));
  }

  const listInCur = service ? servicePriceIn(service, cur, rates) : null;

  /** 换币种时：如果金额还是标价，就换算成新币种的标价；手填的金额保持不动 */
  function onCurrency(next: Currency) {
    if (service && listInCur != null && Number(paid) === listInCur) {
      setPaid(String(servicePriceIn(service, next, rates)));
    }
    setCur(next);
  }

  const result = useMemo(() => {
    const p = Number(paid);
    if (paid === "" || !Number.isFinite(p)) return null;
    return computePrice({
      paidAmount: p,
      paidCurrency: cur,
      costUsd: Number(cost) || 0,
      service,
      rates,
    });
  }, [paid, cur, cost, service, rates]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="service_id">
            服务
          </label>
          <select
            id="service_id"
            name="service_id"
            className="input"
            value={serviceId}
            onChange={(e) => onService(e.target.value)}
            required
          >
            <option value="">选择服务</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatMoney(s.price, s.price_currency)} / {s.duration_days}天
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="store_id">
            充值门店
          </label>
          <select id="store_id" name="store_id" className="input" defaultValue={defaults.store_id}>
            <option value="">未指定</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="start_date">
            开始日期
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            className="input num"
            value={start}
            onChange={(e) => onStart(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="field-label" htmlFor="end_date">
            到期日期
            {service && !endTouched && <span className="ml-1.5 font-normal text-ink-3">按服务时长自动计算</span>}
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            className="input num"
            value={end}
            min={start || undefined}
            onChange={(e) => {
              setEnd(e.target.value);
              setEndTouched(true);
            }}
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="paid_amount">
            实付金额
          </label>
          <div className="flex">
            <select
              aria-label="实付币种"
              name="paid_currency"
              className="input num w-[92px] shrink-0 rounded-r-none border-r-0"
              value={cur}
              onChange={(e) => onCurrency(e.target.value as Currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              id="paid_amount"
              name="paid_amount"
              inputMode="decimal"
              className="input num rounded-l-none"
              value={paid}
              onChange={(e) => setPaid(e.target.value)}
              placeholder={listInCur != null ? String(listInCur) : "0.00"}
              required
            />
          </div>
          {listInCur != null && (
            <button
              type="button"
              className="mt-1.5 text-[12px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
              onClick={() => setPaid(String(listInCur))}
            >
              按标价填入 {formatMoney(listInCur, cur)}
            </button>
          )}
        </div>
        <div>
          <label className="field-label" htmlFor="paid_at">
            支付日期
          </label>
          <input
            id="paid_at"
            name="paid_at"
            type="date"
            className="input num"
            defaultValue={defaults.paid_at}
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="cost_usd">
            成本（USD）
          </label>
          <input
            id="cost_usd"
            name="cost_usd"
            inputMode="decimal"
            className="input num"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0.00"
          />
          <p className="mt-1.5 text-[12px] text-ink-3">默认取服务成本，可按实际情况修改</p>
        </div>
        <div>
          <label className="field-label" htmlFor="sub_notes">
            本次备注
          </label>
          <input id="sub_notes" name="sub_notes" className="input" defaultValue={defaults.sub_notes} />
        </div>
      </div>

      <ProfitPreview result={result} paid={paid} cur={cur} rates={rates} rateDate={rateDate} />
    </div>
  );
}

function ProfitPreview({
  result,
  paid,
  cur,
  rates,
  rateDate,
}: {
  result: ReturnType<typeof computePrice> | null;
  paid: string;
  cur: Currency;
  rates: Rates;
  rateDate: string;
}) {
  const rows: [string, React.ReactNode][] = result
    ? [
        [
          `实付（${CURRENCY_META[cur].label}）`,
          formatMoney(Number(paid), cur),
        ],
        ["折合美元", formatMoney(result.paidUsd, "USD")],
        ["服务标价", result.listPriceUsd == null ? "—" : formatMoney(result.listPriceUsd, "USD")],
        [
          "与标价差额",
          result.vsListUsd == null ? (
            "—"
          ) : (
            <span className={result.vsListUsd < 0 ? "text-loss" : "text-ink"}>
              {formatMoney(result.vsListUsd, "USD", { sign: true })}
            </span>
          ),
        ],
        ["成本", formatMoney(-result.costUsd, "USD")],
      ]
    : [];

  return (
    <aside className="h-fit rounded-lg bg-sunken p-5 lg:sticky lg:top-6">
      <p className="text-[11px] font-medium tracking-wide text-ink-3 uppercase">利润计算 · 美元口径</p>
      {result ? (
        <>
          <dl className="mt-4 space-y-2.5 text-[13px]">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-2">{k}</dt>
                <dd className="num">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex items-baseline justify-between border-t border-line-strong pt-4">
            <span className="text-[13px] font-medium">利润</span>
            <span className={`num text-[22px] font-semibold ${result.profitUsd < 0 ? "text-loss" : "text-gain"}`}>
              {formatMoney(result.profitUsd, "USD", { sign: true })}
            </span>
          </div>
          {result.marginPct != null && (
            <p className="mt-1 text-right text-[12px] text-ink-3">
              利润率 <span className="num">{(result.marginPct * 100).toFixed(1)}%</span>
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-[13px] text-ink-3">填写实付金额后显示</p>
      )}
      <p className="num mt-5 text-[11px] leading-relaxed text-ink-3">
        1 USD = {formatRate(rates.CAD)} CAD
        <br />1 USD = {formatRate(rates.CNY)} CNY
        <br />
        汇率日期 {rateDate}
      </p>
    </aside>
  );
}
