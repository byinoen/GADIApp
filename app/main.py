from fastapi import FastAPI
from app.routers import health, auth
from app.config import settings

app = FastAPI()

print(f"Starting application with APP_ENV: {settings.app_env}")

app.include_router(health.router)
app.include_router(auth.router)