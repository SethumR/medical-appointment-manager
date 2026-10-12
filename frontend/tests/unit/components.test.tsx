import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppointmentTable } from "@/components/appointments/appointment-table";
import { DeleteDialog } from "@/components/appointments/delete-dialog";
import { FiltersBar } from "@/components/appointments/filters-bar";
import { api, buildQuery } from "@/lib/api";
import { EMPTY_FILTERS, type Appointment } from "@/lib/types";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const appointment: Appointment = {
  id: 7,
  patient_name: "Jamie Taylor",
  appointment_datetime: "2099-06-01T10:30:00",
  doctor: "Dr. Daniel Reed",
  appointment_type: "Follow-up",
  status: "Confirmed",
  created_at: "2099-01-01T00:00:00",
  updated_at: "2099-01-01T00:00:00",
};

beforeEach(() => vi.restoreAllMocks());

describe("AppointmentTable", () => {
  it("displays appointments with edit link and delete action", async () => {
    const onDelete = vi.fn();
    render(<AppointmentTable items={[appointment]} onDelete={onDelete} />);

    expect(screen.getByText("Jamie Taylor")).toBeInTheDocument();
    expect(screen.getByText("Dr. Daniel Reed")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /edit appointment for jamie taylor/i })).toHaveAttribute(
      "href",
      "/appointments/7/edit",
    );
    await userEvent.click(screen.getByRole("button", { name: /delete appointment for jamie taylor/i }));
    expect(onDelete).toHaveBeenCalledWith(appointment);
  });
});

describe("FiltersBar", () => {
  it("reports search and filter changes, merged with existing filters", async () => {
    const onChange = vi.fn();
    render(
      <FiltersBar
        filters={{ ...EMPTY_FILTERS, search: "reed" }}
        doctors={["Dr. Daniel Reed"]}
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText("Status"), "Confirmed");
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, search: "reed", status: "Confirmed" });
  });

  it("clears all filters, and is disabled when nothing is set", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<FiltersBar filters={EMPTY_FILTERS} doctors={[]} onChange={onChange} />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeDisabled();

    rerender(
      <FiltersBar filters={{ ...EMPTY_FILTERS, status: "Cancelled" }} doctors={[]} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});

describe("buildQuery", () => {
  it("omits empty filters and combines active ones", () => {
    const query = buildQuery({
      ...EMPTY_FILTERS,
      search: "emily",
      status: "Confirmed",
      page: 1,
      page_size: 10,
    });
    expect(query).toBe("search=emily&status=Confirmed&page=1&page_size=10");
  });
});

describe("DeleteDialog", () => {
  it("names the appointment and deletes only after confirmation", async () => {
    const remove = vi.spyOn(api, "remove").mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    render(<DeleteDialog appointment={appointment} onClose={vi.fn()} onDeleted={onDeleted} />);

    expect(screen.getByText("Jamie Taylor")).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(remove).toHaveBeenCalledWith(7);
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Appointment deleted");
  });

  it("leaves the record untouched when cancelled", async () => {
    const remove = vi.spyOn(api, "remove").mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<DeleteDialog appointment={appointment} onClose={onClose} onDeleted={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("shows an error and does not report success when deletion fails", async () => {
    vi.spyOn(api, "remove").mockRejectedValue(new Error("Appointment 7 not found"));
    const onDeleted = vi.fn();
    render(<DeleteDialog appointment={appointment} onClose={vi.fn()} onDeleted={onDeleted} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Appointment 7 not found");
    expect(onDeleted).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
