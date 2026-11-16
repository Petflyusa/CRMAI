import type { Metadata } from "next";
import Link from "next/link";
import { deleteMember } from "@/app/actions/members";
import { ActionMenu, type MenuItem } from "@/components/action-menu";
import { closeHrefOf, EditMemberDialog, NewMemberDialog, RenewDialog } from "@/components/member-dialogs";
import { SecretReveal } from "@/components/secret";
import { DaysLeft, Empty, Money, Notice, PageHeader, Profit } from "@/components/ui";
import { convert, type Currency } from "@/lib/currency";
import { listMembers, listStores } from "@/lib/data";
import { daysBetween, formatDate, memberStatus, today, type MemberStatus } from "@/lib/dates";
import { emailUser, storeAbbr, storeLabel } from "@/lib/display";
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

type SortKey = "member" | "days" | "first" | "renewal" | "profit";
const SORT_KEYS: SortKey[] = ["member", "days", "first", "renewal", "profit"];
/** 第一次点击时的方向：天数从少到多，金额从高到低 */
const FIRST_DIR: Record<SortKey, "asc" | "desc"> = {
  member: "asc",
  days: "asc",
  first: "desc",
  renewal: "desc",
  profit: "desc",
};
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "默认排序（最新录入）" },
  { value: "days:asc", label: "剩余天数 少 → 多" },
  { value: "days:desc", label: "剩余天数 多 → 少" },
  { value: "profit:desc", label: "累计利润 高 → 低" },
  { value: "first:desc", label: "首付 高 → 低" },
  { value: "renewal:desc", label: "续费 高 → 低" },
  { value: "member:asc", label: "会员 A → Z" },
];

type SP = {
  q?: string;
  store?: string;
  status?: string;
  sort?: string;
  dir?: string;
  created?: string;
  renewed?: string;
  saved?: string;
  new?: string;
  renew?: string;
  edit?: string;
};

function withParam(base: string, key: string, value: string) {
  return `${base}${base.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // 手机端排序下拉提交的是 sort=days:asc 这种组合值
  if (sp.sort?.includes(":")) {
    const [k, d] = sp.sort.split(":");
    sp.sort = k;
    sp.dir = d;
  }
  const [members, stores, fx, display] = await Promise.all([
    listMembers(),
    listStores(),
    getRates(),
    getDisplayCurrency(),
  ]);

  const here = closeHrefOf("/members", sp);
  const d = today();
  const sortKey = SORT_KEYS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : null;
  const dir = sp.dir === "desc" ? "desc" : sp.dir === "asc" ? "asc" : sortKey ? FIRST_DIR[sortKey] : "asc";

  const q = (sp.q ?? "").trim().toLowerCase();
  const rows = members
    .map((m) => ({
      ...m,
      status: memberStatus(m.end_date, d),
      daysLeft: m.end_date ? daysBetween(d, m.end_date) : null,
    }))
    .filter(
      (m) =>
        !q ||
        m.email.toLowerCase().includes(q) ||
        (m.name ?? "").toLowerCase().includes(q) ||
        (m.im ?? "").toLowerCase().includes(q),
    )
    .filter((m) => !sp.store || m.store_id === sp.store)
    .filter((m) => !sp.status || m.status === sp.status);

  if (sortKey) {
    const value = (m: (typeof rows)[number]): number | string | null => {
      switch (sortKey) {
        case "member":
          return m.email.toLowerCase();
        case "days":
          return m.daysLeft;
        case "first":
          return m.first_paid_usd == null ? null : Number(m.first_paid_usd);
        case "renewal":
          return m.renewal_usd == null ? null : Number(m.renewal_usd);
        case "profit":
          return Number(m.total_profit_usd ?? 0);
      }
    };
    const sign = dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      // 没有数据的排在最后
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va < vb ? -1 : va > vb ? 1 : 0) * sign;
    });
  }

  const shown = (usd: number | null) => (usd == null ? null : convert(Number(usd), "USD", display, fx.rates));

  const listHref = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, store: sp.store, status: sp.status, sort: sortKey ?? undefined, dir: sortKey ? dir : undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/members?${s}` : "/members";
  };

  const sortHref = (key: SortKey) => {
    if (sortKey !== key) return listHref({ sort: key, dir: FIRST_DIR[key] });
    // 再点一次反向；第三次取消排序
    if (dir === FIRST_DIR[key]) return listHref({ sort: key, dir: dir === "asc" ? "desc" : "asc" });
    return listHref({ sort: undefined, dir: undefined });
  };

  const SortTh = ({ k, children, right }: { k: SortKey; children: React.ReactNode; right?: boolean }) => {
    const active = sortKey === k;
    return (
      <th className={right ? "text-right" : undefined} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
        <Link
          href={sortHref(k)}
          scroll={false}
          className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-ink ${active ? "text-ink" : ""}`}
        >
          {children}
          <span className={`text-[10px] ${active ? "" : "opacity-30"}`}>{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
        </Link>
      </th>
    );
  };

  const menu = (m: MemberOverview): MenuItem[] => [
    { kind: "link", label: "续费", href: withParam(here, "renew", m.id) },
    { kind: "link", label: "编辑", href: withParam(here, "edit", m.id) },
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
  const savedMember = sp.saved ? members.find((m) => m.id === sp.saved) : null;

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
      {savedMember && <Notice>{emailUser(savedMember.email)} 的修改已保存</Notice>}

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
                {storeLabel(s.name)}
              </option>
            ))}
          </select>
          {/* 手机上没有表头，用下拉排序；电脑上隐藏但仍随表单提交，保留当前排序 */}
          <select
            name="sort"
            defaultValue={sortKey ? `${sortKey}:${dir}` : ""}
            className="input w-[200px] md:hidden"
            aria-label="排序"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
              href={listHref({ status: f.value || undefined })}
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
                        {[m.name, m.im, m.service_name, storeAbbr(m.store_name)]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <DaysLeft endDate={m.end_date} className="text-[13px]" />
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
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
                    <div>
                      <dt className="text-ink-3">累计利润</dt>
                      <dd>
                        <Profit value={shown(m.total_profit_usd)} currency={display} />
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
            <table className="data-table hidden min-w-[880px] md:table">
              <thead>
                <tr>
                  <SortTh k="member">会员</SortTh>
                  <th>初始密码</th>
                  <th>服务</th>
                  <th>门店</th>
                  <SortTh k="days">剩余天数</SortTh>
                  <SortTh k="first" right>
                    首付
                  </SortTh>
                  <SortTh k="renewal" right>
                    续费
                  </SortTh>
                  <SortTh k="profit" right>
                    累计利润
                  </SortTh>
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
                      {storeAbbr(m.store_name) ?? "—"}
                    </td>
                    <td>
                      <DaysLeft endDate={m.end_date} />
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
      {sp.renew && <RenewDialog key={`r${sp.renew}`} memberId={sp.renew} closeHref={here} />}
      {sp.edit && <EditMemberDialog key={`e${sp.edit}`} memberId={sp.edit} closeHref={here} />}
    </>
  );
}
