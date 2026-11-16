"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isCurrency } from "@/lib/currency";
import { errorMessage, reqStr } from "@/lib/form";
import { refreshRates } from "@/lib/fx";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

export async function signIn(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: reqStr(fd, "email", "邮箱"),
      password: reqStr(fd, "password", "密码"),
    });
    if (error) return { error: "邮箱或密码不正确" };
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function refreshRatesAction(_prev: ActionState): Promise<ActionState> {
  try {
    const fx = await refreshRates();
    revalidatePath("/", "layout");
    return fx.stale ? { error: "抓取失败，暂时沿用上一次的汇率" } : { ok: "汇率已更新" };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function setDisplayCurrency(fd: FormData) {
  const v = fd.get("currency");
  if (!isCurrency(v)) return;
  const store = await cookies();
  store.set("display_currency", v, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
