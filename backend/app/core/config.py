from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FareDelta API"
    environment: str = "development"
    database_url: str = "postgresql+asyncpg://faredelta:faredelta@localhost:5432/faredelta"
    mock_provider_enabled: bool = True
    flight_provider: Literal["auto", "mock", "duffel", "travelpayouts"] = "auto"
    duffel_access_token: SecretStr | None = None
    duffel_base_url: str = "https://api.duffel.com"
    travelpayouts_access_token: SecretStr | None = None
    travelpayouts_base_url: str = "https://api.travelpayouts.com"
    travelpayouts_market: str = "us"
    tracked_route_job_token: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_driver(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
