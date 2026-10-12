import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DATE_TIME = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Formats a clinic-local ISO string ("2030-05-01T10:30:00"). The string has no offset, so
 * `new Date()` reads it as local wall-clock time and no timezone shift occurs.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DATE_TIME.format(date);
}

/** "2030-05-01T10:30:00" -> "2030-05-01T10:30" for <input type="datetime-local">. */
export function toInputValue(iso: string): string {
  return iso.slice(0, 16);
}
