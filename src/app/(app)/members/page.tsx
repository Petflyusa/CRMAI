import type { Metadata } from "next";
import Link from "next/link";
import { deleteMember } from "@/app/actions/members";
import { ConfirmForm } from "@/components/form-bits";
import { Empty, Money, Notice, PageHeader, Profit, StatusPill } from "@/components/ui";
import { convert } from "@/lib/currency";
import { listMembers, listStores } from "@/lib/data";
import { formatDate, memberStatus, type MemberStatus } from "@/lib/dates";
import { getRates } from "@/lib/fx";
import { getDisplayCurrency } from "@/lib/prefs";

export const metadata: Metadata = { title: "会员" };

const STATUS_FILTERS: { value: "" | MemberStatus; label: string }[] = [
  { value: "", label: "全部" },
  { value: "active", label: "有效" },
  { value: "expiring", label: "即将到期" },
  { value: "expired", label: "已过期" },
];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; store?: string; status?: string; created?: string }>;
}) {
  const sp = await searchParams;
  const [members, stores, fx, display] = await Promise.all([
    listMembers(),
    listStores(),
    getRates(),
    getDisplayCurrency(),
  ]);

  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = members
    .map((m) => ({ ...m, status: memberStatus(m.end_date) }))
    .filter((m) => !q || m.email.toLowerCase().includes(q) || (m.name ?? "").toLowerCase().includes(q))
    .filter((m) => !sp.store || m.store_id === sp.store)
    .filter((m) => !sp.status || m.status === sp.status);

  const shown = (usd: number | null) => (usd == null ? null : convert(Number(usd), "USD", display, fx.rates));
  const statusHref = (status: string) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (sp.store) p.set("store", sp.store);
    if (status) p.set("status", status);
    const s = p.toString();
    return s ? `/members?${s}` : "/members";
  };

  return (
    <>
      <PageHeader
        title="会员"
        description={`共 ${members.length} 位会员 · 金额按 ${display} 展示，利润为美元口径折算`}
        actions={
          <Link href="/members/new" className="btn btn-primary">
            新增会员
          </Link>
        }
      />

      {sp.created && <Notice>会员已创建</Notice>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex flex-wrap items-center gap-2" action="/members">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="搜索邮箱或姓名"
            className="input w-[220px]"
            aria-label="搜索"
          />
          <select name="store" defaultValue={sp.store ?? ""} className="input w-[160px]" aria-label="门店">
            <option value="">全部门店</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <button className="btn btn-secondary">筛选</button>
        </form>
        <div className="flex gap-1 sm:ml-auto">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={statusHref(f.value)}
              className={`rounded-md px-2.5 py-1.5 text-[13px] ${
                (sp.status ?? "") === f.value ? "bg-ink text-surface" : "text-ink-2 hover:bg-sunken"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="panel overflow-x-auto">
        {rows.length === 0 ? (
          <Empty
            title={members.length === 0 ? "还没有会员" : "没有符合条件的会员"}
            hint={members.length === 0 ? "先在「服务」里添加服务，再录入第一位会员" : undefined}
            action={
              members.length === 0 ? (
                <Link href="/members/new" className="btn btn-primary">
                  新增会员
                </Link>
              ) : undefined
            }
          />
        ) : (
          <table className="table min-w-[980px]">
            <thead>
              <tr>
                <th>会员</th>
                <th>服务</th>
                <th>门店</th>
                <th>开始</th>
                <th>到期</th>
                <th className="text-right">实付</th>
                <th className="text-right">利润</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link href={`/members/${m.id}`} className="block font-medium hover:underline">
                      {m.email}
                    </Link>
                    {m.name && <span className="text-[12px] text-ink-3">{m.name}</span>}
                  </td>
                  <td className="text-ink-2">{m.service_name ?? "—"}</td>
                  <td className="text-ink-2">{m.store_name ?? "—"}</td>
                  <td className="num text-ink-2">{formatDate(m.start_date)}</td>
                  <td>
                    <div className="num">{formatDate(m.end_date)}</div>
                    <StatusPill status={m.status} endDate={m.end_date} />
                  </td>
                  <td className="text-right">
                    {m.paid_currency ? (
                      <>
                        <Money value={Number(m.paid_amount)} currency={m.paid_currency} />
                        {m.paid_currency !== display && (
                          <div className="num text-[12px] text-ink-3">
                            ≈ <Money value={shown(m.paid_usd)} currency={display} />
                          </div>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="text-right">
                    <Profit value={shown(m.profit_usd)} currency={display} />
                    {m.subscription_count > 1 && (
                      <div className="text-[12px] text-ink-3">
                        累计 <Money value={shown(m.total_profit_usd)} currency={display} />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/members/${m.id}`} className="btn btn-ghost btn-sm">
                        编辑
                      </Link>
                      <Link href={`/members/${m.id}/renew`} className="btn btn-secondary btn-sm">
                        续费
                      </Link>
                      <ConfirmForm
                        action={deleteMember}
                        fields={{ id: m.id }}
                        message={`确定删除会员 ${m.email}？其所有充值记录也会一并删除，无法恢复。`}
                      >
                        删除
                      </ConfirmForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
