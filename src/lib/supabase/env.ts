export function supabaseUrl() {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!v) throw new Error("缺少环境变量 NEXT_PUBLIC_SUPABASE_URL");
  return v;
}

export function supabaseKey() {
  const v =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!v) throw new Error("缺少环境变量 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  return v;
}
