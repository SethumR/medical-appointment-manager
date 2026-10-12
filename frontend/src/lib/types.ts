export const APPOINTMENT_TYPES = [
  "General Consultation",
  "Follow-up",
  "Dental",
  "Specialist Consultation",
  "Other",
] as const;

export const APPOINTMENT_STATUSES = ["Scheduled", "Confirmed", "Completed", "Cancelled"] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Form/request payload. `appointment_datetime` is clinic-local, e.g. "2030-05-01T10:30". */
export interface AppointmentInput {
  patient_name: string;
  appointment_datetime: string;
  doctor: string;
  appointment_type: AppointmentType;
  status: AppointmentStatus;
}

export interface Appointment extends AppointmentInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentPage {
  items: Appointment[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface AppointmentSummary {
  total: number;
  scheduled: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export interface AppointmentFilters {
  search: string;
  status: AppointmentStatus | "";
  appointment_type: AppointmentType | "";
  doctor: string;
  date_from: string;
  date_to: string;
}

export const EMPTY_FILTERS: AppointmentFilters = {
  search: "",
  status: "",
  appointment_type: "",
  doctor: "",
  date_from: "",
  date_to: "",
};
