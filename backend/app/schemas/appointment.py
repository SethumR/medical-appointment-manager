from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.models.appointment import AppointmentStatus, AppointmentType

PatientName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
DoctorName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class AppointmentBase(BaseModel):
    patient_name: PatientName
    appointment_datetime: datetime = Field(
        description="Clinic-local wall-clock time, ISO 8601 without timezone, e.g. 2030-05-01T10:30"
    )
    doctor: DoctorName
    appointment_type: AppointmentType
    status: AppointmentStatus

    @field_validator("appointment_datetime")
    @classmethod
    def reject_timezone(cls, value: datetime) -> datetime:
        # Times are stored exactly as entered; accepting offsets would force a silent conversion.
        if value.tzinfo is not None:
            raise ValueError("Use clinic-local time without a timezone offset")
        return value


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(AppointmentBase):
    pass


class AppointmentRead(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AppointmentPage(BaseModel):
    items: list[AppointmentRead]
    total: int
    page: int
    page_size: int
    pages: int


class AppointmentSummary(BaseModel):
    """Counts across ALL appointments, independent of any list filters."""

    total: int
    scheduled: int
    confirmed: int
    completed: int
    cancelled: int


class ErrorResponse(BaseModel):
    detail: str
