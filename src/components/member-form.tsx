"use client";

import Link from "next/link";
import { useState } from "react";
import type { Rates } from "@/lib/currency";
import type { ActionState, Member, Service, Store } from "@/lib/types";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";
import { EyeIcon } from "./secret";
import { SubscriptionFields, type SubscriptionDefaults } from "./subscription-fields";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function Section({
  title,
  hint,
  bare,
  children,
}: {
  title: string;
  hint?: string;
  /** 弹窗里不再套一层卡片 */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={bare ? "" : "panel p-5 sm:p-6"}>
      <div className={bare ? "mb-4" : "mb-5"}>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-[12px] text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

const PW_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function generatePassword(len = 10) {
  const bytes = crypto.getRandomValues(new Uint32Array(len));
  return Array.from(bytes, (b) => PW_CHARS[b % PW_CHARS.length]).join("");
}

function PasswordField({ defaultValue }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [show, setShow] = useState(!defaultValue);
  return (
    <div>
      <label className="field-label" htmlFor="initial_password">
        初始密码 <span className="font-normal text-ink-3">选填</span>
      </label>
      <div className="flex">
        <input
          id="initial_password"
          name="initial_password"
          type={show ? "text" : "password"}
          autoComplete="off"
          className="input num rounded-r-none"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-secondary rounded-none border-l-0 px-2.5"
          aria-label={show ? "隐藏密码" : "显示密码"}
          onClick={() => setShow((v) => !v)}
        >
          <EyeIcon off={show} />
        </button>
        <button
          type="button"
          className="btn btn-secondary rounded-l-none border-l-0"
          onClick={() => {
            setValue(generatePassword());
            setShow(true);
          }}
        >
          生成
        </button>
      </div>
    </div>
  );
}

export function MemberFields({ member }: { member?: Partial<Member> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
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
        <label className="field-label" htmlFor="im">
          IM 联系方式 <span className="font-normal text-ink-3">选填</span>
        </label>
        <input
          id="im"
          name="im"
          className="input"
          placeholder="微信 / WhatsApp / Telegram 账号"
          defaultValue={member?.im ?? ""}
        />
      </div>
      <PasswordField defaultValue={member?.initial_password} />
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor="notes">
          会员备注 <span className="font-normal text-ink-3">选填</span>
        </label>
        <input id="notes" name="notes" className="input" defaultValue={member?.notes ?? ""} />
      </div>
    </div>
  );
}

/** 新建会员：会员信息 + 首次订阅（弹窗） */
export function NewMemberForm(props: {
  action: Action;
  services: Service[];
  stores: Store[];
  rates: Rates;
  rateDate: string;
  defaults: SubscriptionDefaults;
  closeHref: string;
}) {
  const { state, onSubmit, pending } = useActionForm(props.action);
  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <Section title="会员信息" bare>
        <MemberFields />
      </Section>
      <div className="border-t border-line" />
      <Section title="服务与付款" hint="利润 = 实付折合美元 − 成本，按当前汇率计算并保存快照" bare>
        <SubscriptionFields
          services={props.services}
          stores={props.stores}
          rates={props.rates}
          rateDate={props.rateDate}
          defaults={props.defaults}
        />
      </Section>
      <FormFooter state={state} pending={pending} cancelHref={props.closeHref} submit="创建会员" />
    </form>
  );
}

/** 编辑会员：会员信息 + 当前订阅（弹窗） */
export function EditMemberForm(props: {
  action: Action;
  member: Member;
  subscriptionId: string | null;
  subscriptionKind: "new" | "renewal" | null;
  services: Service[];
  stores: Store[];
  rates: Rates;
  rateDate: string;
  defaults: SubscriptionDefaults | null;
  closeHref: string;
}) {
  const { state, onSubmit, pending } = useActionForm(props.action);
  const renewal = props.subscriptionKind === "renewal";
  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <input type="hidden" name="id" value={props.member.id} />
      <input type="hidden" name="return_to" value={props.closeHref} />
      {props.subscriptionId && <input type="hidden" name="subscription_id" value={props.subscriptionId} />}
      <Section title="会员信息" bare>
        <MemberFields member={props.member} />
      </Section>
      {props.defaults && <div className="border-t border-line" />}
      {props.defaults && (
        <Section
          title={renewal ? "当前订阅 · 最近一次续费" : "当前订阅"}
          hint="修改金额时默认沿用这笔付款当时的汇率"
          bare
        >
          <SubscriptionFields
            services={props.services}
            stores={props.stores}
            rates={props.rates}
            rateDate={props.rateDate}
            defaults={props.defaults}
            autoEnd={false}
            kind={renewal ? "renewal" : "new"}
          />
          <label className="mt-5 flex items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" name="recalc_fx" className="size-4 accent-[var(--color-accent)]" />
            按最新汇率重新计算这笔付款
          </label>
        </Section>
      )}
      <FormFooter state={state} pending={pending} cancelHref={props.closeHref} submit="保存修改" />
    </form>
  );
}

/** 续费：单独的续费金额与续费日期，不改动原来的付款（弹窗） */
export function RenewForm(props: {
  action: Action;
  memberId: string;
  services: Service[];
  stores: Store[];
  rates: Rates;
  rateDate: string;
  defaults: SubscriptionDefaults;
  closeHref: string;
}) {
  const { state, onSubmit, pending } = useActionForm(props.action);
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="member_id" value={props.memberId} />
      <input type="hidden" name="return_to" value={props.closeHref} />
      <SubscriptionFields
        services={props.services}
        stores={props.stores}
        rates={props.rates}
        rateDate={props.rateDate}
        defaults={props.defaults}
        kind="renewal"
      />
      <FormFooter state={state} pending={pending} cancelHref={props.closeHref} submit="确认续费" />
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
      <Link href={cancelHref} scroll={false} className="btn btn-ghost">
        取消
      </Link>
      <SubmitButton pending={pending}>{submit}</SubmitButton>
    </div>
  );
}
