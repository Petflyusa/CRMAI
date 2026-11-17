import { round2, toUSD, type Currency, type Rates } from "./currency";
import type { Service } from "./types";

export type PriceInput = {
  paidAmount: number;
  paidCurrency: Currency;
  costUsd: number;
  rates: Rates;
};

export type PriceResult = {
  paidUsd: number;
  costUsd: number;
  profitUsd: number;
  marginPct: number | null;
};

/** 统一的利润算法：实付折算 USD − 成本 USD */
export function computePrice({ paidAmount, paidCurrency, costUsd, rates }: PriceInput): PriceResult {
  const paidUsd = round2(toUSD(paidAmount, paidCurrency, rates));
  const cost = round2(costUsd);
  const profitUsd = round2(paidUsd - cost);
  return {
    paidUsd,
    costUsd: cost,
    profitUsd,
    marginPct: paidUsd > 0 ? profitUsd / paidUsd : null,
  };
}

export function serviceCostUsd(service: Pick<Service, "cost" | "cost_currency">, rates: Rates) {
  return round2(toUSD(Number(service.cost), service.cost_currency, rates));
}
