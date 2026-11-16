import type { Metadata } from "next";
import { deleteService, saveService } from "@/app/actions/catalog";
import { FormDialog } from "@/components/dialog";
import { ConfirmForm } from "@/components/form-bits";
import { Empty, Money, PageHeader, Profit } from "@/components/ui";
import { CURRENCIES, convert, type Currency } from "@/lib/currency";
import { listServices } from "@/lib/data";
import { getRates } from "@/lib/fx";
import { getDisplayCurrency } from "@/lib/prefs";
import { serviceCostUsd } from "@/lib/pricing";
import type { Service } from "@/lib/types";

export const metadata: Metadata = { title: "服务" };

function MoneyInput({
  name,
  currencyName,
  label,
  amount,
  currency,
  required,
}: {
  name: string;
  currencyName: string;
  label: string;
  amount?: number;
  currency?: Currency;
  required?: boolean;
}) {
  return (
    <div role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <div className="flex">
        <select
          name={currencyName}
          aria-label={`${label}币种`}
          defaultValue={currency ?? "USD"}
          className="input num w-[92px] shrink-0 rounded-r-none border-r-0"
        >
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          name={name}
          aria-label={`${label}金额`}
          inputMode="decimal"
          required={required}
          defaultValue={amount ?? ""}
          placeholder="0.00"
          className="input num rounded-l-none"
        />
      </div>
    </div>
  );
}

function ServiceFields({ service }: { service?: Service }) {
  return (
    <>
      {service && <input type="hidden" name="id" value={service.id} />}
      <label className="block">
        <span className="field-label">服务名称</span>
        <input name="name" required className="input" defaultValue={service?.name} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyInput
          name="price"
          currencyName="price_currency"
          label="标价"
          amount={service?.price}
          currency={service?.price_currency}
          required
        />
        <MoneyInput
          name="cost"
          currencyName="cost_currency"
          label="成本"
          amount={service?.cost}
          currency={service?.cost_currency}
        />
      </div>
      <label className="block">
        <span className="field-label">有效期（天）</span>
        <input
          name="duration_days"
          type="number"
          min={1}
          required
          className="input num"
          defaultValue={service?.duration_days ?? 365}
        />
        <span className="mt-1.5 block text-[12px] text-ink-3">录入会员时按此天数自动计算到期日，例如月卡 30、年卡 365</span>
      </label>
      <label className="block">
        <span className="field-label">说明</span>
        <textarea name="description" className="input" defaultValue={service?.description ?? ""} />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-ink-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={service?.active ?? true}
          className="size-4 accent-[var(--color-accent)]"
        />
        在售（停用后新增会员时不可选）
      </label>
    </>
  );
}

export default async function ServicesPage() {
  const [services, fx, display] = await Promise.all([listServices(), getRates(), getDisplayCurrency()]);
  const toDisplay = (amount: number, from: Currency) => convert(amount, from, display, fx.rates);

  return (
    <>
      <PageHeader
        title="服务"
        description={`价格和成本可用任意币种录入，系统按实时汇率折算 · 折算列以 ${display} 展示`}
        actions={
          <FormDialog title="新增服务" trigger="新增服务" action={saveService} submitLabel="保存服务">
            <ServiceFields />
          </FormDialog>
        }
      />

      <div className="panel overflow-x-auto">
        {services.length === 0 ? (
          <Empty title="还没有服务" hint="添加服务和价格后，就可以录入会员了" />
        ) : (
          <table className="data-table min-w-[860px]">
            <thead>
              <tr>
                <th>服务</th>
                <th className="text-right">有效期</th>
                <th className="text-right">标价</th>
                <th className="text-right">成本</th>
                <th className="text-right">标价毛利（{display}）</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {services.map((s) => {
                const priceD = toDisplay(s.price, s.price_currency);
                const costD = toDisplay(s.cost, s.cost_currency);
                return (
                  <tr key={s.id}>
                    <td>
                      <span className="font-medium">{s.name}</span>
                      {!s.active && (
                        <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-[11px] text-ink-3">已停用</span>
                      )}
                      {s.description && <div className="text-[12px] text-ink-3">{s.description}</div>}
                    </td>
                    <td className="num text-right text-ink-2">{s.duration_days} 天</td>
                    <td className="text-right">
                      <Money value={s.price} currency={s.price_currency} />
                      {s.price_currency !== display && (
                        <div className="text-[12px] text-ink-3">
                          ≈ <Money value={priceD} currency={display} />
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <Money value={s.cost} currency={s.cost_currency} />
                      {s.cost_currency !== "USD" && (
                        <div className="text-[12px] text-ink-3">
                          ≈ <Money value={serviceCostUsd(s, fx.rates)} currency="USD" />
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <Profit value={priceD - costD} currency={display} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <FormDialog
                          title="编辑服务"
                          trigger="编辑"
                          triggerClass="btn btn-ghost btn-sm"
                          action={saveService}
                        >
                          <ServiceFields service={s} />
                        </FormDialog>
                        <ConfirmForm
                          action={deleteService}
                          fields={{ id: s.id }}
                          message={`确定删除服务「${s.name}」？已有付款记录会保留金额，但不再关联服务。也可以改为停用。`}
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
