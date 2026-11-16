"use client";

import { useActionState, useState } from "react";
import { refreshRatesAction } from "@/app/actions/system";
import { CURRENCIES, CURRENCY_META, convert, formatMoney, type Currency, type Rates } from "@/lib/currency";
import { FormMessage, SubmitButton } from "./form-bits";

export function RefreshRates() {
  const [state, action] = useActionState(refreshRatesAction, undefined);
  return (
    <form action={action} className="flex items-center gap-3">
      <FormMessage state={state} />
      <SubmitButton className="btn btn-secondary" pendingText="抓取中…">
        立即更新汇率
      </SubmitButton>
    </form>
  );
}

export function Converter({ rates }: { rates: Rates }) {
  const [amount, setAmount] = useState("1000");
  const [from, setFrom] = useState<Currency>("CNY");
  const n = Number(amount);
  const valid = amount !== "" && Number.isFinite(n);

  return (
    <div className="panel p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold">换算器</h2>
      <div className="mt-4 flex">
        <select
          aria-label="原币种"
          className="input num w-[92px] shrink-0 rounded-r-none border-r-0"
          value={from}
          onChange={(e) => setFrom(e.target.value as Currency)}
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          aria-label="金额"
          inputMode="decimal"
          className="input num rounded-l-none text-[16px]"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <dl className="mt-5 divide-y divide-line">
        {CURRENCIES.filter((c) => c !== from).map((c) => (
          <div key={c} className="flex items-baseline justify-between py-3">
            <dt className="text-[13px] text-ink-2">{CURRENCY_META[c].label}</dt>
            <dd className="num text-[20px] font-medium">{valid ? formatMoney(convert(n, from, c, rates), c) : "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
