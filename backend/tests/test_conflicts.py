import pytest

from tests.conftest import make_payload

URL = "/api/v1/appointments"


def test_overlapping_appointment_for_same_doctor_conflicts(client, create):
    create(appointment_datetime="2099-06-01T10:00:00")
    response = client.post(URL, json=make_payload(appointment_datetime="2099-06-01T10:30:00"))
    assert response.status_code == 409
    assert "Dr. Emily Carter" in response.json()["detail"]


@pytest.mark.parametrize(
    "time", ["2099-06-01T10:00:00", "2099-06-01T09:01:00", "2099-06-01T10:59:00"]
)
def test_conflict_boundaries_inside(client, create, time):
    create(appointment_datetime="2099-06-01T10:00:00")
    assert client.post(URL, json=make_payload(appointment_datetime=time)).status_code == 409


@pytest.mark.parametrize(
    "time", ["2099-06-01T09:00:00", "2099-06-01T11:00:00", "2099-06-01T14:00:00"]
)
def test_adjacent_and_distant_appointments_allowed(client, create, time):
    create(appointment_datetime="2099-06-01T10:00:00")
    assert client.post(URL, json=make_payload(appointment_datetime=time)).status_code == 201


def test_different_doctors_same_time_allowed(client, create):
    create()
    response = client.post(URL, json=make_payload(doctor="Dr. Daniel Reed"))
    assert response.status_code == 201


def test_doctor_comparison_is_case_and_space_insensitive(client, create):
    create()
    response = client.post(URL, json=make_payload(doctor="  dr. emily carter "))
    assert response.status_code == 409


def test_update_excludes_own_id_from_conflict_check(client, create):
    created = create()
    response = client.put(
        f"{URL}/{created['id']}",
        json=make_payload(appointment_datetime="2099-06-01T10:30:00", status="Confirmed"),
    )
    assert response.status_code == 200


def test_update_into_another_appointments_slot_conflicts(client, create):
    create(appointment_datetime="2099-06-01T10:00:00")
    other = create(appointment_datetime="2099-06-01T13:00:00")
    response = client.put(
        f"{URL}/{other['id']}", json=make_payload(appointment_datetime="2099-06-01T10:15:00")
    )
    assert response.status_code == 409


@pytest.mark.parametrize("status", ["Cancelled", "Completed"])
def test_inactive_appointments_do_not_block_slot(client, create, status):
    create(status=status)
    assert client.post(URL, json=make_payload()).status_code == 201


def test_cancelling_frees_the_slot(client, create):
    first = create()
    client.put(f"{URL}/{first['id']}", json=make_payload(status="Cancelled"))
    assert client.post(URL, json=make_payload()).status_code == 201


def test_reactivating_into_taken_slot_conflicts(client, create):
    cancelled = create(status="Cancelled")
    create()
    response = client.put(f"{URL}/{cancelled['id']}", json=make_payload(status="Scheduled"))
    assert response.status_code == 409


def test_inactive_booking_never_conflicts(client, create):
    create()
    response = client.post(URL, json=make_payload(status="Cancelled"))
    assert response.status_code == 201
