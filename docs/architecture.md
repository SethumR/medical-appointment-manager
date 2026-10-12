# System Architecture & Technical Design

## 1. Overview
The **Medical Appointment Manager** is a full-stack web application designed to manage clinic appointments reliably. It uses a decoupled client-server architecture with a Next.js frontend and a FastAPI backend persisting to a local SQLite database.

```text
┌────────────────────────┐         HTTP / JSON         ┌────────────────────────┐
│  Next.js (App Router)  │ ──────────────────────────> │   FastAPI Backend      │
│  - React 19            │ <────────────────────────── │   - Pydantic v2        │
│  - Tailwind CSS        │      CORS: localhost:3000   │   - SQLAlchemy 2.0     │
│  - Zod / Hook Form     │                             │   - SQLite (/data)     │
└────────────────────────┘                             └────────────────────────┘
```

---

## 2. Backend Architecture (`/backend`)

The backend is structured into clear, decoupled layers:

```text
backend/app/
├── core/config.py              # Environment configuration & defaults
├── db/
│   ├── base.py                 # SQLAlchemy DeclarativeBase
│   └── session.py              # Database engine & scoped session management
├── models/
│   └── appointment.py          # SQLAlchemy ORM model definition
├── schemas/
│   └── appointment.py          # Pydantic v2 validation & response schemas
├── api/routes/
│   └── appointments.py         # HTTP endpoints & status code mapping
├── services/
│   └── appointment_service.py  # Domain business logic & conflict detection
└── main.py                     # FastAPI application entrypoint & middleware
```

### Layer Responsibilities
- **API Router (`app/api/routes/`)**: Exclusively handles HTTP request parsing, status codes (200, 201, 204, 400, 404, 409, 422), query parameters, and serialization. Business exceptions raised by the service layer are mapped to standard HTTP responses.
- **Service Layer (`app/services/`)**: Enforces business invariants, domain validation, database transaction lifecycle, and appointment conflict resolution.
- **ORM Models (`app/models/`)**: Represents tabular data in SQLite using SQLAlchemy 2.0 type-annotated mapped columns.
- **Pydantic Schemas (`app/schemas/`)**: Enforces contract schemas, whitespace trimming, string bounds, and ISO 8601 local datetime formatting.

---

## 3. Scheduling Conflict Detection Logic

To prevent double-booking a physician, a conflict detection rule is enforced at the service layer:

1. **Fixed Slot Duration**: Appointments occupy a configurable slot of **60 minutes** (`settings.appointment_duration_minutes`).
2. **Active vs. Inactive Appointments**:
   - `Scheduled` and `Confirmed` are **Active** appointments. They occupy physician time slots.
   - `Cancelled` and `Completed` appointments are **Inactive**. They immediately release the physician's slot so new bookings can be scheduled at that time.
3. **Interval Overlap Mathematical Rule**:
   Two appointments for the same doctor with start times $t_1$ and $t_2$ and duration $d = 60\text{ min}$ conflict if:
   $$|t_1 - t_2| < d \iff t_1 - d < t_2 < t_1 + d$$
   Adjacent appointments (e.g. 09:00–10:00 and 10:00–11:00) do **not** conflict.
4. **Self-Exclusion on Updates**:
   When editing an existing appointment, the record's own primary key (`id`) is excluded from the overlap query so saving other fields does not trigger a false conflict.
5. **Conflict Response**:
   Overlapping requests trigger an HTTP `409 Conflict` containing a clear human-readable error specifying the doctor and conflicting slot.

---

## 4. Frontend Architecture (`/frontend`)

The frontend is built with Next.js (App Router) and structured for clean separation of concerns:

```text
frontend/src/
├── app/
│   ├── layout.tsx              # Root HTML layout & font configuration
│   ├── globals.css             # Tailwind v4 styles & design tokens
│   ├── page.tsx                # Dashboard with summary cards & appointments table
│   └── appointments/
│       ├── new/page.tsx        # Create appointment page
│       └── [id]/edit/page.tsx  # Edit appointment page with not-found state
├── components/
│   ├── layout/app-shell.tsx    # Sidebar navigation & branding
│   ├── dashboard/summary-cards.tsx # Statistics cards
│   ├── appointments/           # Table, filters bar, form, delete modal, badge
│   └── ui/                     # Accessible primitives (Button, Input, Select, Dialog)
├── hooks/
│   └── use-debounced-value.ts  # Input debounce hook for search queries
└── lib/
    ├── api.ts                  # Typed client with fetch, query string builder, error mapper
    ├── schema.ts               # Zod validation schema
    ├── types.ts                # TypeScript interfaces & enums
    └── utils.ts                # Formatting helpers (date-time, cn)
```

### State Management & Data Fetching
- Client-side data fetching directly consumes the FastAPI endpoints via a lightweight, typed API client (`lib/api.ts`).
- Server error payloads (like HTTP 422 field errors and HTTP 409 conflict messages) are mapped to React Hook Form field errors and Sonner toast alerts.
- Filter criteria are synchronized with debounced text search (300ms) to prevent unnecessary API requests.

---

## 5. Security & Privacy Considerations
- **Fictional Data Only**: All demo, seed, and test data use entirely fictional patient and doctor personas.
- **Local Time Handling**: Wall-clock datetime values are stored without timezone offsets to avoid silent shifting across local environments.
- **CORS Protection**: FastAPI restricts CORS origins to the configured frontend URL (`http://localhost:3000`).
- **Sanitized Logging**: Exception handlers avoid logging raw payloads that could leak patient names into system logfiles.
