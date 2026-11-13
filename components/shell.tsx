"use client";

import { BarChart3, LayoutDashboard, Menu, MessageSquareText, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FX_AS_OF_LABEL } from "@/lib/currency";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/employees", label: "Directory", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/insights", label: "Ask the Org", icon: MessageSquareText },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground xl:flex">
          <SidebarBrand />
          <SidebarNav pathname={pathname} />
          <SidebarNote />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-3 py-2 sm:px-6 sm:py-3">
              <div className="flex min-w-0 items-center gap-1">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-stone-200/70 md:hidden"
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav"
                  onClick={() => setMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-medium sm:text-lg xl:hidden">ACME Compensation</p>
                  <p className="truncate text-xs text-muted sm:text-sm">Reference FX {FX_AS_OF_LABEL}</p>
                </div>
              </div>
              <div className="flex h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-2.5 text-sm sm:px-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  AC
                </span>
                <span className="hidden sm:inline">HR Manager</span>
              </div>
            </div>
            <nav className="hidden flex-wrap gap-2 px-4 pb-3 md:flex xl:hidden" aria-label="Primary">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm ${
                      active ? "bg-sidebar text-white" : "bg-card text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside id="mobile-nav" role="dialog" aria-modal="true" aria-label="Primary" className="sheet-in absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-sidebar text-sidebar-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3 pr-2">
              <SidebarBrand />
              <button
                type="button"
                className="mt-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <SidebarNav pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <SidebarNote />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SidebarBrand() {
  return (
    <div className="px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">ACME Corp</p>
      <p className="mt-1 font-display text-2xl font-medium">Compensation</p>
    </div>
  );
}

function SidebarNote() {
  return <p className="px-5 py-5 text-xs leading-5 text-stone-500">Gross pay only. Rates as of {FX_AS_OF_LABEL}.</p>;
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Primary">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${
              active ? "bg-white/10 text-white" : "text-stone-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
