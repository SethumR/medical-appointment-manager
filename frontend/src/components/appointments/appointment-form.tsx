"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { appointmentFormSchema, type AppointmentFormValues } from "@/lib/schema";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from "@/lib/types";

interface Props {
  initialValues?: AppointmentFormValues;
  submitLabel: string;
  successMessage: string;
  onSubmit: (values: AppointmentFormValues) => Promise<unknown>;
}

const DEFAULTS: AppointmentFormValues = {
  patient_name: "",
  appointment_datetime: "",
  doctor: "",
  appointment_type: "General Consultation",
  status: "Scheduled",
};

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} <span className="text-red-500" aria-hidden>*</span>
        <span className="sr-only">(required)</span>
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function AppointmentForm({ initialValues, submitLabel, successMessage, onSubmit }: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: initialValues ?? DEFAULTS,
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (e) {
      const apiError = e instanceof ApiError ? e : null;
      for (const [field, message] of Object.entries(apiError?.fieldErrors ?? {})) {
        if (field in DEFAULTS) setError(field as keyof AppointmentFormValues, { message });
      }
      const message = e instanceof Error ? e.message : "Something went wrong";
      setFormError(message);
      toast.error(message);
      return;
    }
    // Reached only after the backend confirmed the save.
    toast.success(successMessage);
    router.push("/");
  });

  const invalid = (name: keyof AppointmentFormValues) =>
    errors[name]
      ? ({ "aria-invalid": true, "aria-describedby": `${name}-error` } as const)
      : undefined;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="patient_name" label="Patient name" error={errors.patient_name?.message}>
          <Input id="patient_name" autoComplete="off" {...register("patient_name")} {...invalid("patient_name")} />
        </Field>
        <Field id="doctor" label="Doctor" error={errors.doctor?.message}>
          <Input id="doctor" autoComplete="off" {...register("doctor")} {...invalid("doctor")} />
        </Field>
        <Field
          id="appointment_datetime"
          label="Date and time"
          error={errors.appointment_datetime?.message}
        >
          <Input
            id="appointment_datetime"
            type="datetime-local"
            {...register("appointment_datetime")}
            {...invalid("appointment_datetime")}
          />
        </Field>
        <Field id="appointment_type" label="Appointment type" error={errors.appointment_type?.message}>
          <Select id="appointment_type" {...register("appointment_type")} {...invalid("appointment_type")}>
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field id="status" label="Status" error={errors.status?.message}>
          <Select id="status" {...register("status")} {...invalid("status")}>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>

      <p className="text-xs text-slate-500">
        Times are clinic-local. Each appointment reserves a 60-minute slot for the doctor.
      </p>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
        <Button asChild variant="outline">
          <Link href="/">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
