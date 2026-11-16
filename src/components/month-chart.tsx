import { formatMoney, type Currency } from "@/lib/currency";

type Point = { month: string; revenue: number; profit: number };

/** 近 12 个月收入 / 利润柱状图（服务端渲染的 SVG） */
export function MonthChart({ data, currency }: { data: Point[]; currency: Currency }) {
  const W = 720;
  const H = 220;
  const padL = 8;
  const padB = 24;
  const top = 12;
  const max = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.profit)));
  const min = Math.min(0, ...data.map((d) => d.profit));
  const span = max - min;
  const y = (v: number) => top + ((max - v) / span) * (H - padB - top);
  const slot = (W - padL) / data.length;
  const bw = Math.min(18, slot * 0.28);
  const zero = y(0);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="近 12 个月收入与利润">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={0}
            x2={W}
            y1={y(min + span * t)}
            y2={y(min + span * t)}
            stroke="var(--color-line)"
            strokeDasharray="2 4"
          />
        ))}
        <line x1={0} x2={W} y1={zero} y2={zero} stroke="var(--color-line-strong)" />
        {data.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          const label = `${d.month}  收入 ${formatMoney(d.revenue, currency)}  利润 ${formatMoney(d.profit, currency)}`;
          return (
            <g key={d.month}>
              <title>{label}</title>
              <rect x={cx - slot / 2} y={0} width={slot} height={H} fill="transparent" />
              <rect
                x={cx - bw - 1}
                y={Math.min(y(d.revenue), zero)}
                width={bw}
                height={Math.max(1, Math.abs(zero - y(d.revenue)))}
                rx={2}
                fill="var(--color-line-strong)"
              />
              <rect
                x={cx + 1}
                y={Math.min(y(d.profit), zero)}
                width={bw}
                height={Math.max(1, Math.abs(zero - y(d.profit)))}
                rx={2}
                fill={d.profit < 0 ? "var(--color-loss)" : "var(--color-accent)"}
              />
              <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize={11}
                fill="var(--color-ink-3)"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {Number(d.month.slice(5))}月
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex gap-4 text-[12px] text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-sm bg-line-strong" /> 收入
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block size-2.5 rounded-sm bg-accent" /> 利润
        </span>
      </figcaption>
    </figure>
  );
}
