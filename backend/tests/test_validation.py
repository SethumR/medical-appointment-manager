import pytest

from tests.conftest import make_payload

URL = "/api/v1/appointments"


@pytest.mark.parametrize("name", ["", "   "])
def test_blank_patient_name_rejected(client, name):
    assert client.post(URL, json=make_payload(patient_name=name)).status_code == 422


def test_missing_patient_name_rejected(client):
    payload = make_payload()
    del payload["patient_name"]
    assert client.post(URL, json=payload).status_code == 422


def test_blank_doctor_rejected(client):
    assert client.post(URL, json=make_payload(doctor="  ")).status_code == 422


def test_overlong_name_rejected(client):
    assert client.post(URL, json=make_payload(patient_name="x" * 101)).status_code == 422


def test_invalid_status_rejected(client):
    assert client.post(URL, json=make_payload(status="Maybe")).status_code == 422


def test_invalid_type_rejected(client):
    assert client.post(URL, json=make_payload(appointment_type="Surgery")).status_code == 422


@pytest.mark.parametrize("value", ["not-a-date", "2099-13-45T10:00", "", None])
def test_malformed_datetime_rejected(client, value):
    assert client.post(URL, json=make_payload(appointment_datetime=value)).status_code == 422


def test_timezone_offset_rejected(client):
    response = client.post(URL, json=make_payload(appointment_datetime="2099-06-01T10:00:00+05:30"))
    assert response.status_code == 422


def test_past_active_appointment_rejected(client):
    response = client.post(URL, json=make_payload(appointment_datetime="2000-01-01T10:00:00"))
    assert response.status_code == 400


def test_past_completed_appointment_allowed(client):
    response = client.post(
        URL, json=make_payload(appointment_datetime="2000-01-01T10:00:00", status="Completed")
    )
    assert response.status_code == 201


def test_past_appointment_can_be_marked_completed_without_moving(client, create):
    # Insert directly via a completed past record, then edit it keeping the same time.
    created = client.post(
        URL, json=make_payload(appointment_datetime="2000-01-01T10:00:00", status="Completed")
    ).json()
    response = client.put(
        f"{URL}/{created['id']}",
        json=make_payload(appointment_datetime="2000-01-01T10:00:00", status="Cancelled"),
    )
    assert response.status_code == 200


def test_moving_to_the_past_on_update_rejected(client, create):
    created = create()
    response = client.put(
        f"{URL}/{created['id']}", json=make_payload(appointment_datetime="2000-01-01T10:00:00")
    )
    assert response.status_code == 400


@pytest.mark.parametrize(
    "params",
    [
        {"page": 0},
        {"page_size": 0},
        {"page_size": 101},
        {"status": "Bogus"},
        {"appointment_type": "Bogus"},
        {"sort_by": "password"},
        {"sort_order": "sideways"},
        {"date_from": "yesterday"},
        {"date_from": "2099-06-10", "date_to": "2099-06-01"},
    ],
)
def test_invalid_query_params_rejected(client, params):
    assert client.get(URL, params=params).status_code == 422


def test_unhandled_error_hides_details(client, monkeypatch):
    from app.services import appointment_service

    def boom(*_args, **_kwargs):
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr(appointment_service.AppointmentService, "list_appointments", boom)
    response = client.get(URL)
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
