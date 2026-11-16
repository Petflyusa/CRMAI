import { formatMoney, type Currency } from "@/lib/currency";
import { daysBetween, today, type MemberStatus } from "@/lib/dates";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const STATUS: Record<MemberStatus, { label: string; cls: string }> = {
  active: { label: "有效", cls: "bg-gain-soft text-gain" },
  expiring: { label: "即将到期", cls: "bg-warn-soft text-warn" },
  expired: { label: "已过期", cls: "bg-sunken text-ink-3" },
  none: { label: "无订阅", cls: "bg-sunken text-ink-3" },
};

export function StatusPill({ status, endDate }: { status: MemberStatus; endDate?: string | null }) {
  const s = STATUS[status];
  const left = endDate ? daysBetween(today(), endDate) : null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.cls}`}>
      {s.label}
      {status === "expiring" && left != null && <span className="num">· {left}天</span>}
    </span>
  );
}

export function Money({
  value,
  currency,
  sign,
  className = "",
}: {
  value: number | null | undefined;
  currency: Currency;
  sign?: boolean;
  className?: string;
}) {
  return <span className={`num ${className}`}>{formatMoney(value, currency, { sign })}</span>;
}

export function Profit({ value, currency }: { value: number | null | undefined; currency: Currency }) {
  const cls = value == null ? "text-ink-3" : value < 0 ? "text-loss" : value > 0 ? "text-gain" : "text-ink-2";
  return <Money value={value} currency={currency} sign className={cls} />;
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-[14px] font-medium text-ink-2">{title}</p>
      {hint && <p className="mt-1 text-[13px] text-ink-3">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={`mb-5 rounded-md px-3.5 py-2.5 text-[13px] ${
        tone === "warn" ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"
      }`}
    >
      {children}
    </div>
  );
}
