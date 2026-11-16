"use client";

import { useState } from "react";

export function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" strokeLinecap="round" />}
    </svg>
  );
}

/** 列表里的密码：默认打码，点小眼睛显示 */
export function SecretReveal({ value }: { value: string | null }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-ink-3">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`num text-[13px] ${show ? "" : "tracking-widest text-ink-3"}`}>
        {show ? value : "••••••"}
      </span>
      <button
        type="button"
        className="rounded p-1 text-ink-3 hover:bg-sunken hover:text-ink"
        aria-label={show ? "隐藏密码" : "显示密码"}
        aria-pressed={show}
        onClick={() => setShow((v) => !v)}
      >
        <EyeIcon off={show} />
      </button>
    </span>
  );
}
