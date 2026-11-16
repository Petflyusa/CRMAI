"use client";

import { startTransition, useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * React 19 用 <form action> 提交后会自动清空表单，出错时用户要重填。
 * 这里改用 onSubmit 手动提交，表单内容保持不变。
 */
export function useActionForm(action: Action) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}

export function SubmitButton({
  children,
  pendingText = "保存中…",
  className = "btn btn-primary",
  pending: pendingProp,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <p role="alert" className="rounded-md bg-loss-soft px-3 py-2 text-[13px] text-loss">
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="text-[13px] text-gain">
        {state.ok}
      </p>
    );
  }
  return null;
}

/** 带二次确认的删除按钮 */
export function ConfirmForm({
  action,
  message,
  fields,
  children,
  className = "btn btn-danger btn-sm",
}: {
  action: (fd: FormData) => Promise<void>;
  message: string;
  fields: Record<string, string>;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && <ConfirmDialog message={message} action={action} fields={fields} onClose={() => setOpen(false)} />}
    </>
  );
}
