import type { AppointmentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<AppointmentStatus, string> = {
  Scheduled: "bg-sky-50 text-sky-700 ring-sky-600/20",
  Confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Completed: "bg-slate-100 text-slate-700 ring-slate-500/20",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {status}
    </span>
  );
}
