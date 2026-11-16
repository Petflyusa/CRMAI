/** 日期统一用 YYYY-MM-DD 字符串处理，按 UTC 计算，避免时区偏移 */

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function lastMonths(n: number, from = today()): string[] {
  const [y, m] = from.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return date.replaceAll("-", "/");
}

export type MemberStatus = "active" | "expiring" | "expired" | "none";

export const EXPIRING_DAYS = 30;

export function memberStatus(endDate: string | null | undefined, ref = today()): MemberStatus {
  if (!endDate) return "none";
  const left = daysBetween(ref, endDate);
  if (left < 0) return "expired";
  if (left <= EXPIRING_DAYS) return "expiring";
  return "active";
}
