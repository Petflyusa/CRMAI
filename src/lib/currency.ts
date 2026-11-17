export const CURRENCIES = ["USD", "CAD", "CNY", "USDC", "USDT"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const FIAT = ["USD", "CAD", "CNY"] as const;
export const CRYPTO = ["USDC", "USDT"] as const;

/** 1 USD 可兑换的各币种数量 */
export type Rates = Record<Currency, number>;

/**
 * 补齐汇率：早期的汇率快照只有 USD/CAD/CNY，
 * 缺少的稳定币按 1:1 锚定美元处理。
 */
export function normalizeRates(r: Partial<Record<string, unknown>> | null | undefined): Rates {
  const n = (k: Currency, fallback: number) => {
    const v = Number(r?.[k]);
    return Number.isFinite(v) && v > 0 ? v : fallback;
  };
  return { USD: 1, CAD: n("CAD", 1), CNY: n("CNY", 1), USDC: n("USDC", 1), USDT: n("USDT", 1) };
}

export type FxSnapshot = {
  base: "USD";
  rates: Rates;
  date: string;
  source: string;
};

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; suffix?: boolean }> = {
  USD: { symbol: "$", label: "美元" },
  CAD: { symbol: "C$", label: "加元" },
  CNY: { symbol: "¥", label: "人民币" },
  USDC: { symbol: "USDC", label: "USDC", suffix: true },
  USDT: { symbol: "USDT", label: "USDT", suffix: true },
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function convert(amount: number, from: Currency, to: Currency, rates: Rates) {
  if (from === to) return amount;
  return (amount / rates[from]) * rates[to];
}

export function toUSD(amount: number, from: Currency, rates: Rates) {
  return convert(amount, from, "USD", rates);
}

const fmt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCompact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatMoney(
  amount: number | null | undefined,
  currency: Currency,
  opts: { sign?: boolean; compact?: boolean } = {},
) {
  if (amount == null || Number.isNaN(amount)) return "—";
  const abs = Math.abs(amount);
  const body = opts.compact && abs >= 10000 ? fmtCompact.format(abs) : fmt.format(abs);
  const sign = amount < 0 ? "−" : opts.sign && amount > 0 ? "+" : "";
  const meta = CURRENCY_META[currency];
  return meta.suffix ? `${sign}${body} ${meta.symbol}` : `${sign}${meta.symbol}${body}`;
}

export function formatRate(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
