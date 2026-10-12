from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.appointment import AppointmentStatus, AppointmentType
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentPage,
    AppointmentRead,
    AppointmentSummary,
    AppointmentUpdate,
    ErrorResponse,
)
from app.services.appointment_service import (
    AppointmentNotFoundError,
    AppointmentService,
    InvalidAppointmentError,
    ListParams,
    SchedulingConflictError,
)

router = APIRouter(prefix="/appointments", tags=["appointments"])

ERRORS = {
    400: {"model": ErrorResponse, "description": "Business rule violated"},
    404: {"model": ErrorResponse, "description": "Appointment not found"},
    409: {"model": ErrorResponse, "description": "Scheduling conflict"},
}


def get_service(db: Annotated[Session, Depends(get_db)]) -> AppointmentService:
    return AppointmentService(db)


Service = Annotated[AppointmentService, Depends(get_service)]


def _http_error(exc: Exception) -> HTTPException:
    """Map domain errors to HTTP responses, keeping handlers thin."""
    if isinstance(exc, AppointmentNotFoundError):
        return HTTPException(status.HTTP_404_NOT_FOUND, str(exc))
    if isinstance(exc, SchedulingConflictError):
        return HTTPException(status.HTTP_409_CONFLICT, str(exc))
    if isinstance(exc, InvalidAppointmentError):
        return HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    raise exc


@router.get("", response_model=AppointmentPage)
def list_appointments(
    service: Service,
    search: Annotated[
        str | None, Query(max_length=100, description="Patient or doctor name")
    ] = None,
    status_: Annotated[AppointmentStatus | None, Query(alias="status")] = None,
    appointment_type: AppointmentType | None = None,
    doctor: Annotated[str | None, Query(max_length=100)] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort_by: Literal[
        "appointment_datetime", "patient_name", "doctor", "status", "created_at"
    ] = "appointment_datetime",
    sort_order: Literal["asc", "desc"] = "asc",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> AppointmentPage:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, "date_from must not be after date_to")
    items, total = service.list_appointments(
        ListParams(
            search=search,
            status=status_.value if status_ else None,
            appointment_type=appointment_type.value if appointment_type else None,
            doctor=doctor,
            date_from=date_from,
            date_to=date_to,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )
    )
    return AppointmentPage(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=service.pages(total, page_size),
    )


@router.get("/summary", response_model=AppointmentSummary)
def appointment_summary(service: Service) -> AppointmentSummary:
    return service.summary()


@router.get("/doctors", response_model=list[str])
def list_doctors(service: Service) -> list[str]:
    return service.doctors()


@router.post("", response_model=AppointmentRead, status_code=201, responses=ERRORS)
def create_appointment(data: AppointmentCreate, service: Service):
    try:
        return service.create(data)
    except (SchedulingConflictError, InvalidAppointmentError) as exc:
        raise _http_error(exc) from exc


@router.get("/{appointment_id}", response_model=AppointmentRead, responses=ERRORS)
def get_appointment(appointment_id: int, service: Service):
    try:
        return service.get(appointment_id)
    except AppointmentNotFoundError as exc:
        raise _http_error(exc) from exc


@router.put("/{appointment_id}", response_model=AppointmentRead, responses=ERRORS)
def update_appointment(appointment_id: int, data: AppointmentUpdate, service: Service):
    try:
        return service.update(appointment_id, data)
    except (AppointmentNotFoundError, SchedulingConflictError, InvalidAppointmentError) as exc:
        raise _http_error(exc) from exc


@router.delete("/{appointment_id}", status_code=204, responses=ERRORS)
def delete_appointment(appointment_id: int, service: Service) -> Response:
    try:
        service.delete(appointment_id)
    except AppointmentNotFoundError as exc:
        raise _http_error(exc) from exc
    return Response(status_code=204)
