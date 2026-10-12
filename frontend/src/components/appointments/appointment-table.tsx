import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { formatDateTime } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

interface Props {
  items: Appointment[];
  onDelete: (appointment: Appointment) => void;
}

export function AppointmentTable({ items, onDelete }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Appointments</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Patient</th>
            <th scope="col" className="px-4 py-3 font-medium">Date &amp; time</th>
            <th scope="col" className="px-4 py-3 font-medium">Doctor</th>
            <th scope="col" className="px-4 py-3 font-medium">Type</th>
            <th scope="col" className="px-4 py-3 font-medium">Status</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((a) => (
            <tr key={a.id} className="transition-colors hover:bg-brand-50/50">
              <td className="px-4 py-3 font-medium text-slate-900">{a.patient_name}</td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {formatDateTime(a.appointment_datetime)}
              </td>
              <td className="px-4 py-3 text-slate-600">{a.doctor}</td>
              <td className="px-4 py-3 text-slate-600">{a.appointment_type}</td>
              <td className="px-4 py-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="icon">
                    <Link
                      href={`/appointments/${a.id}/edit`}
                      aria-label={`Edit appointment for ${a.patient_name}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:bg-red-50"
                    aria-label={`Delete appointment for ${a.patient_name}`}
                    onClick={() => onDelete(a)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
