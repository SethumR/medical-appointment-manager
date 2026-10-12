import { CalendarCheck, CalendarClock, CheckCircle2, ClipboardList } from "lucide-react";
import type { AppointmentSummary } from "@/lib/types";

const CARDS = [
  { key: "total", label: "Total", icon: ClipboardList, tone: "bg-brand-50 text-brand-700" },
  { key: "scheduled", label: "Scheduled", icon: CalendarClock, tone: "bg-sky-50 text-sky-700" },
  { key: "confirmed", label: "Confirmed", icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-700" },
  { key: "completed", label: "Completed", icon: CheckCircle2, tone: "bg-slate-100 text-slate-700" },
] as const;

/** Counts cover ALL appointments; they intentionally ignore the active search and filters. */
export function SummaryCards({ summary }: { summary: AppointmentSummary | null }) {
  return (
    <section aria-label="Appointment summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map(({ key, label, icon: Icon, tone }, index) => (
        <div
          key={key}
          style={{ animationDelay: `${index * 60}ms` }}
          className="animate-in-up rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <span className={`rounded-lg p-2 ${tone}`}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900" data-testid={`summary-${key}`}>
            {summary ? summary[key] : <span className="inline-block h-8 w-10 animate-pulse rounded bg-slate-100" />}
          </p>
        </div>
      ))}
    </section>
  );
}
