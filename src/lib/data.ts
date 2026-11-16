import "server-only";
import { createClient } from "./supabase/server";
import type { MemberOverview, Service, Store, Subscription } from "./types";

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listStores(opts: { activeOnly?: boolean } = {}) {
  const supabase = await createClient();
  let q = supabase.from("stores").select("*").order("name");
  if (opts.activeOnly) q = q.eq("active", true);
  return check<Store[]>(await q);
}

export async function listServices(opts: { activeOnly?: boolean } = {}) {
  const supabase = await createClient();
  let q = supabase.from("services").select("*").order("name");
  if (opts.activeOnly) q = q.eq("active", true);
  return check<Service[]>(await q).map((s) => ({ ...s, price: Number(s.price), cost: Number(s.cost) }));
}

export async function listMembers() {
  const supabase = await createClient();
  return check<MemberOverview[]>(
    await supabase.from("member_overview").select("*").order("end_date", { ascending: true, nullsFirst: false }),
  );
}

export async function getMember(id: string) {
  const supabase = await createClient();
  return check<MemberOverview | null>(await supabase.from("member_overview").select("*").eq("id", id).maybeSingle());
}

export type SubscriptionRow = Subscription & { service_name: string | null; store_name: string | null };

export async function listSubscriptions(filter: { memberId?: string } = {}) {
  const supabase = await createClient();
  let q = supabase
    .from("subscriptions")
    .select("*, services(name), stores(name)")
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (filter.memberId) q = q.eq("member_id", filter.memberId);
  const rows = check<(Subscription & { services: { name: string } | null; stores: { name: string } | null })[]>(
    await q,
  );
  return rows.map(({ services, stores, ...s }) => ({
    ...s,
    paid_amount: Number(s.paid_amount),
    paid_usd: Number(s.paid_usd),
    cost_usd: Number(s.cost_usd),
    profit_usd: Number(s.profit_usd),
    list_price_usd: s.list_price_usd == null ? null : Number(s.list_price_usd),
    service_name: services?.name ?? null,
    store_name: stores?.name ?? null,
  })) as SubscriptionRow[];
}

/** 只选出入口需要的服务：启用中的，加上当前已选中的（可能已停用） */
export function selectableServices(all: Service[], currentId?: string | null) {
  return all.filter((s) => s.active || s.id === currentId);
}

export function selectableStores(all: Store[], currentId?: string | null) {
  return all.filter((s) => s.active || s.id === currentId);
}
