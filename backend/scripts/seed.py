"""Optional, repeatable loader for FICTIONAL demo appointments.

Usage (from backend/):  python -m scripts.seed
Safe to re-run: records already present (same patient, doctor and time) are skipped.
"""

from datetime import datetime, timedelta

from sqlalchemy import select

from app.db.session import SessionLocal, init_db
from app.models.appointment import Appointment
from app.models.appointment import AppointmentStatus as S
from app.models.appointment import AppointmentType as T

# (patient, doctor, day offset from today, hour, minute, type, status) - all fictional.
DEMO = [
    ("Alex Morgan", "Dr. Emily Carter", 1, 9, 0, T.GENERAL, S.SCHEDULED),
    ("Jamie Taylor", "Dr. Daniel Reed", 1, 10, 30, T.FOLLOW_UP, S.CONFIRMED),
    ("Casey Bennett", "Dr. Sophia Brooks", 2, 14, 0, T.DENTAL, S.SCHEDULED),
    ("Jordan Ellis", "Dr. Emily Carter", 3, 11, 0, T.SPECIALIST, S.CONFIRMED),
    ("Riley Parker", "Dr. Daniel Reed", -2, 15, 0, T.GENERAL, S.COMPLETED),
    ("Alex Morgan", "Dr. Sophia Brooks", -5, 9, 30, T.FOLLOW_UP, S.COMPLETED),
    ("Casey Bennett", "Dr. Emily Carter", -1, 13, 0, T.OTHER, S.CANCELLED),
    ("Jamie Taylor", "Dr. Sophia Brooks", 5, 16, 0, T.DENTAL, S.SCHEDULED),
]


def seed() -> int:
    init_db()
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    added = 0
    with SessionLocal() as db:
        for patient, doctor, offset, hour, minute, kind, status in DEMO:
            when = today + timedelta(days=offset, hours=hour, minutes=minute)
            exists = db.scalar(
                select(Appointment.id).where(
                    Appointment.patient_name == patient,
                    Appointment.doctor == doctor,
                    Appointment.appointment_datetime == when,
                )
            )
            if exists:
                continue
            db.add(
                Appointment(
                    patient_name=patient,
                    appointment_datetime=when,
                    doctor=doctor,
                    appointment_type=kind.value,
                    status=status.value,
                )
            )
            added += 1
        db.commit()
    return added


if __name__ == "__main__":
    print(f"Added {seed()} fictional demo appointment(s).")
