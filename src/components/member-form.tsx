"use client";

import Link from "next/link";
import type { Rates } from "@/lib/currency";
import type { ActionState, Member, Service, Store } from "@/lib/types";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";
import { SubscriptionFields, type SubscriptionDefaults } from "./subscription-fields";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-[12px] text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function MemberFields({ member }: { member?: Partial<Member> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="field-label" htmlFor="email">
          邮箱
        </label>
        <input id="email" name="email" type="email" required className="input" defaultValue={member?.email} />
      </div>
      <div>
        <label className="field-label" htmlFor="name">
          姓名 <span className="font-normal text-ink-3">选填</span>
        </label>
        <input id="name" name="name" className="input" defaultValue={member?.name ?? ""} />
      </div>
      <div>
        <label className="field-label" htmlFor="phone">
          电话 <span className="font-normal text-ink-3">选填</span>
        </label>
        <input id="phone" name="phone" className="input" defaultValue={member?.phone ?? ""} />
      </div>
      <div>
        <label className="field-label" htmlFor="notes">
          会员备注 <span className="font-normal text-ink-3">选填</span>
        </label>
        <input id="notes" name="notes" className="input" defaultValue={member?.notes ?? ""} />
      </div>
    </div>
  );
}

/** 新建会员：会员信息 + 首次订阅 */
export function NewMemberForm(props: {
  action: Action;
  services: Service[];
  stores: Store[];
  rates: Rates;
  rateDate: string;
  defaults: SubscriptionDefaults;
}) {
  const { state, onSubmit, pending } = useActionForm(props.action);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Section title="会员信息">
        <MemberFields />
      </Section>
      <Section title="服务与付款" hint="利润 = 实付折合美元 − 成本，按当前汇率计算并保存快照">
        <SubscriptionFields
          services={props.services}
          stores={props.stores}
          rates={props.rates}
          rateDate={props.rateDate}
          defaults={props.defaults}
        />
      </Section>
      <FormFooter state={state} pending={pending} cancelHref="/members" submit="创建会员" />
    </form>
  );
}

/** 编辑会员：会员信息 + 当前订阅 */
export function EditMemberForm(props: {
  action: Action;
  member: Member;
  subscriptionId: string | null;
  services: Service[];
  stores: Store[];
  rates: Rates;
  rateDate: string;
  defaults: SubscriptionDefaults | null;
}) {
  const { state, onSubmit, pending } = useActionForm(props.action);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="id" value={props.member.id} />
      {props.subscriptionId && <input type="hidden" name="subscription_id" value={props.subscriptionId} />}
      <Section title="会员信息">
        <MemberFields member={props.member} />
      </Section>
      {props.defaults && (
        <Section title="当前订阅" hint="修改金额时默认沿用这笔付款当时的汇率">
          <SubscriptionFields
            services={props.services}
            stores={props.stores}
            rates={props.rates}
            rateDate={props.rateDate}
            defaults={props.defaults}
            autoEnd={false}
          />
          <label className="mt-5 flex items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" name="recalc_fx" className="size-4 accent-[var(--color-accent)]" />
            按最新汇率重新计算这笔付款
          </label>
        </Section>
      )}
      <FormFooter state={state} pending={pending} cancelHref="/members" submit="保存修改" />
    </form>
  );
}

/** 续费：仅订阅部分 */
export function RenewForm(props: {
  action: Action;
  memberId: string;
  services: Service[];
  stores: Store[];
  rates: Rates;
  rateDate: string;
  defaults: SubscriptionDefaults;
}) {
  const { state, onSubmit, pending } = useActionForm(props.action);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="member_id" value={props.memberId} />
      <Section title="续费信息" hint="开始日期默认接在上一期到期日之后，可修改">
        <SubscriptionFields
          services={props.services}
          stores={props.stores}
          rates={props.rates}
          rateDate={props.rateDate}
          defaults={props.defaults}
        />
      </Section>
      <FormFooter state={state} pending={pending} cancelHref={`/members/${props.memberId}`} submit="确认续费" />
    </form>
  );
}

function FormFooter({
  state,
  pending,
  cancelHref,
  submit,
}: {
  state: ActionState;
  pending: boolean;
  cancelHref: string;
  submit: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="mr-auto">
        <FormMessage state={state} />
      </div>
      <Link href={cancelHref} className="btn btn-ghost">
        取消
      </Link>
      <SubmitButton pending={pending}>{submit}</SubmitButton>
    </div>
  );
}
