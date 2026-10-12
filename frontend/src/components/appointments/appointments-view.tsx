"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CalendarX, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { AppointmentTable } from "./appointment-table";
import { DeleteDialog } from "./delete-dialog";
import { FiltersBar } from "./filters-bar";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api } from "@/lib/api";
import {
  EMPTY_FILTERS,
  type Appointment,
  type AppointmentFilters,
  type AppointmentPage,
  type AppointmentSummary,
} from "@/lib/types";

const PAGE_SIZE = 10;

export function AppointmentsView() {
  const [filters, setFilters] = useState<AppointmentFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AppointmentPage | null>(null);
  const [outcome, setOutcome] = useState<{ key: string; error: string | null } | null>(null);
  const [summary, setSummary] = useState<AppointmentSummary | null>(null);
  const [doctors, setDoctors] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<Appointment | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Only the text search is debounced; selects and dates apply immediately.
  const debouncedSearch = useDebouncedValue(filters.search);
  const queryKey = JSON.stringify({ ...filters, search: debouncedSearch });
  const requestKey = `${queryKey}|${page}|${reloadKey}`;

  // Loading/error are derived: a request is in flight until its key has settled.
  const loading = outcome?.key !== requestKey;
  const error = outcome?.key === requestKey ? outcome.error : null;

  const changeFilters = (next: AppointmentFilters) => {
    setFilters(next);
    setPage(1);
  };

  useEffect(() => {
    const controller = new AbortController();
    api
      .list({ ...JSON.parse(queryKey), page, page_size: PAGE_SIZE }, controller.signal)
      .then((result) => {
        // A deletion can leave the current page empty; step back to the last valid page.
        if (result.items.length === 0 && result.page > result.pages) {
          setPage(result.pages);
          return;
        }
        setData(result);
        setOutcome({ key: requestKey, error: null });
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setOutcome({
          key: requestKey,
          error: e instanceof Error ? e.message : "Failed to load appointments",
        });
      });
    return () => controller.abort();
  }, [queryKey, page, reloadKey, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    api.summary(controller.signal).then(setSummary).catch(() => undefined);
    api.doctors(controller.signal).then(setDoctors).catch(() => undefined);
    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const hasFilters = queryKey !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Appointments</h1>
          <p className="text-sm text-slate-500">Manage patient appointments across your clinic.</p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <Plus className="h-4 w-4" aria-hidden /> New Appointment
          </Link>
        </Button>
      </div>

      <SummaryCards summary={summary} />
      <FiltersBar filters={filters} doctors={doctors} onChange={changeFilters} />

      <section
        aria-label="Appointment list"
        aria-busy={loading}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" aria-hidden />
            <p className="font-medium text-slate-900">Could not load appointments</p>
            <p className="text-sm text-slate-500">{error}</p>
            <Button variant="outline" onClick={reload}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Try again
            </Button>
          </div>
        ) : !data ? (
          <div role="status" className="space-y-3 p-6" aria-label="Loading appointments">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : data.total === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <CalendarX className="h-10 w-10 text-slate-300" aria-hidden />
            <p className="font-medium text-slate-900">
              {hasFilters ? "No appointments match your filters" : "No appointments yet"}
            </p>
            <p className="text-sm text-slate-500">
              {hasFilters
                ? "Try adjusting or clearing the filters."
                : "Create your first appointment to get started."}
            </p>
            {hasFilters ? (
              <Button variant="outline" onClick={() => changeFilters(EMPTY_FILTERS)}>
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link href="/appointments/new">New Appointment</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <AppointmentTable items={data.items} onDelete={setToDelete} />
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
              <p aria-live="polite">
                {data.total} appointment{data.total === 1 ? "" : "s"}
                {hasFilters ? " found" : ""} · Page {data.page} of {data.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setPage(data.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.pages}
                  onClick={() => setPage(data.page + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <DeleteDialog
        appointment={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={() => {
          setToDelete(null);
          reload();
        }}
      />
    </div>
  );
}
