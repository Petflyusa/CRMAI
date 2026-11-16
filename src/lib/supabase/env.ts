// 注意：NEXT_PUBLIC_ 变量在构建时写入代码，必须用完整的 process.env.XXX 写法，
// 在 Vercel 上新增或修改后要重新部署才会生效。
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** 返回缺失的环境变量名，全部齐全时返回空数组 */
export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!KEY) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return missing;
}

export function supabaseUrl() {
  if (!URL) throw new Error("缺少环境变量 NEXT_PUBLIC_SUPABASE_URL");
  return URL;
}

export function supabaseKey() {
  if (!KEY) throw new Error("缺少环境变量 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return KEY;
}
