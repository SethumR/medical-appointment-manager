from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.session import get_db, init_db
from app.main import app


@pytest.fixture()
def client(tmp_path) -> Iterator[TestClient]:
    """Fresh, isolated SQLite database per test; the real database is never touched."""
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}
    )
    init_db(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager on purpose: skips lifespan (which targets the real DB).
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()
    engine.dispose()


def make_payload(**overrides) -> dict:
    payload = {
        "patient_name": "Alex Morgan",
        "appointment_datetime": "2099-06-01T10:00:00",
        "doctor": "Dr. Emily Carter",
        "appointment_type": "General Consultation",
        "status": "Scheduled",
    }
    payload.update(overrides)
    return payload


@pytest.fixture()
def create(client: TestClient):
    def _create(**overrides):
        response = client.post("/api/v1/appointments", json=make_payload(**overrides))
        assert response.status_code == 201, response.text
        return response.json()

    return _create
