import { defineConfig, devices } from "@playwright/test";

// E2E runs against its OWN backend (port 8100) and database (backend/data/e2e.db) and its own
// frontend (port 3100), so the development database is never touched.
const BACKEND = "http://localhost:8100";
const FRONTEND = "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: FRONTEND, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command:
        "rm -f data/e2e.db && .venv/bin/python -m uvicorn app.main:app --port 8100",
      cwd: "../backend",
      url: `${BACKEND}/health`,
      env: {
        DATABASE_URL: "sqlite:///./data/e2e.db",
        FRONTEND_ORIGIN: FRONTEND,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "npm run dev -- --port 3100",
      url: FRONTEND,
      env: { NEXT_PUBLIC_API_URL: BACKEND },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
