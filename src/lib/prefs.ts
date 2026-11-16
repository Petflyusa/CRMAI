import "server-only";
import { cookies } from "next/headers";
import { isCurrency, type Currency } from "./currency";

/** 全站展示币种（统计数字按此币种显示），默认 USD */
export async function getDisplayCurrency(): Promise<Currency> {
  const v = (await cookies()).get("display_currency")?.value;
  return isCurrency(v) ? v : "USD";
}
