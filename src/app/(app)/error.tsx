"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="panel mx-auto mt-10 max-w-lg p-6">
      <h1 className="text-[17px] font-semibold">页面加载失败</h1>
      <p className="mt-2 text-[13px] text-ink-2">{error.message || "发生未知错误"}</p>
      <p className="mt-1 text-[12px] text-ink-3">
        如果提示缺少表或汇率抓取失败，请确认已在 Supabase 执行迁移，且服务器可以访问外网。
      </p>
      <button className="btn btn-secondary mt-5" onClick={reset}>
        重新加载
      </button>
    </div>
  );
}
