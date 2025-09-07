from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import calendar

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
    {"id": 1, "titulo": "Revisar inventario", "descripcion": "Contar y verificar productos en almacén", "empleado_id": 1, "empleado": "Juan Pérez", "fecha": "2025-09-08", "estado": "pendiente", "prioridad": "media", "is_recurring": False, "frequency": None, "parent_task_id": None},
    {"id": 2, "titulo": "Limpiar área de trabajo", "descripcion": "Mantener limpieza en zona de producción", "empleado_id": 2, "empleado": "María García", "fecha": "2025-09-08", "estado": "en_progreso", "prioridad": "baja", "is_recurring": False, "frequency": None, "parent_task_id": None},
    {"id": 3, "titulo": "Preparar reporte diario", "descripcion": "Elaborar resumen de actividades del turno", "empleado_id": 1, "empleado": "Juan Pérez", "fecha": "2025-09-09", "estado": "completada", "prioridad": "alta", "is_recurring": False, "frequency": None, "parent_task_id": None}
]

# In-memory storage for recurring task templates
recurring_tasks_db = []

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
    # Generate any pending recurring tasks first
    generate_recurring_tasks()
    
    # If empleado_id is provided, filter tasks for that employee
    if empleado_id:
        filtered_tasks = [task for task in tasks_db if task["empleado_id"] == empleado_id]
        return {"tasks": sorted(filtered_tasks, key=lambda x: (x["fecha"], x["prioridad"]))}
    
    # Return all tasks sorted by date and priority
    sorted_tasks = sorted(tasks_db, key=lambda x: (x["fecha"], x["prioridad"]))
    return {"tasks": sorted_tasks}

def calculate_next_date(current_date: str, frequency: str) -> str:
    """Calculate the next occurrence date based on frequency"""
    current = datetime.strptime(current_date, "%Y-%m-%d")
    
    if frequency == "daily":
        next_date = current + timedelta(days=1)
    elif frequency == "weekly":
        next_date = current + timedelta(weeks=1)
    elif frequency == "monthly":
        # Handle month-end edge cases
        if current.month == 12:
            next_month = current.replace(year=current.year + 1, month=1)
        else:
            next_month = current.replace(month=current.month + 1)
        
        # Handle case where next month has fewer days (e.g., Jan 31 -> Feb 28)
        try:
            next_date = next_month.replace(day=current.day)
        except ValueError:
            # If day doesn't exist in next month, use last day of month
            last_day = calendar.monthrange(next_month.year, next_month.month)[1]
            next_date = next_month.replace(day=last_day)
    else:
        next_date = current
    
    return next_date.strftime("%Y-%m-%d")

def generate_recurring_tasks():
    """Generate new instances of recurring tasks that are due"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    for recurring_task in recurring_tasks_db:
        # Check if it's time to generate next instance
        if recurring_task["next_generation_date"] <= today:
            # Generate new task ID
            new_id = max([t["id"] for t in tasks_db], default=0) + 1
            
            # Create new task instance
            new_task = {
                "id": new_id,
                "titulo": recurring_task["titulo"],
                "descripcion": recurring_task["descripcion"],
                "empleado_id": recurring_task["empleado_id"],
                "empleado": recurring_task["empleado"],
                "fecha": recurring_task["next_generation_date"],
                "estado": "pendiente",
                "prioridad": recurring_task["prioridad"],
                "is_recurring": False,  # This is an instance, not the template
                "frequency": None,
                "parent_task_id": recurring_task["id"]
            }
            
            # Add to tasks database
            tasks_db.append(new_task)
            
            # Update next generation date for recurring task
            recurring_task["next_generation_date"] = calculate_next_date(
                recurring_task["next_generation_date"], 
                recurring_task["frequency"]
            )

@tasks_router.post("")
async def create_task(task: dict, x_demo_token: str = Header(None)):
    # Generate recurring tasks first
    generate_recurring_tasks()
    
    # Get employee name from ID
    empleado_name = empleados_map.get(task["empleado_id"], f"Empleado {task['empleado_id']}")
    
    # Check if this is a recurring task
    is_recurring = task.get("is_recurring", False)
    frequency = task.get("frequency", None)
    
    if is_recurring and frequency:
        # Generate recurring task template ID
        recurring_id = max([rt["id"] for rt in recurring_tasks_db], default=0) + 1
        
        # Create recurring task template
        recurring_template = {
            "id": recurring_id,
            "titulo": task["titulo"],
            "descripcion": task.get("descripcion", ""),
            "empleado_id": task["empleado_id"],
            "empleado": empleado_name,
            "prioridad": task.get("prioridad", "media"),
            "frequency": frequency,
            "next_generation_date": task["fecha"]
        }
        
        # Add to recurring tasks database
        recurring_tasks_db.append(recurring_template)
    
    # Generate regular task ID
    new_id = max([t["id"] for t in tasks_db], default=0) + 1
    
    # Create new task (first instance for recurring, or one-time task)
    new_task = {
        "id": new_id,
        "titulo": task["titulo"],
        "descripcion": task.get("descripcion", ""),
        "empleado_id": task["empleado_id"],
        "empleado": empleado_name,
        "fecha": task["fecha"],
        "estado": "pendiente",
        "prioridad": task.get("prioridad", "media"),
        "is_recurring": is_recurring,
        "frequency": frequency,
        "parent_task_id": None
    }
    
    # Add to database
    tasks_db.append(new_task)
    
    message = "Recurring task created" if is_recurring else "Task created"
    return {"message": message, "task": new_task}

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