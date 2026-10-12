# MediSchedule — Medical Appointment Manager

A professional, full-stack web application for scheduling, managing, searching, and filtering clinic appointments. Built with **FastAPI**, **SQLAlchemy 2.0**, **SQLite**, **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

> **Note**: This application is a technical assessment demonstration. It uses **fictional data only** and is not intended for clinical use.

---

## Features

- **Full Appointment Lifecycle (CRUD)**: Create, view, edit, and delete appointments with real-time UI updates.
- **Scheduling Conflict Detection**: Enforces 60-minute doctor time slot reservations on the backend, returning HTTP 409 if overlapping bookings are attempted.
- **Search & Multi-Criteria Filtering**: Filter by doctor, status, appointment type, and inclusive date ranges, combined with debounced text search.
- **Summary Metrics**: Real-time summary cards tracking Total, Scheduled, Confirmed, and Completed appointments.
- **Deletion Confirmation**: Accessible modal requiring explicit confirmation before permanent record removal.
- **Client & Server Validation**: Clean error feedback via inline field error alerts and toast notifications.
- **Automated Test Coverage**: 58 backend tests (`pytest`) and 13 frontend tests (`vitest`), plus configured Playwright E2E suites.
- **Repeatable Fictional Demo Data**: Seed script to populate demo appointments without creating duplicates.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, React Hook Form, Zod, Sonner, Lucide Icons |
| **Backend** | Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2, SQLite, Uvicorn |
| **Testing** | Pytest, HTTPX, Vitest, React Testing Library, Playwright |

---

## Project Structure

```text
medical-appointment-manager/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # REST endpoints
│   │   ├── core/config.py       # App settings & environment defaults
│   │   ├── db/                  # SQLite engine & session management
│   │   ├── models/              # SQLAlchemy 2.0 ORM models
│   │   ├── schemas/             # Pydantic v2 validation contracts
│   │   └── services/            # Business rules & conflict logic
│   ├── data/                    # SQLite database storage (gitignored)
│   ├── scripts/seed.py          # Repeatable demo data seeder
│   └── tests/                   # 58 pytest unit & API tests
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/          # Reusable UI & appointment components
│   │   ├── hooks/               # Custom React hooks (debounce)
│   │   └── lib/                 # API client, Zod schemas, TypeScript types
│   └── tests/                   # Unit & E2E tests
├── docs/
│   ├── architecture.md          # Detailed architectural design & conflict rules
│   ├── testing.md               # Test coverage matrix & instructions
│   └── ai-development-log.md    # Real log of AI use, code reviews & fixes
└── README.md
```

---

## Quickstart Guide

### Prerequisites
- **Python 3.12+**
- **Node.js 20+** (Tested on Node v24) and **npm**

---

### 1. Backend Setup

1. Open a terminal in the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. *(Optional)* Populate fictional demo data:
   ```bash
   python -m scripts.seed
   ```
5. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   The backend API will be running at [http://localhost:8000](http://localhost:8000).  
   Interactive API documentation (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Frontend Setup

1. In a separate terminal, navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Automated Tests

### Backend Tests (58 tests)
```bash
cd backend
.venv/bin/pytest -v
```

### Frontend Unit & Component Tests (13 tests)
```bash
cd frontend
npm run test
```

### Frontend Typecheck & Linting
```bash
cd frontend
npm run typecheck
npm run lint
```

---

## API Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET` | `/api/v1/appointments` | List appointments (paginated, searchable, filterable) |
| `GET` | `/api/v1/appointments/summary` | Global appointment statistics counts |
| `GET` | `/api/v1/appointments/doctors` | List of active doctors |
| `POST` | `/api/v1/appointments` | Create appointment (validates time conflicts) |
| `GET` | `/api/v1/appointments/{id}` | Get single appointment |
| `PUT` | `/api/v1/appointments/{id}` | Update appointment (preserves `created_at`) |
| `DELETE` | `/api/v1/appointments/{id}` | Delete appointment |

---

## Documentation

Detailed documentation is available in the `docs/` folder:
- [Architecture & Design Decisions](docs/architecture.md): Deep dive into layers, interval overlap arithmetic, and data integrity.
- [Testing Strategy & Report](docs/testing.md): Complete list of test cases across unit, API, and E2E suites.
- [AI Development & Review Log](docs/ai-development-log.md): Record of code review, caught defects (e.g. method shadowing, React 19 ESLint cascading render rules, peer dependency resolution), and lessons learned.
