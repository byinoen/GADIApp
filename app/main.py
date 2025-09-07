from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

health_router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
schedules_router = APIRouter(prefix="/schedules", tags=["schedules"])
tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])

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

# In-memory storage for tasks
tasks_db = [
    {"id": 1, "titulo": "Revisar inventario", "descripcion": "Contar y verificar productos en almacén", "empleado_id": 1, "empleado": "Juan Pérez", "fecha": "2025-09-08", "estado": "pendiente", "prioridad": "media"},
    {"id": 2, "titulo": "Limpiar área de trabajo", "descripcion": "Mantener limpieza en zona de producción", "empleado_id": 2, "empleado": "María García", "fecha": "2025-09-08", "estado": "en_progreso", "prioridad": "baja"},
    {"id": 3, "titulo": "Preparar reporte diario", "descripcion": "Elaborar resumen de actividades del turno", "empleado_id": 1, "empleado": "Juan Pérez", "fecha": "2025-09-09", "estado": "completada", "prioridad": "alta"}
]

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

@tasks_router.get("")
async def get_tasks(empleado_id: int = None, x_demo_token: str = Header(None)):
    # If empleado_id is provided, filter tasks for that employee
    if empleado_id:
        filtered_tasks = [task for task in tasks_db if task["empleado_id"] == empleado_id]
        return {"tasks": sorted(filtered_tasks, key=lambda x: (x["fecha"], x["prioridad"]))}
    
    # Return all tasks sorted by date and priority
    sorted_tasks = sorted(tasks_db, key=lambda x: (x["fecha"], x["prioridad"]))
    return {"tasks": sorted_tasks}

@tasks_router.post("")
async def create_task(task: dict, x_demo_token: str = Header(None)):
    # Generate new ID
    new_id = max([t["id"] for t in tasks_db], default=0) + 1
    
    # Get employee name from ID
    empleado_name = empleados_map.get(task["empleado_id"], f"Empleado {task['empleado_id']}")
    
    # Create new task
    new_task = {
        "id": new_id,
        "titulo": task["titulo"],
        "descripcion": task.get("descripcion", ""),
        "empleado_id": task["empleado_id"],
        "empleado": empleado_name,
        "fecha": task["fecha"],
        "estado": "pendiente",
        "prioridad": task.get("prioridad", "media")
    }
    
    # Add to database
    tasks_db.append(new_task)
    
    return {"message": "Task created", "task": new_task}

@tasks_router.put("/{task_id}")
async def update_task_status(task_id: int, update_data: dict, x_demo_token: str = Header(None)):
    # Find task
    task = next((t for t in tasks_db if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update status
    if "estado" in update_data:
        task["estado"] = update_data["estado"]
    
    return {"message": "Task updated", "task": task}

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
app.include_router(tasks_router)

print("Starting FastAPI backend with CORS configuration")