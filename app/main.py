from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

health_router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
schedules_router = APIRouter(prefix="/schedules", tags=["schedules"])

# In-memory storage for schedules
schedules_db = [
    {"id": 1, "fecha": "2025-09-08", "turno": "Mañana (08:00-16:00)", "empleado": "Juan Pérez", "empleado_id": 1},
    {"id": 2, "fecha": "2025-09-08", "turno": "Tarde (16:00-00:00)", "empleado": "María García", "empleado_id": 2},
    {"id": 3, "fecha": "2025-09-09", "turno": "Noche (00:00-08:00)", "empleado": "Carlos López", "empleado_id": 3}
]

# Employee mapping
empleados_map = {
    1: "Juan Pérez",
    2: "María García", 
    3: "Carlos López",
    4: "Ana Martínez",
    5: "Pedro Sánchez"
}

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
    # Return all schedules sorted by date, then by shift
    sorted_schedules = sorted(schedules_db, key=lambda x: (x["fecha"], x["turno"]))
    return {"schedules": sorted_schedules}

@schedules_router.post("")
async def create_schedule(schedule: dict, x_demo_token: str = Header(None)):
    # Generate new ID
    new_id = max([s["id"] for s in schedules_db], default=0) + 1
    
    # Get employee name from ID
    empleado_name = empleados_map.get(schedule["empleado_id"], f"Empleado {schedule['empleado_id']}")
    
    # Create new schedule
    new_schedule = {
        "id": new_id,
        "fecha": schedule["fecha"],
        "turno": schedule["turno"], 
        "empleado": empleado_name,
        "empleado_id": schedule["empleado_id"]
    }
    
    # Add to database
    schedules_db.append(new_schedule)
    
    return {"message": "Schedule created", "schedule": new_schedule}

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