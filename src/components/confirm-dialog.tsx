"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

/** 删除等危险操作的确认弹窗（替代浏览器自带的 confirm） */
export function ConfirmDialog({
  title = "确认删除",
  message,
  confirmLabel = "确认删除",
  action,
  fields,
  onClose,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="m-auto w-[min(420px,calc(100vw-32px))] rounded-lg border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_-20px_rgba(27,26,23,0.35)] backdrop:bg-ink/30"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <form action={action} className="px-5 py-5 sm:px-6">
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            取消
          </button>
          <ConfirmButton>{confirmLabel}</ConfirmButton>
        </div>
      </form>
    </dialog>
  );
}

function ConfirmButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger" disabled={pending} autoFocus>
      {pending ? "删除中…" : children}
    </button>
  );
}
