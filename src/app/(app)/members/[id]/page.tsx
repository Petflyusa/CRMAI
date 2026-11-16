import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMember, deleteSubscription } from "@/app/actions/members";
import { ConfirmForm } from "@/components/form-bits";
import { EditMemberDialog, RenewDialog } from "@/components/member-dialogs";
import { SecretReveal } from "@/components/secret";
import { DaysLeft, Money, Notice, PageHeader, Profit } from "@/components/ui";
import { getMember, listSubscriptions } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { emailUser, storeAbbr } from "@/lib/display";

export const metadata: Metadata = { title: "会员详情" };

function Info({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-4" : undefined}>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-1 text-[14px] break-words">{children}</dd>
    </div>
  );
}

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ renewed?: string; saved?: string; renew?: string; edit?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [member, subs] = await Promise.all([getMember(id), listSubscriptions({ memberId: id })]);
  if (!member) notFound();

  const here = `/members/${member.id}`;
  const dash = <span className="text-ink-3">—</span>;

  return (
    <>
      <PageHeader
        title={emailUser(member.email)}
        description={
          <span>
            {member.subscription_count - member.renewal_count} 次新开 · {member.renewal_count} 次续费 · 累计实付{" "}
            <Money value={Number(member.total_paid_usd)} currency="USD" /> · 累计利润{" "}
            <Profit value={Number(member.total_profit_usd)} currency="USD" />
          </span>
        }
        actions={
          <>
            <ConfirmForm
              action={deleteMember}
              fields={{ id: member.id, redirect: "list" }}
              message={`确定删除会员 ${member.email}？其所有充值记录也会一并删除，无法恢复。`}
              className="btn btn-danger"
            >
              删除会员
            </ConfirmForm>
            <Link href={`${here}?edit=1`} scroll={false} className="btn btn-secondary">
              编辑
            </Link>
            <Link href={`${here}?renew=1`} scroll={false} className="btn btn-primary">
              续费
            </Link>
          </>
        }
      />

      {sp.renewed && <Notice>续费成功，新的到期日为 {formatDate(member.end_date)}</Notice>}
      {sp.saved && <Notice>修改已保存</Notice>}

      <section className="panel p-5 sm:p-6">
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="剩余天数">
            <DaysLeft endDate={member.end_date} className="text-[18px]" />
          </Info>
          <Info label="当前服务">{member.service_name ?? dash}</Info>
          <Info label="门店">
            <span title={member.store_name ?? undefined}>{storeAbbr(member.store_name) ?? dash}</span>
          </Info>
          <Info label="到期日">
            <span className="num">{formatDate(member.end_date)}</span>
          </Info>
          <Info label="邮箱">{member.email}</Info>
          <Info label="姓名">{member.name ?? dash}</Info>
          <Info label="电话">{member.phone ?? dash}</Info>
          <Info label="IM 联系方式">{member.im ?? dash}</Info>
          <Info label="初始密码">
            <SecretReveal value={member.initial_password} />
          </Info>
          <Info label="备注" wide>
            {member.notes ?? dash}
          </Info>
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-semibold">付款记录</h2>
        <div className="panel overflow-x-auto">
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>支付日期</th>
                <th>类型</th>
                <th>服务</th>
                <th>门店</th>
                <th>有效期</th>
                <th className="text-right">金额</th>
                <th className="text-right">折合 USD</th>
                <th className="text-right">利润 USD</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="num">{formatDate(s.paid_at)}</td>
                  <td className="text-ink-2">{s.kind === "renewal" ? "续费" : "新开"}</td>
                  <td className="text-ink-2">{s.service_name ?? "—"}</td>
                  <td className="text-ink-2" title={s.store_name ?? undefined}>
                    {storeAbbr(s.store_name) ?? "—"}
                  </td>
                  <td className="num text-ink-2">
                    {formatDate(s.start_date)} – {formatDate(s.end_date)}
                  </td>
                  <td className="text-right">
                    <Money value={s.paid_amount} currency={s.paid_currency} />
                  </td>
                  <td className="text-right">
                    <Money value={s.paid_usd} currency="USD" />
                    <div className="num text-[11px] text-ink-3" title={s.fx_snapshot.source}>
                      汇率 {s.fx_snapshot.date}
                    </div>
                  </td>
                  <td className="text-right">
                    <Profit value={s.profit_usd} currency="USD" />
                  </td>
                  <td>
                    {subs.length > 1 && (
                      <ConfirmForm
                        action={deleteSubscription}
                        fields={{ id: s.id }}
                        message="确定删除这条付款记录？"
                      >
                        删除
                      </ConfirmForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {sp.renew && <RenewDialog memberId={member.id} closeHref={here} />}
      {sp.edit && <EditMemberDialog memberId={member.id} closeHref={here} />}
    </>
  );
}
