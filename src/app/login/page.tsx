import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "登录" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="mb-8">
          <p className="num text-[12px] tracking-[0.2em] text-ink-3">CRMAI</p>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight">登录会员管理后台</h1>
          <p className="mt-1 text-[13px] text-ink-3">使用在 Supabase 中创建的管理员账号</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
