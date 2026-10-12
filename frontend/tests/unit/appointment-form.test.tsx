import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { ApiError } from "@/lib/api";

const push = vi.fn();
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));
vi.mock("sonner", () => ({ toast }));

function fillValid() {
  fireEvent.change(screen.getByLabelText(/patient name/i), { target: { value: "Alex Morgan" } });
  fireEvent.change(screen.getByLabelText(/^doctor/i), { target: { value: "Dr. Emily Carter" } });
  fireEvent.change(screen.getByLabelText(/date and time/i), {
    target: { value: "2099-06-01T10:00" },
  });
}

function renderForm(onSubmit = vi.fn().mockResolvedValue({})) {
  render(
    <AppointmentForm submitLabel="Save" successMessage="Saved!" onSubmit={onSubmit} />,
  );
  return onSubmit;
}

beforeEach(() => vi.clearAllMocks());

describe("AppointmentForm", () => {
  it("shows required-field errors and does not submit empty data", async () => {
    const onSubmit = renderForm();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Patient name is required")).toBeInTheDocument();
    expect(screen.getByText("Doctor is required")).toBeInTheDocument();
    expect(screen.getByText("Date and time are required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only names", async () => {
    const onSubmit = renderForm();
    fillValid();
    fireEvent.change(screen.getByLabelText(/patient name/i), { target: { value: "   " } });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Patient name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits trimmed valid data, then shows success and navigates home", async () => {
    const onSubmit = renderForm();
    fillValid();
    fireEvent.change(screen.getByLabelText(/patient name/i), {
      target: { value: "  Alex Morgan  " },
    });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ patient_name: "Alex Morgan", status: "Scheduled" }),
    );
    expect(toast.success).toHaveBeenCalledWith("Saved!");
  });

  it("displays a scheduling conflict from the API and does not report success", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(409, "Dr. Emily Carter already has an overlapping appointment"));
    renderForm(onSubmit);
    fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/already has an overlapping appointment/)).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("maps backend field errors next to the right field", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(new ApiError(422, "Please correct the highlighted fields.", { doctor: "Backend says no" }));
    renderForm(onSubmit);
    fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Backend says no")).toBeInTheDocument();
    expect(screen.getByLabelText(/^doctor/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("prevents repeated submissions while a request is in progress", async () => {
    let resolve!: () => void;
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((r) => (resolve = r)));
    renderForm(onSubmit);
    fillValid();

    const button = screen.getByRole("button", { name: "Save" });
    await userEvent.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled());
    await userEvent.click(screen.getByRole("button", { name: /saving/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
