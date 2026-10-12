import { expect, test, type Page } from "@playwright/test";

// All data below is fictional. Far-future dates keep the "no past bookings" rule satisfied.

async function createAppointment(
  page: Page,
  a: { patient: string; doctor: string; when: string; type?: string; status?: string },
) {
  await page.goto("/appointments/new");
  await page.getByLabel(/patient name/i).fill(a.patient);
  await page.getByLabel(/^doctor/i).fill(a.doctor);
  await page.getByLabel(/date and time/i).fill(a.when);
  if (a.type) await page.getByLabel(/appointment type/i).selectOption(a.type);
  if (a.status) await page.getByLabel(/^status/i).selectOption(a.status);
  await page.getByRole("button", { name: "Create appointment" }).click();
}

test("full workflow: create, search, edit, delete", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Appointments" })).toBeVisible();

  // Create
  await page.getByRole("main").getByRole("link", { name: "New Appointment" }).first().click();
  await expect(page).toHaveURL(/\/appointments\/new$/);
  await page.getByRole("button", { name: "Create appointment" }).click();
  await expect(page.getByText("Patient name is required")).toBeVisible();

  await page.getByLabel(/patient name/i).fill("Morgan Hale");
  await page.getByLabel(/^doctor/i).fill("Dr. Emily Carter");
  await page.getByLabel(/date and time/i).fill("2099-06-01T10:00");
  await page.getByRole("button", { name: "Create appointment" }).click();

  // Back on the list, with the new appointment visible
  await expect(page).toHaveURL(/\/$/);
  const row = page.getByRole("row", { name: /Morgan Hale/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Dr. Emily Carter");
  await expect(row).toContainText("Scheduled");

  // Search: matches, then does not match
  const search = page.getByLabel("Search patient or doctor");
  await search.fill("nobody-by-this-name");
  await expect(page.getByText("No appointments match your filters")).toBeVisible();
  await search.fill("morgan");
  await expect(row).toBeVisible();
  await page.getByLabel("Status").selectOption("Cancelled");
  await expect(page.getByText("No appointments match your filters")).toBeVisible();
  await page.getByRole("button", { name: /clear filters/i }).first().click();
  await expect(row).toBeVisible();

  // Edit
  await page.getByRole("link", { name: "Edit appointment for Morgan Hale" }).click();
  await expect(page.getByLabel(/patient name/i)).toHaveValue("Morgan Hale");
  await page.getByLabel(/patient name/i).fill("Morgan Hale-Reyes");
  await page.getByLabel(/^status/i).selectOption("Confirmed");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page).toHaveURL(/\/$/);
  const edited = page.getByRole("row", { name: /Morgan Hale-Reyes/ });
  await expect(edited).toContainText("Confirmed");
  await expect(page.getByRole("row", { name: /Morgan Hale\s/ })).toHaveCount(0);

  // Delete: cancelling keeps it, confirming removes it
  await page.getByRole("button", { name: "Delete appointment for Morgan Hale-Reyes" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Morgan Hale-Reyes");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(edited).toBeVisible();

  await page.getByRole("button", { name: "Delete appointment for Morgan Hale-Reyes" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("row", { name: /Morgan Hale-Reyes/ })).toHaveCount(0);
});

test("scheduling conflict is shown and nothing is saved", async ({ page }) => {
  await createAppointment(page, {
    patient: "Taylor Quinn",
    doctor: "Dr. Daniel Reed",
    when: "2099-07-01T09:00",
  });
  await expect(page.getByRole("row", { name: /Taylor Quinn/ })).toBeVisible();

  // Overlaps (09:30 within the 09:00-10:00 slot) for the same doctor
  await createAppointment(page, {
    patient: "Sam Rivers",
    doctor: "Dr. Daniel Reed",
    when: "2099-07-01T09:30",
  });
  await expect(page.getByRole("alert").filter({ hasText: /already has an appointment/ }).first()).toBeVisible();
  await expect(page).toHaveURL(/\/appointments\/new$/);

  // Back-to-back (10:00) is allowed
  await page.getByLabel(/date and time/i).fill("2099-07-01T10:00");
  await page.getByRole("button", { name: "Create appointment" }).click();
  await expect(page.getByRole("row", { name: /Sam Rivers/ })).toBeVisible();
});

test("unknown appointment id shows a not-found state", async ({ page }) => {
  await page.goto("/appointments/999999/edit");
  await expect(page.getByRole("heading", { name: "Appointment not found" })).toBeVisible();
});
