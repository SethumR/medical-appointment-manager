# Automated Testing Strategy & Report

This project implements a multi-tier testing strategy covering unit logic, REST API contracts, UI component behavior, and end-to-end user workflows.

---

## 1. Test Summary

| Tier | Tool | Test Count | Status | Description |
|---|---|:---:|:---:|---|
| **Backend API & Unit** | `pytest` + `httpx` | **58** | Passed | CRUD, query filters, search, conflict detection, input validation |
| **Frontend Unit & Component** | `vitest` + React Testing Library | **13** | Passed | Forms, validation errors, dialogs, filters, table interactions |
| **End-to-End (E2E)** | Playwright (Chromium) | **3** | Configured | End-to-end user journeys (Create -> Search -> Edit -> Delete -> Conflicts) |

---

## 2. Backend Automated Tests (`/backend/tests`)

### Test Architecture
- **Isolated SQLite databases**: Every test runs against a temporary database fixture (`tmp_path`) created fresh per test run to prevent test pollution.
- **Dependency Overrides**: The `get_db` FastAPI dependency is dynamically redirected to the test SQLite instance.

### Test Coverage (`58 passed`)

#### A. CRUD & Query Tests (`tests/test_appointments.py`)
1. Create appointment with whitespace trimmed and default timestamp assigned.
2. List appointments with pagination metadata (`total`, `page`, `page_size`, `pages`).
3. Fetch appointment by ID.
4. Return 404 for nonexistent appointment ID.
5. Update appointment while strictly preserving `created_at`.
6. Return 404 on update and delete of nonexistent records.
7. Delete appointment and verify removal.
8. Case-insensitive search on patient names.
9. Case-insensitive search on doctor names.
10. Escape SQL wildcards (`%`, `_`) in search queries.
11. Filtering by status (`Scheduled`, `Confirmed`, `Completed`, `Cancelled`).
12. Filtering by appointment type (`General Consultation`, `Dental`, etc.).
13. Combined multi-criteria search and filter queries.
14. Date range boundaries (`date_from`, `date_to`) inclusive of full end-day.
15. Multi-page navigation and sort ordering (ascending / descending).
16. Unfiltered system summary counts.

#### B. Validation Tests (`tests/test_validation.py`)
1. Reject blank, whitespace-only, or missing patient names.
2. Reject blank doctor names.
3. Reject strings exceeding length bounds (100 characters).
4. Reject unsupported appointment types and statuses.
5. Reject malformed ISO datetime strings.
6. Reject datetime inputs with timezone offsets (wall-clock guarantee).
7. Reject new bookings scheduled in the past.
8. Allow historical appointments to be created or edited if marked Completed/Cancelled.
9. Reject updates that shift future appointments into the past.
10. Reject invalid query parameters (negative page, page size > 100, invalid sort column).
11. Unhandled server exception sanitization (500 without leaking stack traces).

#### C. Conflict Detection Tests (`tests/test_conflicts.py`)
1. Detect overlapping appointments for the same doctor (e.g. 10:00 vs 10:30).
2. Overlap boundary checks (09:01 and 10:59 conflict with 10:00).
3. Exact adjacent appointments permitted (09:00 and 11:00 permitted alongside 10:00).
4. Overlapping appointments for different doctors permitted.
5. Space- and case-insensitive doctor matching for conflicts.
6. Updating an appointment ignores its own ID during collision detection.
7. Attempting to update an appointment into another appointment's slot fails with 409.
8. Inactive appointments (`Cancelled`, `Completed`) do not occupy slots.
9. Cancelling an appointment immediately frees its slot.
10. Reactivating a cancelled appointment into an occupied slot triggers 409.

### Running Backend Tests
```bash
cd backend
.venv/bin/pytest -v
```

---

## 3. Frontend Unit & Component Tests (`/frontend/tests/unit`)

### Covered Components (`13 passed`)

#### A. Appointment Form (`tests/unit/appointment-form.test.tsx`)
- Required-field validation prevents empty submissions.
- Rejection of whitespace-only names with inline field errors.
- Successful submission with trimmed values and navigation home.
- Catching backend HTTP 409 conflict and displaying it in an alert notification.
- Field-level mapping for HTTP 422 errors next to the corresponding input.
- Debounced submission / disabling save button while request is in flight.

#### B. UI Components & Dialogs (`tests/unit/components.test.tsx`)
- `AppointmentTable`: Renders details, format dates, provides edit links and delete triggers.
- `FiltersBar`: Merges search and status filters; handles clear-filters button state.
- `buildQuery`: Serializes query strings while stripping empty fields.
- `DeleteDialog`: Confirmation dialog displaying appointment details; executes removal only after user confirmation; handles cancellation gracefully; reports errors when deletion fails.

### Running Frontend Unit Tests
```bash
cd frontend
npm run test
```

---

## 4. End-to-End Tests (`/frontend/tests/e2e`)

Playwright is configured with a dedicated testing environment (`playwright.config.ts`) running isolated test instances of FastAPI (port 8100, `data/e2e.db`) and Next.js (port 3100).

### Key Workflow Scenarios:
1. **Full lifecycle**: Visit dashboard $\to$ create appointment $\to$ verify row $\to$ filter & search $\to$ edit details $\to$ verify persistence $\to$ trigger delete dialog $\to$ verify removal.
2. **Conflict Handling**: Schedule appointment at 09:00 $\to$ attempt duplicate booking at 09:30 $\to$ observe HTTP 409 error notification on form $\to$ reschedule to 10:00 $\to$ observe success.
3. **Invalid Route Handling**: Direct navigation to `/appointments/999999/edit` renders the dedicated 404 error page.

### Running E2E Tests
```bash
cd frontend
npm run test:e2e
```
