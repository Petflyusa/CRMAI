"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * 由地址参数控制的弹窗（如 /members?new=1、?renew=<id>）。
 * 打开即显示，关闭时回到 closeHref。
 */
export function RouteDialog({
  title,
  description,
  closeHref,
  wide,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  closeHref: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const close = () => router.replace(closeHref, { scroll: false });

  return (
    <dialog
      ref={ref}
      className={`m-auto max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain rounded-lg border border-line bg-surface p-0 text-ink shadow-[0_24px_60px_-20px_rgba(27,26,23,0.35)] backdrop:bg-ink/30 ${
        wide ? "w-[min(920px,calc(100vw-32px))]" : "w-[min(760px,calc(100vw-32px))]"
      }`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[12px] text-ink-3">{description}</p>}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={close}>
          关闭
        </button>
      </div>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </dialog>
  );
}
