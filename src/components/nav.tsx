"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "概览" },
  { href: "/members", label: "会员" },
  { href: "/stores", label: "门店" },
  { href: "/services", label: "服务" },
  { href: "/rates", label: "汇率" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:pb-0">
      {ITEMS.map((item) => {
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-[14px] whitespace-nowrap transition-colors ${
              active ? "bg-sunken font-medium text-ink" : "text-ink-2 hover:bg-sunken/60 hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
