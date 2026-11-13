"use client";

import { BarChart3, LayoutDashboard, MessageSquareText, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FX_AS_OF_LABEL } from "@/lib/currency";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/employees", label: "Directory", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/insights", label: "Ask the Org", icon: MessageSquareText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
          <div className="px-5 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">ACME Corp</p>
            <p className="mt-1 font-display text-2xl font-medium">Compensation</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-white/10 text-white" : "text-stone-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <p className="px-5 py-5 text-xs leading-5 text-stone-500">Gross pay only. Rates as of {FX_AS_OF_LABEL}.</p>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div>
                <p className="font-display text-lg font-medium lg:hidden">ACME Compensation</p>
                <p className="text-sm text-muted">Reference FX {FX_AS_OF_LABEL}</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  AC
                </span>
                HR Manager
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden" aria-label="Primary">
              {NAV.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                      active ? "bg-sidebar text-white" : "bg-card text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
