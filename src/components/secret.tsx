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

/** 列表里的密码：只显示一个小眼睛，点开后密码在下方展开 */
export function SecretReveal({ value }: { value: string | null }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="text-ink-3">—</span>;
  return (
    <span className="inline-flex flex-col items-start align-top">
      <button
        type="button"
        className={`-ml-1 rounded p-1 hover:bg-sunken hover:text-ink ${show ? "text-ink" : "text-ink-3"}`}
        aria-label={show ? "隐藏密码" : "显示密码"}
        aria-expanded={show}
        title={show ? "隐藏密码" : "显示密码"}
        onClick={() => {
          setShow((v) => !v);
          setCopied(false);
        }}
      >
        <EyeIcon off={show} />
      </button>
      {show && (
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-line bg-sunken px-2 py-1">
          <span className="num text-[13px] select-all">{value}</span>
          <button
            type="button"
            className="text-[11px] text-ink-3 hover:text-ink"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(value);
                setCopied(true);
              } catch {
                /* 浏览器不允许时忽略，用户仍可手动选中复制 */
              }
            }}
          >
            {copied ? "已复制" : "复制"}
          </button>
        </span>
      )}
    </span>
  );
}
