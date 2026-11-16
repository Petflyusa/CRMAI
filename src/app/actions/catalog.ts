"use server";

import { revalidatePath } from "next/cache";
import { bool, currency, errorMessage, num, reqStr, str } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function saveStore(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const id = str(fd, "id");
    const row = {
      name: reqStr(fd, "name", "门店名称"),
      code: str(fd, "code"),
      address: str(fd, "address"),
      phone: str(fd, "phone"),
      notes: str(fd, "notes"),
      active: bool(fd, "active"),
    };
    const { error } = id
      ? await supabase.from("stores").update(row).eq("id", id)
      : await supabase.from("stores").insert(row);
    if (error) throw error;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "已保存" };
}

export async function deleteStore(fd: FormData) {
  const id = fd.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  const { error } = await supabase.from("stores").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function saveService(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const id = str(fd, "id");
    const row = {
      name: reqStr(fd, "name", "服务名称"),
      description: str(fd, "description"),
      price: num(fd, "price", "价格", { min: 0 })!,
      price_currency: currency(fd, "price_currency"),
      cost: num(fd, "cost", "成本", { min: 0, required: false }) ?? 0,
      cost_currency: currency(fd, "cost_currency"),
      duration_days: Math.round(num(fd, "duration_days", "时长", { min: 1 })!),
      active: bool(fd, "active"),
    };
    const { error } = id
      ? await supabase.from("services").update(row).eq("id", id)
      : await supabase.from("services").insert(row);
    if (error) throw error;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "已保存" };
}

export async function deleteService(fd: FormData) {
  const id = fd.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
