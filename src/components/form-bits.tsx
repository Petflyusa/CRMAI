"use client";

import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/types";

export function SubmitButton({
  children,
  pendingText = "保存中…",
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <DeleteButton className={className}>{children}</DeleteButton>
    </form>
  );
}

function DeleteButton({ children, className }: { children: React.ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "删除中…" : children}
    </button>
  );
}
