"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarPlus, LayoutDashboard, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/appointments/new", label: "New Appointment", icon: CalendarPlus },
];

function NavLinks({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "flex-row")}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-100",
              active
                ? "bg-white/15 text-white"
                : "text-brand-100 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-white">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
        <Stethoscope className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-lg font-semibold tracking-tight">MediSchedule</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-brand-700 to-brand-900 p-5 md:flex">
        <Brand />
        <div className="mt-8">
          <NavLinks orientation="vertical" />
        </div>
        <p className="mt-auto flex items-start gap-2 rounded-lg bg-black/15 p-3 text-xs leading-relaxed text-brand-100">
          <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Demo application. All patients and doctors shown are fictional.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-gradient-to-r from-brand-700 to-brand-900 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Brand />
            <NavLinks orientation="horizontal" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
