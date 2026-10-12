import enum
from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AppointmentType(enum.StrEnum):
    GENERAL = "General Consultation"
    FOLLOW_UP = "Follow-up"
    DENTAL = "Dental"
    SPECIALIST = "Specialist Consultation"
    OTHER = "Other"


class AppointmentStatus(enum.StrEnum):
    SCHEDULED = "Scheduled"
    CONFIRMED = "Confirmed"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


# Only these statuses occupy a doctor's time slot.
ACTIVE_STATUSES = (AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED)


class Appointment(Base):
    __tablename__ = "appointments"
    __table_args__ = (Index("ix_appointments_doctor_datetime", "doctor", "appointment_datetime"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    patient_name: Mapped[str] = mapped_column(String(100))
    # Naive clinic-local wall-clock time (no timezone conversion anywhere).
    appointment_datetime: Mapped[datetime] = mapped_column(DateTime, index=True)
    doctor: Mapped[str] = mapped_column(String(100))
    appointment_type: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )
