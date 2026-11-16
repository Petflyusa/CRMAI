"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions/system";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function LoginForm() {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
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
      <SubmitButton className="btn btn-primary w-full" pendingText="登录中…">
        登录
      </SubmitButton>
    </form>
  );
}
