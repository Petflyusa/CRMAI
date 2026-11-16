import type { Metadata } from "next";
import Link from "next/link";
import { createMember } from "@/app/actions/members";
import { NewMemberForm } from "@/components/member-form";
import { Notice, PageHeader } from "@/components/ui";
import { listServices, listStores } from "@/lib/data";
import { today } from "@/lib/dates";
import { getRates } from "@/lib/fx";

export const metadata: Metadata = { title: "新增会员" };

export default async function NewMemberPage() {
  const [services, stores, fx] = await Promise.all([
    listServices({ activeOnly: true }),
    listStores({ activeOnly: true }),
    getRates(),
  ]);
  const d = today();

  return (
    <>
      <PageHeader title="新增会员" description="录入会员邮箱、服务、有效期和实付金额" />
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
    </>
  );
}
