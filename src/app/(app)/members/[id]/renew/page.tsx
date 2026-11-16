import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renewMember } from "@/app/actions/members";
import { RenewForm } from "@/components/member-form";
import { PageHeader } from "@/components/ui";
import { getMember, listServices, listStores, selectableServices, selectableStores } from "@/lib/data";
import { addDays, formatDate, today } from "@/lib/dates";
import { getRates } from "@/lib/fx";
import { serviceCostUsd, servicePriceIn } from "@/lib/pricing";

export const metadata: Metadata = { title: "续费" };

export default async function RenewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [member, services, stores, fx] = await Promise.all([getMember(id), listServices(), listStores(), getRates()]);
  if (!member) notFound();

  const d = today();
  // 未过期：接在原到期日后一天；已过期：从今天开始
  const start = member.end_date && member.end_date >= d ? addDays(member.end_date, 1) : d;
  const service = services.find((s) => s.id === member.service_id && s.active) ?? null;
  const currency = member.paid_currency ?? "USD";

  return (
    <>
      <PageHeader
        title={`续费 · ${member.email}`}
        description={`当前服务：${member.service_name ?? "—"}，到期 ${formatDate(member.end_date)}`}
      />
      <RenewForm
        action={renewMember}
        memberId={member.id}
        services={selectableServices(services)}
        stores={selectableStores(stores, member.store_id)}
        rates={fx.rates}
        rateDate={fx.date}
        defaults={{
          service_id: service?.id ?? "",
          store_id: member.store_id ?? "",
          start_date: start,
          end_date: service ? addDays(start, service.duration_days) : start,
          paid_at: d,
          paid_amount: service ? String(servicePriceIn(service, currency, fx.rates)) : "",
          paid_currency: currency,
          cost_usd: service ? String(serviceCostUsd(service, fx.rates)) : "",
          sub_notes: "",
        }}
      />
    </>
  );
}
