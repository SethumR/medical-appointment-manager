import math
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Literal

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.appointment import ACTIVE_STATUSES, Appointment, AppointmentStatus
from app.schemas.appointment import AppointmentCreate, AppointmentSummary, AppointmentUpdate

ACTIVE_VALUES = [s.value for s in ACTIVE_STATUSES]

SORTABLE = {
    "appointment_datetime": Appointment.appointment_datetime,
    "patient_name": func.lower(Appointment.patient_name),
    "doctor": func.lower(Appointment.doctor),
    "status": Appointment.status,
    "created_at": Appointment.created_at,
}


class AppointmentNotFoundError(Exception):
    pass


class SchedulingConflictError(Exception):
    pass


class InvalidAppointmentError(Exception):
    """A well-formed request that violates a business rule (HTTP 400)."""


def _now() -> datetime:
    return datetime.now()


@dataclass
class ListParams:
    search: str | None = None
    status: str | None = None
    appointment_type: str | None = None
    doctor: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    sort_by: str = "appointment_datetime"
    sort_order: Literal["asc", "desc"] = "asc"
    page: int = 1
    page_size: int = 10


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class AppointmentService:
    def __init__(self, db: Session, now: Callable[[], datetime] = _now) -> None:
        self.db = db
        self._now = now
        self.duration = timedelta(minutes=settings.appointment_duration_minutes)

    # ---- queries -------------------------------------------------------
    def get(self, appointment_id: int) -> Appointment:
        appointment = self.db.get(Appointment, appointment_id)
        if appointment is None:
            raise AppointmentNotFoundError(f"Appointment {appointment_id} not found")
        return appointment

    def list_appointments(self, params: ListParams) -> tuple[list[Appointment], int]:
        stmt = select(Appointment)
        if params.search:
            like = f"%{_escape_like(params.search.strip().lower())}%"
            stmt = stmt.where(
                or_(
                    func.lower(Appointment.patient_name).like(like, escape="\\"),
                    func.lower(Appointment.doctor).like(like, escape="\\"),
                )
            )
        if params.status:
            stmt = stmt.where(Appointment.status == params.status)
        if params.appointment_type:
            stmt = stmt.where(Appointment.appointment_type == params.appointment_type)
        if params.doctor:
            stmt = stmt.where(func.lower(Appointment.doctor) == params.doctor.strip().lower())
        if params.date_from:
            stmt = stmt.where(
                Appointment.appointment_datetime >= datetime.combine(params.date_from, time.min)
            )
        if params.date_to:
            # Inclusive end date: everything before midnight of the following day.
            end = datetime.combine(params.date_to + timedelta(days=1), time.min)
            stmt = stmt.where(Appointment.appointment_datetime < end)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        column = SORTABLE[params.sort_by]
        order = column.desc() if params.sort_order == "desc" else column.asc()
        # id as tie-breaker keeps pagination stable.
        stmt = stmt.order_by(order, Appointment.id.asc())
        stmt = stmt.offset((params.page - 1) * params.page_size).limit(params.page_size)
        return list(self.db.scalars(stmt)), total

    def pages(self, total: int, page_size: int) -> int:
        return max(1, math.ceil(total / page_size))

    def summary(self) -> AppointmentSummary:
        rows = dict(
            self.db.execute(
                select(Appointment.status, func.count()).group_by(Appointment.status)
            ).all()
        )
        count = lambda s: rows.get(s.value, 0)  # noqa: E731
        return AppointmentSummary(
            total=sum(rows.values()),
            scheduled=count(AppointmentStatus.SCHEDULED),
            confirmed=count(AppointmentStatus.CONFIRMED),
            completed=count(AppointmentStatus.COMPLETED),
            cancelled=count(AppointmentStatus.CANCELLED),
        )

    def doctors(self) -> list[str]:
        return list(
            self.db.scalars(select(Appointment.doctor).distinct().order_by(Appointment.doctor))
        )

    # ---- commands ------------------------------------------------------
    def create(self, data: AppointmentCreate) -> Appointment:
        self._ensure_not_in_past(data.appointment_datetime, data.status.value)
        self._ensure_no_conflict(data.doctor, data.appointment_datetime, data.status.value, None)
        appointment = Appointment(**self._fields(data))
        self.db.add(appointment)
        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def update(self, appointment_id: int, data: AppointmentUpdate) -> Appointment:
        appointment = self.get(appointment_id)
        # A past appointment may be edited (e.g. marked Completed) as long as its time is unchanged.
        if data.appointment_datetime != appointment.appointment_datetime:
            self._ensure_not_in_past(data.appointment_datetime, data.status.value)
        self._ensure_no_conflict(
            data.doctor, data.appointment_datetime, data.status.value, appointment_id
        )
        for key, value in self._fields(data).items():
            setattr(appointment, key, value)
        self.db.commit()
        self.db.refresh(appointment)
        return appointment

    def delete(self, appointment_id: int) -> None:
        self.db.delete(self.get(appointment_id))
        self.db.commit()

    # ---- rules ---------------------------------------------------------
    @staticmethod
    def _fields(data: AppointmentCreate | AppointmentUpdate) -> dict:
        return {
            "patient_name": data.patient_name,
            "appointment_datetime": data.appointment_datetime,
            "doctor": data.doctor,
            "appointment_type": data.appointment_type.value,
            "status": data.status.value,
        }

    def _ensure_not_in_past(self, when: datetime, status: str) -> None:
        # Only bookings that still occupy a slot must be in the future; history may be recorded.
        if status in ACTIVE_VALUES and when < self._now():
            raise InvalidAppointmentError(
                "Scheduled or Confirmed appointments cannot be set in the past"
            )

    def _ensure_no_conflict(
        self, doctor: str, when: datetime, status: str, exclude_id: int | None
    ) -> None:
        if status not in ACTIVE_VALUES:
            return
        # Slots [s, s+d) overlap iff the other start lies strictly within (s-d, s+d).
        stmt = select(func.count()).where(
            func.lower(Appointment.doctor) == doctor.strip().lower(),
            Appointment.status.in_(ACTIVE_VALUES),
            Appointment.appointment_datetime > when - self.duration,
            Appointment.appointment_datetime < when + self.duration,
        )
        if exclude_id is not None:
            stmt = stmt.where(Appointment.id != exclude_id)
        if self.db.scalar(stmt):
            raise SchedulingConflictError(
                f"{doctor} already has an appointment that overlaps "
                f"{when:%Y-%m-%d %H:%M} (appointments last "
                f"{settings.appointment_duration_minutes} minutes)"
            )
