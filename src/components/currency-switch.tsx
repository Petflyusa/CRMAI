import { setDisplayCurrency } from "@/app/actions/system";
import { CURRENCIES, type Currency } from "@/lib/currency";

export function CurrencySwitch({ value }: { value: Currency }) {
  return (
    <form action={setDisplayCurrency} className="grid w-full max-w-[300px] grid-cols-5 rounded-md border border-line-strong bg-paper p-0.5">
      {CURRENCIES.map((c) => (
        <button
          key={c}
          name="currency"
          value={c}
          aria-pressed={c === value}
          className={`num rounded px-1 py-1 text-[11px] transition-colors ${
            c === value ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-line)]" : "text-ink-3 hover:text-ink"
          }`}
        >
          {c}
        </button>
      ))}
    </form>
  );
}
