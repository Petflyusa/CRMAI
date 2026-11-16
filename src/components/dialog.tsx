"use client";

import { useEffect, useRef } from "react";
import type { ActionState } from "@/lib/types";
import { FormMessage, SubmitButton, useActionForm } from "./form-bits";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** 弹窗表单：保存成功后自动关闭 */
export function FormDialog({
  title,
  trigger,
  triggerClass = "btn btn-primary",
  action,
  submitLabel = "保存",
  children,
}: {
  title: string;
  trigger: React.ReactNode;
  triggerClass?: string;
  action: Action;
  submitLabel?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { state, onSubmit, pending } = useActionForm(action);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.close();
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(560px,calc(100vw-32px))] rounded-lg border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_-20px_rgba(27,26,23,0.35)] backdrop:bg-ink/30"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <form ref={formRef} onSubmit={onSubmit}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            <button
              type="button"
              aria-label="关闭"
              className="btn btn-ghost btn-sm"
              onClick={() => ref.current?.close()}
            >
              关闭
            </button>
          </div>
          <div className="space-y-4 px-5 py-5">{children}</div>
          <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
            <div className="mr-auto">{state?.error && <FormMessage state={state} />}</div>
            <button type="button" className="btn btn-ghost" onClick={() => ref.current?.close()}>
              取消
            </button>
            <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
