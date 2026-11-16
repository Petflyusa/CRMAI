import "server-only";
import Link from "next/link";
import { createMember, renewMember, updateMember } from "@/app/actions/members";
import {
  getMember,
  listServices,
  listStores,
  listSubscriptions,
  selectableServices,
  selectableStores,
} from "@/lib/data";
import { addDays, formatDate, today } from "@/lib/dates";
import { emailUser } from "@/lib/display";
import { getRates } from "@/lib/fx";
import { serviceCostUsd } from "@/lib/pricing";
import { EditMemberForm, NewMemberForm, RenewForm } from "./member-form";
import { RouteDialog } from "./route-dialog";
import { Notice } from "./ui";

/** 去掉 new / renew 参数，得到关闭弹窗后要回到的地址 */
export function closeHrefOf(path: string, sp: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && !["new", "renew", "edit", "created", "renewed", "saved"].includes(k)) p.set(k, v);
  }
  const s = p.toString();
  return s ? `${path}?${s}` : path;
}

export async function NewMemberDialog({ closeHref }: { closeHref: string }) {
  const [services, stores, fx] = await Promise.all([
    listServices({ activeOnly: true }),
    listStores({ activeOnly: true }),
    getRates(),
  ]);
  const d = today();
  return (
    <RouteDialog title="新增会员" description="录入会员信息、服务、有效期和实付金额" closeHref={closeHref} wide>
      {services.length === 0 && (
        <Notice tone="warn">
          还没有可选的服务。请先到{" "}
          <Link href="/services" className="underline">
            服务管理
          </Link>{" "}
          添加。
        </Notice>
      )}
      <NewMemberForm
        action={createMember}
        services={services}
        stores={stores}
        rates={fx.rates}
        rateDate={fx.date}
        closeHref={closeHref}
        defaults={{
          service_id: "",
          store_id: stores.length === 1 ? stores[0].id : "",
          start_date: d,
          end_date: d,
          paid_at: d,
          paid_amount: "",
          paid_currency: "USD",
          cost_usd: "",
          sub_notes: "",
        }}
      />
    </RouteDialog>
  );
}

export async function EditMemberDialog({ memberId, closeHref }: { memberId: string; closeHref: string }) {
  const [member, subs, services, stores] = await Promise.all([
    getMember(memberId),
    listSubscriptions({ memberId }),
    listServices(),
    listStores(),
  ]);
  if (!member) return null;
  const current = subs.find((s) => s.id === member.subscription_id) ?? null;
  const defaults = current
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
    : null;

  return (
    <RouteDialog
      title={`编辑 · ${emailUser(member.email)}`}
      description="修改会员信息和当前这一期订阅"
      closeHref={closeHref}
      wide
    >
      <EditMemberForm
        action={updateMember}
        member={member}
        subscriptionId={current?.id ?? null}
        subscriptionKind={current?.kind ?? null}
        services={selectableServices(services, current?.service_id)}
        stores={selectableStores(stores, current?.store_id)}
        rates={current?.fx_snapshot.rates ?? { USD: 1, CAD: 1, CNY: 1 }}
        rateDate={current?.fx_snapshot.date ?? ""}
        defaults={defaults}
        closeHref={closeHref}
      />
    </RouteDialog>
  );
}

export async function RenewDialog({ memberId, closeHref }: { memberId: string; closeHref: string }) {
  const [member, services, stores, fx] = await Promise.all([
    getMember(memberId),
    listServices(),
    listStores(),
    getRates(),
  ]);
  if (!member) return null;

  const d = today();
  // 未过期：接在原到期日后一天；已过期：从今天开始
  const start = member.end_date && member.end_date >= d ? addDays(member.end_date, 1) : d;
  const service = services.find((s) => s.id === member.service_id && s.active) ?? null;

  return (
    <RouteDialog
      title={`续费 · ${emailUser(member.email)}`}
      description={`当前服务 ${member.service_name ?? "—"}，到期 ${formatDate(member.end_date)} · 新一期默认接在到期日之后`}
      closeHref={closeHref}
      wide
    >
      <RenewForm
        action={renewMember}
        memberId={member.id}
        services={selectableServices(services)}
        stores={selectableStores(stores, member.store_id)}
        rates={fx.rates}
        rateDate={fx.date}
        closeHref={closeHref}
        defaults={{
          service_id: service?.id ?? "",
          store_id: member.store_id ?? "",
          start_date: start,
          end_date: service ? addDays(start, service.duration_days) : start,
          paid_at: d,
          paid_amount: "",
          paid_currency: member.paid_currency ?? "USD",
          cost_usd: service ? String(serviceCostUsd(service, fx.rates)) : "",
          sub_notes: "",
        }}
      />
    </RouteDialog>
  );
}
