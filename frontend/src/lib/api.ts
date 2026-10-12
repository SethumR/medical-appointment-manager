import type {
  Appointment,
  AppointmentFilters,
  AppointmentInput,
  AppointmentPage,
  AppointmentSummary,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API = `${BASE_URL}/api/v1/appointments`;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    /** Field-level messages for 422 responses, keyed by field name. */
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ValidationItem {
  loc: (string | number)[];
  msg: string;
}

async function toApiError(res: Response): Promise<ApiError> {
  let body: { detail?: unknown } = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON error body; fall through to generic message
  }
  if (Array.isArray(body.detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const item of body.detail as ValidationItem[]) {
      const field = String(item.loc[item.loc.length - 1]);
      fieldErrors[field] ??= item.msg;
    }
    return new ApiError(res.status, "Please correct the highlighted fields.", fieldErrors);
  }
  const message =
    typeof body.detail === "string" ? body.detail : `Request failed (${res.status})`;
  return new ApiError(res.status, message);
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }
  if (!res.ok) throw await toApiError(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export interface ListQuery extends AppointmentFilters {
  page: number;
  page_size: number;
}

export function buildQuery(query: ListQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== "" && value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export const api = {
  list: (query: ListQuery, signal?: AbortSignal) =>
    request<AppointmentPage>(`${API}?${buildQuery(query)}`, { signal }),
  summary: (signal?: AbortSignal) => request<AppointmentSummary>(`${API}/summary`, { signal }),
  doctors: (signal?: AbortSignal) => request<string[]>(`${API}/doctors`, { signal }),
  get: (id: number, signal?: AbortSignal) => request<Appointment>(`${API}/${id}`, { signal }),
  create: (data: AppointmentInput) =>
    request<Appointment>(API, { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: AppointmentInput) =>
    request<Appointment>(`${API}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`${API}/${id}`, { method: "DELETE" }),
};
