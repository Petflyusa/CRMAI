import type { Metadata } from "next";
import Link from "next/link";
import { deleteMember } from "@/app/actions/members";
import { ActionMenu, type MenuItem } from "@/components/action-menu";
import { closeHrefOf, NewMemberDialog, RenewDialog } from "@/components/member-dialogs";
import { SecretReveal } from "@/components/secret";
import { Empty, Money, Notice, PageHeader, Profit, StatusPill } from "@/components/ui";
import { convert, type Currency } from "@/lib/currency";
import { listMembers, listStores } from "@/lib/data";
import { formatDate, memberStatus, type MemberStatus } from "@/lib/dates";
import { emailUser, storeAbbr } from "@/lib/display";
import { getRates } from "@/lib/fx";
import { getDisplayCurrency } from "@/lib/prefs";
import type { MemberOverview } from "@/lib/types";

export const metadata: Metadata = { title: "会员" };

const STATUS_FILTERS: { value: "" | MemberStatus; label: string }[] = [
  { value: "", label: "全部" },
  { value: "active", label: "有效" },
  { value: "expiring", label: "即将到期" },
  { value: "expired", label: "已过期" },
];

type SP = { q?: string; store?: string; status?: string; created?: string; renewed?: string; new?: string; renew?: string };

function withParam(base: string, key: string, value: string) {
  return `${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [members, stores, fx, display] = await Promise.all([
    listMembers(),
    listStores(),
    getRates(),
    getDisplayCurrency(),
  ]);

  const here = closeHrefOf("/members", sp);
  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = members
    .map((m) => ({ ...m, status: memberStatus(m.end_date) }))
    .filter(
      (m) =>
        !q ||
        m.email.toLowerCase().includes(q) ||
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.im ?? "").toLowerCase().includes(q),
    )
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

  const menu = (m: MemberOverview): MenuItem[] => [
    { kind: "link", label: "续费", href: withParam(here, "renew", m.id) },
    { kind: "link", label: "编辑", href: `/members/${m.id}` },
    {
      kind: "delete",
      label: "删除",
      action: deleteMember,
      fields: { id: m.id },
      confirm: `确定删除会员 ${m.email}？其所有充值记录也会一并删除，无法恢复。`,
    },
  ];

  const amount = (value: number | null, cur: Currency | null, usd: number | null) =>
    cur && value != null ? (
      <>
        <Money value={Number(value)} currency={cur} />
        {cur !== display && (
          <div className="num text-[12px] text-ink-3">
            ≈ <Money value={shown(usd)} currency={display} />
          </div>
        )}
      </>
    ) : (
      <span className="text-ink-3">—</span>
    );

  const renewedMember = sp.renewed ? members.find((m) => m.id === sp.renewed) : null;

  return (
    <>
      <PageHeader
        title="会员"
        description={`共 ${members.length} 位会员 · 金额按 ${display} 展示，利润为美元口径折算`}
        actions={
          <Link href={withParam(here, "new", "1")} scroll={false} className="btn btn-primary">
            新增会员
          </Link>
        }
      />

      {sp.created && <Notice>会员已创建</Notice>}
      {renewedMember && (
        <Notice>
          {emailUser(renewedMember.email)} 续费成功，新的到期日为 {formatDate(renewedMember.end_date)}
        </Notice>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form className="flex flex-wrap items-center gap-2" action="/members">
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="搜索邮箱、姓名或 IM"
            className="input w-[220px]"
            aria-label="搜索"
          />
          <select name="store" defaultValue={sp.store ?? ""} className="input w-[160px]" aria-label="门店">
            <option value="">全部门店</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code ? `${s.code} · ${s.name}` : s.name}
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
                <Link href={withParam(here, "new", "1")} scroll={false} className="btn btn-primary">
                  新增会员
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* 手机：卡片列表 */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((m) => (
                <li key={m.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/members/${m.id}`} className="block truncate font-medium hover:underline">
                        {emailUser(m.email)}
                      </Link>
                      <p className="text-[12px] text-ink-3">
                        {[m.name, m.im, m.service_name, storeAbbr(m.store_name, m.store_code)]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <StatusPill status={m.status} endDate={m.end_date} />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                    <div>
                      <dt className="text-ink-3">到期</dt>
                      <dd className="num">{formatDate(m.end_date)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-3">首付</dt>
                      <dd>
                        {m.first_paid_currency ? (
                          <Money value={Number(m.first_paid_amount)} currency={m.first_paid_currency} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-3">续费</dt>
                      <dd>
                        {m.renewal_currency ? (
                          <Money value={Number(m.renewal_amount)} currency={m.renewal_currency} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="text-[12px]">
                      <span className="mr-1 text-ink-3">密码</span>
                      <SecretReveal value={m.initial_password} />
                    </div>
                    <ActionMenu items={menu(m)} />
                  </div>
                </li>
              ))}
            </ul>
            {/* 平板和电脑：表格 */}
            <table className="data-table hidden min-w-[920px] md:table">
              <thead>
                <tr>
                  <th>会员</th>
                  <th>初始密码</th>
                  <th>服务</th>
                  <th>门店</th>
                  <th>有效期</th>
                  <th className="text-right">首付</th>
                  <th className="text-right">续费</th>
                  <th className="text-right">累计利润</th>
                  <th className="w-px" />
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link
                        href={`/members/${m.id}`}
                        className="block font-medium hover:underline"
                        title={m.email}
                      >
                        {emailUser(m.email)}
                      </Link>
                      {(m.name || m.im) && (
                        <span className="text-[12px] text-ink-3">{[m.name, m.im].filter(Boolean).join(" · ")}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <SecretReveal value={m.initial_password} />
                    </td>
                    <td className="whitespace-nowrap text-ink-2">{m.service_name ?? "—"}</td>
                    <td className="whitespace-nowrap text-ink-2" title={m.store_name ?? undefined}>
                      {storeAbbr(m.store_name, m.store_code) ?? "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="num text-[13px]">
                        <span className="text-ink-3">{formatDate(m.start_date)} – </span>
                        {formatDate(m.end_date)}
                      </div>
                      <StatusPill status={m.status} endDate={m.end_date} />
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {amount(m.first_paid_amount, m.first_paid_currency, m.first_paid_usd)}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      {amount(m.renewal_amount, m.renewal_currency, m.renewal_usd)}
                      {m.renewed_at && (
                        <div className="num text-[12px] text-ink-3">
                          {formatDate(m.renewed_at)}
                          {m.renewal_count > 1 && ` · 共 ${m.renewal_count} 次`}
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <Profit value={shown(m.total_profit_usd)} currency={display} />
                    </td>
                    <td>
                      <div className="flex justify-end">
                        <ActionMenu items={menu(m)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {sp.new && <NewMemberDialog closeHref={here} />}
      {sp.renew && <RenewDialog key={sp.renew} memberId={sp.renew} closeHref={here} />}
    </>
  );
}
