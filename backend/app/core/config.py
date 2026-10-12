from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BACKEND_DIR / "data"


class Settings(BaseSettings):
    """Application settings, overridable through environment variables or .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{DATA_DIR / 'appointments.db'}"
    frontend_origin: str = "http://localhost:3000"
    # Every appointment occupies a fixed slot of this length (minutes).
    appointment_duration_minutes: int = 60


settings = Settings()
