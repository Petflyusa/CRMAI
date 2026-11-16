"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ConfirmDialog } from "./confirm-dialog";

export type MenuItem =
  | { kind: "link"; label: string; href: string }
  | { kind: "delete"; label: string; confirm: string; action: (fd: FormData) => Promise<void>; fields: Record<string, string> };

/**
 * 行内「操作」下拉菜单。用 fixed 定位，避免被表格的横向滚动容器裁掉。
 */
export function ActionMenu({ items, label = "操作" }: { items: MenuItem[]; label?: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [confirming, setConfirming] = useState<Extract<MenuItem, { kind: "delete" }> | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const open = pos != null;

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !btn.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    menu.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (open) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const menuH = 44 * items.length + 12;
    const top = r.bottom + menuH > window.innerHeight ? Math.max(8, r.top - menuH - 4) : r.bottom + 4;
    setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
  }

  const itemCls = "flex w-full items-center rounded px-3 py-2 text-left text-[13px] hover:bg-sunken focus:bg-sunken focus:outline-none";

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="btn btn-secondary btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
      >
        {label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {open && (
        <div
          ref={menu}
          id={id}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-50 min-w-[140px] rounded-md border border-line bg-surface p-1 shadow-[0_12px_32px_-12px_rgba(27,26,23,0.35)]"
        >
          {items.map((it) =>
            it.kind === "link" ? (
              <Link
                key={it.label}
                role="menuitem"
                href={it.href}
                scroll={false}
                className={itemCls}
                onClick={() => setPos(null)}
              >
                {it.label}
              </Link>
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                className={`${itemCls} text-loss`}
                onClick={() => {
                  setPos(null);
                  setConfirming(it);
                }}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
      {confirming && (
        <ConfirmDialog
          message={confirming.confirm}
          action={confirming.action}
          fields={confirming.fields}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}
