from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

health_router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
schedules_router = APIRouter(prefix="/schedules", tags=["schedules"])

@health_router.get("/health")
async def health_check():
    return {"status": "ok"}

@auth_router.post("/login")
async def login_user(request: dict):
    email = request.get("email", "")
    password = request.get("password", "")
    
    # Simple demo authentication
    users = {
        "admin@example.com": {"id": 1, "email": "admin@example.com", "role": "admin"},
        "encargado@example.com": {"id": 2, "email": "encargado@example.com", "role": "encargado"},
        "trabajador@example.com": {"id": 3, "email": "trabajador@example.com", "role": "trabajador"}
    }
    
    if email in users and password == "1234":
        return {"token": "demo", "user": users[email]}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@schedules_router.get("")
async def get_schedules(x_demo_token: str = Header(None)):
    # Demo schedules data
    schedules = [
        {"id": 1, "fecha": "2025-09-08", "turno": "Mañana (08:00-16:00)", "empleado": "Juan Pérez"},
        {"id": 2, "fecha": "2025-09-08", "turno": "Tarde (16:00-00:00)", "empleado": "María García"},
        {"id": 3, "fecha": "2025-09-09", "turno": "Noche (00:00-08:00)", "empleado": "Carlos López"}
    ]
    return {"schedules": schedules}

@schedules_router.post("")
async def create_schedule(schedule: dict, x_demo_token: str = Header(None)):
    return {"message": "Schedule created", "schedule": schedule}

# Create FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(schedules_router)

print("Starting FastAPI backend with CORS configuration")