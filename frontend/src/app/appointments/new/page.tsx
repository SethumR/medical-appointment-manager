"use client";

import { AppointmentForm } from "@/components/appointments/appointment-form";
import { api } from "@/lib/api";

export default function NewAppointmentPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New appointment</h1>
        <p className="text-sm text-slate-500">Book a patient with a doctor. Fields marked * are required.</p>
      </div>
      <AppointmentForm
        submitLabel="Create appointment"
        successMessage="Appointment created"
        onSubmit={(values) => api.create(values)}
      />
    </div>
  );
}
