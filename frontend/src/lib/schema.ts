import { z } from "zod";
import { APPOINTMENT_STATUSES, APPOINTMENT_TYPES } from "./types";

/** Client-side validation for usability only; the backend remains the source of truth. */
export const appointmentFormSchema = z.object({
  patient_name: z
    .string()
    .trim()
    .min(1, "Patient name is required")
    .max(100, "Patient name must be 100 characters or fewer"),
  appointment_datetime: z
    .string()
    .min(1, "Date and time are required")
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Enter a valid date and time"),
  doctor: z
    .string()
    .trim()
    .min(1, "Doctor is required")
    .max(100, "Doctor must be 100 characters or fewer"),
  appointment_type: z.enum(APPOINTMENT_TYPES, { message: "Select an appointment type" }),
  status: z.enum(APPOINTMENT_STATUSES, { message: "Select a status" }),
});

export type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;
