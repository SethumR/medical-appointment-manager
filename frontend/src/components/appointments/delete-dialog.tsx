"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { Appointment } from "@/lib/types";

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteDialog({ appointment, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!appointment) return;
    setDeleting(true);
    setError(null);
    try {
      await api.remove(appointment.id);
      toast.success("Appointment deleted");
      onDeleted();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not delete the appointment";
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open && !deleting) {
      setError(null);
      onClose();
    }
  }

  return (
    <Dialog open={appointment !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>Delete appointment?</DialogTitle>
        <DialogDescription>
          This permanently removes the appointment for{" "}
          <strong className="text-slate-900">{appointment?.patient_name}</strong> with{" "}
          {appointment?.doctor} on {appointment && formatDateTime(appointment.appointment_datetime)}.
          This cannot be undone.
        </DialogDescription>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
