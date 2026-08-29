from fastapi import FastAPI

from app.api.routes.flights import router as flights_router
from app.api.routes.health import router as health_router
from app.api.routes.tracked_routes import router as tracked_routes_router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")
app.include_router(health_router)
app.include_router(flights_router)
app.include_router(tracked_routes_router)
