import "server-only";
import { cache } from "react";
import { normalizeRates, type FxSnapshot, type Rates } from "./currency";
import { createClient } from "./supabase/server";

/** 汇率缓存时长（小时）。过期后下次访问时自动抓取，不需要定时任务。 */
const TTL_HOURS = Number(process.env.FX_TTL_HOURS ?? 12);

export type FxState = FxSnapshot & {
  fetchedAt: string;
  /** 抓取失败、正在使用旧数据 */
  stale: boolean;
};

type Fetched = { rates: Rates; date: string; source: string };
type Fiat = { CAD: number; CNY: number; date: string; source: string };
type Crypto = { USDC: number; USDT: number; source: string };

function valid(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

async function fetchFrankfurter(): Promise<Fiat> {
  const j = await getJson("https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD,CNY");
  if (!valid(j?.rates?.CAD) || !valid(j?.rates?.CNY)) throw new Error("frankfurter: bad payload");
  return { CAD: j.rates.CAD, CNY: j.rates.CNY, date: j.date, source: "Frankfurter / 欧洲央行" };
}

async function fetchOpenER(): Promise<Fiat> {
  const j = await getJson("https://open.er-api.com/v6/latest/USD");
  if (j?.result !== "success" || !valid(j?.rates?.CAD) || !valid(j?.rates?.CNY)) {
    throw new Error("open.er-api: bad payload");
  }
  const date = new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10);
  return { CAD: j.rates.CAD, CNY: j.rates.CNY, date, source: "ExchangeRate-API" };
}

/** 稳定币市价（美元计价），换算成 1 USD 可兑换的数量 */
async function fetchCoinGecko(): Promise<Crypto> {
  const j = await getJson("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,tether&vs_currencies=usd");
  const usdc = j?.["usd-coin"]?.usd;
  const usdt = j?.tether?.usd;
  if (!valid(usdc) || !valid(usdt)) throw new Error("coingecko: bad payload");
  return { USDC: 1 / usdc, USDT: 1 / usdt, source: "CoinGecko" };
}

async function fetchCoinbase(): Promise<Crypto> {
  const j = await getJson("https://api.coinbase.com/v2/exchange-rates?currency=USD");
  const usdc = Number(j?.data?.rates?.USDC);
  const usdt = Number(j?.data?.rates?.USDT);
  if (!valid(usdc) || !valid(usdt)) throw new Error("coinbase: bad payload");
  return { USDC: usdc, USDT: usdt, source: "Coinbase" };
}

async function firstOk<T>(providers: (() => Promise<T>)[]): Promise<T> {
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await provider();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(`汇率抓取失败：${errors.join("; ")}`);
}

async function fetchLatest(previous: Rates | null): Promise<Fetched> {
  const [fiat, crypto] = await Promise.all([
    firstOk([fetchFrankfurter, fetchOpenER]),
    firstOk([fetchCoinGecko, fetchCoinbase]).catch(() => null),
  ]);
  // 稳定币抓取失败时沿用上一次的数值（没有就按 1:1），不影响法币汇率更新
  const usdc = crypto?.USDC ?? previous?.USDC ?? 1;
  const usdt = crypto?.USDT ?? previous?.USDT ?? 1;
  return {
    rates: { USD: 1, CAD: fiat.CAD, CNY: fiat.CNY, USDC: usdc, USDT: usdt },
    date: fiat.date,
    source: crypto ? `${fiat.source} + ${crypto.source}` : `${fiat.source}（稳定币沿用上次）`,
  };
}

type Row = { rates: Rates; rate_date: string; source: string; fetched_at: string };

function fromRow(row: Row, stale: boolean): FxState {
  return {
    base: "USD",
    rates: normalizeRates(row.rates),
    date: row.rate_date,
    source: row.source,
    fetchedAt: row.fetched_at,
    stale,
  };
}

async function load(force: boolean): Promise<FxState> {
  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("exchange_rates")
    .select("rates, rate_date, source, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle<Row>();

  const age = latest ? Date.now() - new Date(latest.fetched_at).getTime() : Infinity;
  if (latest && !force && age < TTL_HOURS * 3600_000) return fromRow(latest, false);

  try {
    const f = await fetchLatest(latest ? normalizeRates(latest.rates) : null);
    const { data: inserted, error } = await supabase
      .from("exchange_rates")
      .insert({ rates: f.rates, rate_date: f.date, source: f.source })
      .select("rates, rate_date, source, fetched_at")
      .single<Row>();
    if (error || !inserted) {
      return { base: "USD", ...f, fetchedAt: new Date().toISOString(), stale: false };
    }
    return fromRow(inserted, false);
  } catch (e) {
    if (latest) return fromRow(latest, true);
    throw e;
  }
}

/** 当前汇率（同一请求内只查一次） */
export const getRates = cache(() => load(false));

/** 强制重新抓取 */
export function refreshRates() {
  return load(true);
}

export function snapshotOf(fx: FxState): FxSnapshot {
  return { base: "USD", rates: fx.rates, date: fx.date, source: fx.source };
}
