import "server-only";
import { cache } from "react";
import type { FxSnapshot, Rates } from "./currency";
import { createClient } from "./supabase/server";

/** 汇率缓存时长（小时）。过期后下次访问时自动抓取，不需要定时任务。 */
const TTL_HOURS = Number(process.env.FX_TTL_HOURS ?? 12);

export type FxState = FxSnapshot & {
  fetchedAt: string;
  /** 抓取失败、正在使用旧数据 */
  stale: boolean;
};

type Fetched = { rates: Rates; date: string; source: string };

function valid(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

async function fetchFrankfurter(): Promise<Fetched> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=CAD,CNY", {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`frankfurter ${res.status}`);
  const j = await res.json();
  if (!valid(j?.rates?.CAD) || !valid(j?.rates?.CNY)) throw new Error("frankfurter: bad payload");
  return { rates: { USD: 1, CAD: j.rates.CAD, CNY: j.rates.CNY }, date: j.date, source: "Frankfurter / 欧洲央行" };
}

async function fetchOpenER(): Promise<Fetched> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`open.er-api ${res.status}`);
  const j = await res.json();
  if (j?.result !== "success" || !valid(j?.rates?.CAD) || !valid(j?.rates?.CNY)) {
    throw new Error("open.er-api: bad payload");
  }
  const date = new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10);
  return { rates: { USD: 1, CAD: j.rates.CAD, CNY: j.rates.CNY }, date, source: "ExchangeRate-API" };
}

async function fetchLatest(): Promise<Fetched> {
  const errors: string[] = [];
  for (const provider of [fetchFrankfurter, fetchOpenER]) {
    try {
      return await provider();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(`汇率抓取失败：${errors.join("; ")}`);
}

type Row = { rates: Rates; rate_date: string; source: string; fetched_at: string };

function fromRow(row: Row, stale: boolean): FxState {
  return {
    base: "USD",
    rates: { USD: 1, CAD: Number(row.rates.CAD), CNY: Number(row.rates.CNY) },
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
    const f = await fetchLatest();
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
