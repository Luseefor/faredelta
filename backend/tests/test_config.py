from app.core.config import Settings


def test_normalizes_managed_postgres_url_for_async_sqlalchemy() -> None:
    settings = Settings(database_url="postgresql://user:secret@database.example/faredelta")

    assert settings.database_url == (
        "postgresql+asyncpg://user:secret@database.example/faredelta"
    )
