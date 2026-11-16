import { convert, round2, toUSD, type Currency, type Rates } from "./currency";
import type { Service } from "./types";

export type PriceInput = {
  paidAmount: number;
  paidCurrency: Currency;
  costUsd: number;
  service?: Pick<Service, "price" | "price_currency"> | null;
  rates: Rates;
};

export type PriceResult = {
  paidUsd: number;
  costUsd: number;
  listPriceUsd: number | null;
  profitUsd: number;
  /** 实付与标价的差额（USD），正数表示多收 */
  vsListUsd: number | null;
  marginPct: number | null;
};

/** 统一的利润算法：实付折算 USD − 成本 USD */
export function computePrice({ paidAmount, paidCurrency, costUsd, service, rates }: PriceInput): PriceResult {
  const paidUsd = round2(toUSD(paidAmount, paidCurrency, rates));
  const cost = round2(costUsd);
  const listPriceUsd = service ? round2(toUSD(Number(service.price), service.price_currency, rates)) : null;
  const profitUsd = round2(paidUsd - cost);
  return {
    paidUsd,
    costUsd: cost,
    listPriceUsd,
    profitUsd,
    vsListUsd: listPriceUsd == null ? null : round2(paidUsd - listPriceUsd),
    marginPct: paidUsd > 0 ? profitUsd / paidUsd : null,
  };
}

export function serviceCostUsd(service: Pick<Service, "cost" | "cost_currency">, rates: Rates) {
  return round2(toUSD(Number(service.cost), service.cost_currency, rates));
}

export function servicePriceIn(
  service: Pick<Service, "price" | "price_currency">,
  currency: Currency,
  rates: Rates,
) {
  return round2(convert(Number(service.price), service.price_currency, currency, rates));
}
