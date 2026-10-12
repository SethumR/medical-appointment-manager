from tests.conftest import make_payload

URL = "/api/v1/appointments"


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_create_appointment(client):
    response = client.post(URL, json=make_payload(patient_name="  Alex Morgan  "))
    assert response.status_code == 201
    body = response.json()
    assert body["id"] > 0
    assert body["patient_name"] == "Alex Morgan"  # trimmed
    assert body["appointment_datetime"] == "2099-06-01T10:00:00"  # not altered
    assert body["created_at"] and body["updated_at"]


def test_list_appointments(client, create):
    create()
    create(doctor="Dr. Daniel Reed")
    body = client.get(URL).json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    assert body["page"] == 1 and body["pages"] == 1


def test_get_existing(client, create):
    created = create()
    response = client.get(f"{URL}/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created


def test_get_missing_returns_404(client):
    assert client.get(f"{URL}/999").status_code == 404


def test_update_appointment_preserves_created_at(client, create):
    created = create()
    response = client.put(
        f"{URL}/{created['id']}",
        json=make_payload(status="Confirmed", patient_name="Alex M. Morgan"),
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Confirmed"
    assert body["patient_name"] == "Alex M. Morgan"
    assert body["created_at"] == created["created_at"]


def test_update_and_delete_missing_return_404(client):
    assert client.put(f"{URL}/999", json=make_payload()).status_code == 404
    assert client.delete(f"{URL}/999").status_code == 404


def test_delete_appointment(client, create):
    created = create()
    assert client.delete(f"{URL}/{created['id']}").status_code == 204
    assert client.get(f"{URL}/{created['id']}").status_code == 404
    assert client.get(URL).json()["total"] == 0


def test_search_by_patient_name(client, create):
    create(patient_name="Alex Morgan")
    create(patient_name="Jamie Taylor", doctor="Dr. Daniel Reed")
    items = client.get(URL, params={"search": "jamie"}).json()["items"]
    assert [i["patient_name"] for i in items] == ["Jamie Taylor"]


def test_search_by_doctor(client, create):
    create()
    create(patient_name="Jamie Taylor", doctor="Dr. Daniel Reed")
    items = client.get(URL, params={"search": "reed"}).json()["items"]
    assert [i["doctor"] for i in items] == ["Dr. Daniel Reed"]


def test_search_treats_wildcards_literally(client, create):
    create()
    assert client.get(URL, params={"search": "%"}).json()["total"] == 0


def test_filter_by_status_and_type(client, create):
    create(status="Confirmed", doctor="Dr. A")
    create(status="Scheduled", doctor="Dr. B", appointment_type="Dental")
    assert client.get(URL, params={"status": "Confirmed"}).json()["total"] == 1
    assert client.get(URL, params={"appointment_type": "Dental"}).json()["total"] == 1


def test_combined_search_and_filters(client, create):
    create(patient_name="Alex Morgan", doctor="Dr. Emily Carter", status="Confirmed")
    create(
        patient_name="Alex Morgan",
        doctor="Dr. Emily Carter",
        status="Scheduled",
        appointment_datetime="2099-06-02T10:00:00",
    )
    create(patient_name="Jamie Taylor", doctor="Dr. Daniel Reed", status="Confirmed")
    body = client.get(URL, params={"search": "emily", "status": "Confirmed"}).json()
    assert body["total"] == 1
    assert body["items"][0]["patient_name"] == "Alex Morgan"
    assert body["items"][0]["status"] == "Confirmed"


def test_date_range_is_inclusive_of_end_day(client, create):
    create(appointment_datetime="2099-06-01T23:30:00")
    create(appointment_datetime="2099-06-03T08:00:00", doctor="Dr. B")
    params = {"date_from": "2099-06-01", "date_to": "2099-06-01"}
    assert client.get(URL, params=params).json()["total"] == 1
    params = {"date_from": "2099-06-02"}
    assert client.get(URL, params=params).json()["total"] == 1


def test_pagination_and_sorting(client, create):
    for day in range(1, 6):
        create(appointment_datetime=f"2099-06-0{day}T10:00:00")
    page2 = client.get(URL, params={"page": 2, "page_size": 2}).json()
    assert page2["total"] == 5 and page2["pages"] == 3
    assert [i["appointment_datetime"][:10] for i in page2["items"]] == ["2099-06-03", "2099-06-04"]
    desc = client.get(URL, params={"sort_order": "desc", "page_size": 1}).json()
    assert desc["items"][0]["appointment_datetime"].startswith("2099-06-05")


def test_summary_counts_all_appointments(client, create):
    create(status="Scheduled")
    create(status="Confirmed", doctor="Dr. B")
    create(status="Cancelled", doctor="Dr. C")
    assert client.get(f"{URL}/summary").json() == {
        "total": 3,
        "scheduled": 1,
        "confirmed": 1,
        "completed": 0,
        "cancelled": 1,
    }
