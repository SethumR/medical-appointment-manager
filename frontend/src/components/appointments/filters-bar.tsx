"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  EMPTY_FILTERS,
  type AppointmentFilters,
} from "@/lib/types";

interface Props {
  filters: AppointmentFilters;
  doctors: string[];
  onChange: (filters: AppointmentFilters) => void;
}

function Labelled({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export function FiltersBar({ filters, doctors, onChange }: Props) {
  const set = <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const isDirty = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <form
      role="search"
      aria-label="Search and filter appointments"
      onSubmit={(e) => e.preventDefault()}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="sm:col-span-2 lg:col-span-2">
          <Labelled id="filter-search" label="Search patient or doctor">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <Input
                id="filter-search"
                type="search"
                placeholder="e.g. Alex or Dr. Carter"
                className="pl-9"
                value={filters.search}
                onChange={(e) => set("search", e.target.value)}
              />
            </div>
          </Labelled>
        </div>
        <Labelled id="filter-status" label="Status">
          <Select
            id="filter-status"
            value={filters.status}
            onChange={(e) => set("status", e.target.value as AppointmentFilters["status"])}
          >
            <option value="">All statuses</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Labelled>
        <Labelled id="filter-type" label="Type">
          <Select
            id="filter-type"
            value={filters.appointment_type}
            onChange={(e) =>
              set("appointment_type", e.target.value as AppointmentFilters["appointment_type"])
            }
          >
            <option value="">All types</option>
            {APPOINTMENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Labelled>
        <Labelled id="filter-doctor" label="Doctor">
          <Select
            id="filter-doctor"
            value={filters.doctor}
            onChange={(e) => set("doctor", e.target.value)}
          >
            <option value="">All doctors</option>
            {doctors.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </Select>
        </Labelled>
        <div className="hidden lg:block" />
        <Labelled id="filter-from" label="From date">
          <Input
            id="filter-from"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={(e) => set("date_from", e.target.value)}
          />
        </Labelled>
        <Labelled id="filter-to" label="To date">
          <Input
            id="filter-to"
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={(e) => set("date_to", e.target.value)}
          />
        </Labelled>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={!isDirty}
            onClick={() => onChange(EMPTY_FILTERS)}
          >
            <X className="h-4 w-4" aria-hidden /> Clear filters
          </Button>
        </div>
      </div>
    </form>
  );
}
