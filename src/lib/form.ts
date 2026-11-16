import { isCurrency, type Currency } from "./currency";

export class FormError extends Error {}

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function reqStr(fd: FormData, key: string, label: string): string {
  const v = str(fd, key);
  if (!v) throw new FormError(`请填写${label}`);
  return v;
}

export function num(fd: FormData, key: string, label: string, opts: { min?: number; required?: boolean } = {}) {
  const raw = str(fd, key);
  if (raw == null) {
    if (opts.required === false) return null;
    throw new FormError(`请填写${label}`);
  }
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n)) throw new FormError(`${label}不是有效数字`);
  if (opts.min != null && n < opts.min) throw new FormError(`${label}不能小于 ${opts.min}`);
  return n;
}

export function currency(fd: FormData, key: string): Currency {
  const v = str(fd, key);
  if (!isCurrency(v)) throw new FormError("请选择币种");
  return v;
}

export function date(fd: FormData, key: string, label: string): string {
  const v = reqStr(fd, key, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new FormError(`${label}格式不正确`);
  return v;
}

export function email(fd: FormData, key = "email"): string {
  const v = reqStr(fd, key, "邮箱").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new FormError("邮箱格式不正确");
  return v;
}

export function bool(fd: FormData, key: string) {
  return fd.get(key) === "on" || fd.get(key) === "true";
}

export function errorMessage(e: unknown): string {
  if (e instanceof FormError) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "操作失败，请重试";
}
