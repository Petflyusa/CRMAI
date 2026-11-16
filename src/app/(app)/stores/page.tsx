import type { Metadata } from "next";
import Link from "next/link";
import { deleteStore, saveStore } from "@/app/actions/catalog";
import { FormDialog } from "@/components/dialog";
import { ConfirmForm } from "@/components/form-bits";
import { Empty, Money, PageHeader, Profit } from "@/components/ui";
import { convert } from "@/lib/currency";
import { listStores, listSubscriptions } from "@/lib/data";
import { monthKey, today } from "@/lib/dates";
import { storeAbbr } from "@/lib/display";
import { getRates } from "@/lib/fx";
import { getDisplayCurrency } from "@/lib/prefs";
import type { Store } from "@/lib/types";

export const metadata: Metadata = { title: "门店" };

function StoreFields({ store }: { store?: Store }) {
  return (
    <>
      {store && <input type="hidden" name="id" value={store.id} />}
      <label className="block">
        <span className="field-label">门店名称</span>
        <input name="name" required className="input" defaultValue={store?.name} />
      </label>
      <p className="-mt-2 text-[12px] text-ink-3">
        缩写按名称首字母自动生成（如 Global Pet Service → GPS），会员列表里显示缩写，鼠标悬停可看全名
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">地址</span>
          <input name="address" className="input" defaultValue={store?.address ?? ""} />
        </label>
        <label className="block">
          <span className="field-label">电话</span>
          <input name="phone" className="input" defaultValue={store?.phone ?? ""} />
        </label>
      </div>
      <label className="block">
        <span className="field-label">备注</span>
        <textarea name="notes" className="input" defaultValue={store?.notes ?? ""} />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={store?.active ?? true}
          className="size-4 accent-[var(--color-accent)]"
        />
        营业中（停用后新增会员时不可选）
      </label>
    </>
  );
}

export default async function StoresPage() {
  const [stores, subs, fx, display] = await Promise.all([
    listStores(),
    listSubscriptions(),
    getRates(),
    getDisplayCurrency(),
  ]);
  const thisMonth = monthKey(today());
  const show = (usd: number) => convert(usd, "USD", display, fx.rates);

  const stats = new Map<string, { members: Set<string>; month: number; total: number; profit: number }>();
  for (const s of subs) {
    if (!s.store_id) continue;
    const st = stats.get(s.store_id) ?? { members: new Set(), month: 0, total: 0, profit: 0 };
    st.members.add(s.member_id);
    st.total += s.paid_usd;
    st.profit += s.profit_usd;
    if (monthKey(s.paid_at) === thisMonth) st.month += s.paid_usd;
    stats.set(s.store_id, st);
  }

  return (
    <>
      <PageHeader
        title="门店"
        description={`会员可在不同门店充值，收入按付款所在门店统计 · 金额以 ${display} 展示`}
        actions={
          <FormDialog title="新增门店" trigger="新增门店" action={saveStore} submitLabel="保存门店">
            <StoreFields />
          </FormDialog>
        }
      />

      <div className="panel overflow-x-auto">
        {stores.length === 0 ? (
          <Empty title="还没有门店" hint="添加门店后，录入会员时可以选择充值门店" />
        ) : (
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>门店</th>
                <th>联系方式</th>
                <th className="text-right">会员数</th>
                <th className="text-right">本月收入</th>
                <th className="text-right">累计收入</th>
                <th className="text-right">累计利润</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => {
                const st = stats.get(store.id);
                return (
                  <tr key={store.id}>
                    <td>
                      {storeAbbr(store.name) !== store.name && (
                        <span className="num mr-2 rounded bg-sunken px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
                          {storeAbbr(store.name)}
                        </span>
                      )}
                      <Link href={`/members?store=${store.id}`} className="font-medium hover:underline">
                        {store.name}
                      </Link>
                      {!store.active && (
                        <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-3">已停用</span>
                      )}
                      {store.address && <div className="text-[12px] text-ink-3">{store.address}</div>}
                    </td>
                    <td className="text-ink-2">{store.phone ?? "—"}</td>
                    <td className="num text-right">{st?.members.size ?? 0}</td>
                    <td className="text-right">
                      <Money value={show(st?.month ?? 0)} currency={display} />
                    </td>
                    <td className="text-right">
                      <Money value={show(st?.total ?? 0)} currency={display} />
                    </td>
                    <td className="text-right">
                      <Profit value={show(st?.profit ?? 0)} currency={display} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <FormDialog
                          title="编辑门店"
                          trigger="编辑"
                          triggerClass="btn btn-ghost btn-sm"
                          action={saveStore}
                        >
                          <StoreFields store={store} />
                        </FormDialog>
                        <ConfirmForm
                          action={deleteStore}
                          fields={{ id: store.id }}
                          message={`确定删除门店「${store.name}」？已有付款记录会保留，但不再关联门店。也可以改为停用。`}
                        >
                          删除
                        </ConfirmForm>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
