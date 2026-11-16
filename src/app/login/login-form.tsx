"use client";

import { signIn } from "@/app/actions/system";
import { FormMessage, SubmitButton, useActionForm } from "@/components/form-bits";

export function LoginForm() {
  const { state, onSubmit, pending } = useActionForm(signIn);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="field-label" htmlFor="email">
          邮箱
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn btn-primary w-full" pendingText="登录中…">
        登录
      </SubmitButton>
    </form>
  );
}
