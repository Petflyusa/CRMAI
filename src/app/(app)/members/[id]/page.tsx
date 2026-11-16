import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMember, deleteSubscription, updateMember } from "@/app/actions/members";
import { ConfirmForm } from "@/components/form-bits";
import { EditMemberForm } from "@/components/member-form";
import { Money, Notice, PageHeader, Profit, StatusPill } from "@/components/ui";
import { getMember, listServices, listStores, listSubscriptions, selectableServices, selectableStores } from "@/lib/data";
import { formatDate, memberStatus } from "@/lib/dates";

export const metadata: Metadata = { title: "会员详情" };

export default async function MemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ renewed?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [member, subs, services, stores] = await Promise.all([
    getMember(id),
    listSubscriptions({ memberId: id }),
    listServices(),
    listStores(),
  ]);
  if (!member) notFound();

  const current = subs.find((s) => s.id === member.subscription_id) ?? null;
  const status = memberStatus(member.end_date);

  return (
    <>
      <PageHeader
        title={member.email}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusPill status={status} endDate={member.end_date} />
            <span>
              共 {member.subscription_count} 次付款 · 累计实付{" "}
              <Money value={Number(member.total_paid_usd)} currency="USD" /> · 累计利润{" "}
              <Profit value={Number(member.total_profit_usd)} currency="USD" />
            </span>
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
            <Link href={`/members/${member.id}/renew`} className="btn btn-primary">
              续费
            </Link>
          </>
        }
      />

      {sp.renewed && <Notice>续费成功，新的到期日为 {formatDate(member.end_date)}</Notice>}

      <EditMemberForm
        action={updateMember}
        member={member}
        subscriptionId={current?.id ?? null}
        services={selectableServices(services, current?.service_id)}
        stores={selectableStores(stores, current?.store_id)}
        rates={current?.fx_snapshot.rates ?? { USD: 1, CAD: 1, CNY: 1 }}
        rateDate={current?.fx_snapshot.date ?? ""}
        defaults={
          current
            ? {
                service_id: current.service_id ?? "",
                store_id: current.store_id ?? "",
                start_date: current.start_date,
                end_date: current.end_date,
                paid_at: current.paid_at,
                paid_amount: String(current.paid_amount),
                paid_currency: current.paid_currency,
                cost_usd: String(current.cost_usd),
                sub_notes: current.notes ?? "",
              }
            : null
        }
      />

      <section className="mt-10">
        <h2 className="mb-3 text-[15px] font-semibold">付款记录</h2>
        <div className="panel overflow-x-auto">
          <table className="table min-w-[860px]">
            <thead>
              <tr>
                <th>支付日期</th>
                <th>类型</th>
                <th>服务</th>
                <th>门店</th>
                <th>有效期</th>
                <th className="text-right">实付</th>
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
                  <td className="text-ink-2">{s.store_name ?? "—"}</td>
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
    </>
  );
}
