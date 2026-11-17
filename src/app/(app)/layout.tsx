import { signOut } from "@/app/actions/system";
import { CurrencySwitch } from "@/components/currency-switch";
import { Nav } from "@/components/nav";
import { CURRENCIES, formatRate } from "@/lib/currency";
import { getRates } from "@/lib/fx";
import { getDisplayCurrency } from "@/lib/prefs";
import Link from "next/link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [fx, display] = await Promise.all([getRates(), getDisplayCurrency()]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4 lg:py-6">
          <Link href="/" className="num text-[13px] font-semibold tracking-[0.18em]">
            CRMAI
          </Link>
          <form action={signOut} className="lg:hidden">
            <button className="btn btn-ghost btn-sm">退出</button>
          </form>
        </div>
        <Nav />
        <div className="hidden flex-1 lg:block" />
        <div className="hidden space-y-4 border-t border-line px-5 py-5 lg:block">
          <div>
            <p className="mb-2 text-[11px] font-medium tracking-wide text-ink-3 uppercase">展示币种</p>
            <CurrencySwitch value={display} />
          </div>
          <Link href="/rates" className="block rounded-md text-[12px] leading-relaxed text-ink-2 hover:text-ink">
            {CURRENCIES.filter((c) => c !== "USD").map((c) => (
              <span key={c} className="num block">
                1 USD = {formatRate(fx.rates[c])} {c}
              </span>
            ))}
            <span className={`mt-1 block text-[11px] ${fx.stale ? "text-warn" : "text-ink-3"}`}>
              {fx.stale ? "抓取失败，使用旧汇率" : `汇率日期 ${fx.date}`}
            </span>
          </Link>
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm -ml-2.5">退出登录</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
