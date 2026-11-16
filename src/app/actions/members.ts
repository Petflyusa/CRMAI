"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Rates } from "@/lib/currency";
import { today } from "@/lib/dates";
import { currency, date, email, errorMessage, FormError, num, reqStr, str } from "@/lib/form";
import { getRates, refreshRates, snapshotOf } from "@/lib/fx";
import { computePrice, serviceCostUsd } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { ActionState, Service, Subscription } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function readSubscription(fd: FormData, rates: Rates, supabase: Supabase) {
  const service_id = str(fd, "service_id");
  const store_id = str(fd, "store_id");
  const start_date = date(fd, "start_date", "开始日期");
  const end_date = date(fd, "end_date", "到期日期");
  if (end_date < start_date) throw new FormError("到期日期不能早于开始日期");
  const paid_at = str(fd, "paid_at") ?? today();
  const paid_amount = num(fd, "paid_amount", "实付金额", { min: 0 })!;
  const paid_currency = currency(fd, "paid_currency");

  let service: Pick<Service, "price" | "price_currency" | "cost" | "cost_currency"> | null = null;
  if (service_id) {
    const { data } = await supabase
      .from("services")
      .select("price, price_currency, cost, cost_currency")
      .eq("id", service_id)
      .maybeSingle();
    service = data;
  }

  const costInput = num(fd, "cost_usd", "成本", { min: 0, required: false });
  const costUsd = costInput ?? (service ? serviceCostUsd(service, rates) : 0);
  const p = computePrice({ paidAmount: paid_amount, paidCurrency: paid_currency, costUsd, service, rates });

  return {
    service_id,
    store_id,
    start_date,
    end_date,
    paid_at,
    paid_amount,
    paid_currency,
    paid_usd: p.paidUsd,
    cost_usd: p.costUsd,
    list_price_usd: p.listPriceUsd,
    notes: str(fd, "sub_notes"),
  };
}

function readMember(fd: FormData) {
  return {
    email: email(fd),
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    notes: str(fd, "notes"),
  };
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function createMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let memberId: string;
  try {
    const supabase = await createClient();
    const fx = await getRates();
    const member = readMember(fd);
    const sub = await readSubscription(fd, fx.rates, supabase);

    const { data: existing } = await supabase
      .from("members")
      .select("id")
      .eq("email", member.email)
      .maybeSingle();
    if (existing) throw new FormError("这个邮箱已经是会员了，请在会员列表里直接续费");

    const { data: created, error } = await supabase.from("members").insert(member).select("id").single();
    if (error) throw error;
    memberId = created.id;

    const { error: subError } = await supabase
      .from("subscriptions")
      .insert({ ...sub, member_id: memberId, kind: "new", fx_snapshot: snapshotOf(fx) });
    if (subError) {
      await supabase.from("members").delete().eq("id", memberId);
      throw subError;
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidateAll();
  redirect(`/members?created=${memberId}`);
}

export async function updateMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id: string;
  try {
    const supabase = await createClient();
    id = reqStr(fd, "id", "会员");
    const member = readMember(fd);

    const { data: clash } = await supabase
      .from("members")
      .select("id")
      .eq("email", member.email)
      .neq("id", id)
      .maybeSingle();
    if (clash) throw new FormError("这个邮箱已被其他会员使用");

    const { error } = await supabase.from("members").update(member).eq("id", id);
    if (error) throw error;

    const subscriptionId = str(fd, "subscription_id");
    if (subscriptionId) {
      const { data: current } = await supabase
        .from("subscriptions")
        .select("fx_snapshot")
        .eq("id", subscriptionId)
        .single<Pick<Subscription, "fx_snapshot">>();
      if (!current) throw new FormError("找不到这条订阅记录");

      // 默认沿用当时的汇率；勾选「按最新汇率重算」才换成当前汇率
      const useLatest = fd.get("recalc_fx") === "on";
      const fx = useLatest ? snapshotOf(await refreshRates()) : current.fx_snapshot;
      const sub = await readSubscription(fd, fx.rates, supabase);
      const { error: subError } = await supabase
        .from("subscriptions")
        .update({ ...sub, fx_snapshot: fx })
        .eq("id", subscriptionId);
      if (subError) throw subError;
    }
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidateAll();
  redirect(`/members/${id}?saved=1`);
}

export async function renewMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let memberId: string;
  try {
    const supabase = await createClient();
    memberId = reqStr(fd, "member_id", "会员");
    const fx = await getRates();
    const sub = await readSubscription(fd, fx.rates, supabase);
    const { error } = await supabase
      .from("subscriptions")
      .insert({ ...sub, member_id: memberId, kind: "renewal", fx_snapshot: snapshotOf(fx) });
    if (error) throw error;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidateAll();
  redirect(`/members/${memberId}?renewed=1`);
}

export async function deleteMember(fd: FormData) {
  const id = fd.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAll();
  if (fd.get("redirect") === "list") redirect("/members");
}

export async function deleteSubscription(fd: FormData) {
  const id = fd.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAll();
}
