"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, SearchX } from "lucide-react";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { toInputValue } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; appointment: Appointment }
  | { kind: "not-found" }
  | { kind: "error"; message: string };

export default function EditAppointmentPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const validId = Number.isInteger(id) && id >= 1;
  const [fetched, setFetched] = useState<State>({ kind: "loading" });
  const state: State = validId ? fetched : { kind: "not-found" };

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    api
      .get(id, controller.signal)
      .then((appointment) => setFetched({ kind: "ready", appointment }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (e instanceof ApiError && e.status === 404) setFetched({ kind: "not-found" });
        else setFetched({ kind: "error", message: e instanceof Error ? e.message : "Failed to load" });
      });
    return () => controller.abort();
  }, [id, validId]);

  if (state.kind === "loading") {
    return (
      <div role="status" aria-label="Loading appointment" className="mx-auto max-w-3xl space-y-3">
        <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (state.kind === "not-found" || state.kind === "error") {
    const notFound = state.kind === "not-found";
    const Icon = notFound ? SearchX : AlertCircle;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <Icon className="h-10 w-10 text-slate-400" aria-hidden />
        <h1 className="text-xl font-semibold text-slate-900">
          {notFound ? "Appointment not found" : "Could not load appointment"}
        </h1>
        <p className="text-sm text-slate-500">
          {notFound ? "It may have been deleted, or the link is incorrect." : state.message}
        </p>
        <Button asChild>
          <Link href="/">Back to appointments</Link>
        </Button>
      </div>
    );
  }

  const { appointment } = state;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Edit appointment</h1>
        <p className="text-sm text-slate-500">
          Created {new Date(appointment.created_at + "Z").toLocaleString("en-AU")}
        </p>
      </div>
      <AppointmentForm
        initialValues={{
          patient_name: appointment.patient_name,
          appointment_datetime: toInputValue(appointment.appointment_datetime),
          doctor: appointment.doctor,
          appointment_type: appointment.appointment_type,
          status: appointment.status,
        }}
        submitLabel="Save changes"
        successMessage="Appointment updated"
        onSubmit={(values) => api.update(appointment.id, values)}
      />
    </div>
  );
}
