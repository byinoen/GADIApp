from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import calendar

health_router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
schedules_router = APIRouter(prefix="/schedules", tags=["schedules"])
tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])
inbox_router = APIRouter(prefix="/inbox", tags=["inbox"])
registers_router = APIRouter(prefix="/registers", tags=["registers"])

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

# In-memory storage for manager inbox (conflict notifications)
manager_inbox_db = []

# In-memory storage for registers and procedures
registers_db = [
    {
        "id": 1,
        "nombre": "Registro de Tratamientos de Cultivos",
        "tipo": "treatment",
        "descripcion": "Registro para documentar todos los tratamientos aplicados a los cultivos",
        "activo": True,
        "created_at": "2025-09-07 12:00:00"
    },
    {
        "id": 2,
        "nombre": "Registro de Mantenimiento de Equipos",
        "tipo": "maintenance", 
        "descripcion": "Registro para documentar el mantenimiento y revisión de equipos",
        "activo": True,
        "created_at": "2025-09-07 12:00:00"
    }
]

# In-memory storage for recipes/procedures
procedures_db = [
    {
        "id": 1,
        "register_id": 1,
        "nombre": "Aplicación de Fungicida",
        "receta": {
            "ingredientes": [
                {"nombre": "Fungicida XYZ", "cantidad": "2 litros", "concentracion": "0.5%"},
                {"nombre": "Agua", "cantidad": "400 litros", "pureza": "limpia"}
            ],
            "proporcion": "0.5% de concentración en agua",
            "volumen_total": "400 litros"
        },
        "procedimiento": [
            "Usar equipo de protección personal completo (guantes, mascarilla, gafas)",
            "Mezclar el fungicida con agua en tanque limpio",
            "Agitar bien la mezcla durante 5 minutos",
            "Aplicar con pulverizador a presión uniforme",
            "Cubrir toda la superficie del cultivo de manera homogénea",
            "Lavar el equipo después del uso"
        ],
        "precauciones": [
            "OBLIGATORIO: Usar equipo de protección personal",
            "No aplicar con viento fuerte (>15 km/h)",
            "No aplicar antes de lluvia",
            "Mantener alejado de fuentes de agua potable",
            "Lavar manos y cara después del trabajo"
        ],
        "tiempo_estimado": "2 horas",
        "created_at": "2025-09-07 12:00:00"
    },
    {
        "id": 2,
        "register_id": 2,
        "nombre": "Revisión de Tractor",
        "receta": {
            "materiales": [
                {"nombre": "Aceite motor", "cantidad": "5 litros", "especificacion": "10W-40"},
                {"nombre": "Filtro de aceite", "cantidad": "1 unidad", "codigo": "OF-123"},
                {"nombre": "Filtro de aire", "cantidad": "1 unidad", "codigo": "AF-456"}
            ]
        },
        "procedimiento": [
            "Apagar el tractor y esperar que se enfríe",
            "Revisar nivel de aceite con varilla",
            "Cambiar aceite si está sucio o bajo",
            "Inspeccionar filtros de aire y aceite",
            "Revisar presión de neumáticos",
            "Verificar funcionamiento de luces",
            "Probar frenos y dirección",
            "Registrar kilometraje y horas de uso"
        ],
        "precauciones": [
            "Usar guantes para evitar contacto con aceites",
            "Asegurar que el motor esté frío antes de trabajar",
            "Disponer correctamente de aceites usados",
            "No fumar durante la revisión"
        ],
        "tiempo_estimado": "1.5 horas",
        "created_at": "2025-09-07 12:00:00"
    }
]

# In-memory storage for register entries (signed completions)
register_entries_db = []

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

def is_employee_working(empleado_id: int, fecha: str) -> bool:
    """Check if employee is scheduled to work on a specific date"""
    for schedule in schedules_db:
        if schedule["empleado_id"] == empleado_id and schedule["fecha"] == fecha:
            return True
    return False

def create_conflict_notification(task_data: dict, conflict_type: str):
    """Create a conflict notification for managers"""
    notification_id = max([notif["id"] for notif in manager_inbox_db], default=0) + 1
    
    empleado_name = empleados_map.get(task_data["empleado_id"], f"Empleado {task_data['empleado_id']}")
    
    notification = {
        "id": notification_id,
        "type": conflict_type,  # "assignment_conflict" or "recurring_conflict"
        "task_data": task_data,
        "empleado_id": task_data["empleado_id"],
        "empleado_name": empleado_name,
        "fecha": task_data["fecha"],
        "message": f"No se puede asignar tarea '{task_data['titulo']}' a {empleado_name} el {task_data['fecha']} - no está programado para trabajar",
        "status": "pending",  # pending, resolved
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "resolved_at": None,
        "resolution": None
    }
    
    manager_inbox_db.append(notification)
    return notification

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
        
        # Check for conflicts in upcoming recurring task instances
        elif not is_employee_working(recurring_task["empleado_id"], recurring_task["next_generation_date"]):
            # Create conflict notification for recurring task
            conflict_data = {
                "titulo": recurring_task["titulo"],
                "descripcion": recurring_task["descripcion"],
                "empleado_id": recurring_task["empleado_id"],
                "fecha": recurring_task["next_generation_date"],
                "prioridad": recurring_task["prioridad"],
                "frequency": recurring_task["frequency"]
            }
            create_conflict_notification(conflict_data, "recurring_conflict")
            
            # Skip this instance and move to next date
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
    
    # Check if employee is working on the task date
    if not is_employee_working(task["empleado_id"], task["fecha"]):
        # Create conflict notification for managers
        conflict_notification = create_conflict_notification(task, "assignment_conflict")
        return {
            "error": "scheduling_conflict",
            "message": f"No se puede asignar tarea a {empleado_name} el {task['fecha']} - no está programado para trabajar",
            "notification_id": conflict_notification["id"],
            "suggestion": "Puede reasignar la tarea a otro empleado o cambiar la fecha"
        }
    
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
        "parent_task_id": None,
        "register_id": task.get("register_id", None),
        "procedure_id": task.get("procedure_id", None),
        "requires_signature": task.get("requires_signature", False)
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

# Manager Inbox Routes
@inbox_router.get("")
async def get_inbox_notifications(x_demo_token: str = Header(None)):
    """Get all pending conflict notifications for managers"""
    # Sort by creation date, newest first
    sorted_notifications = sorted(
        [notif for notif in manager_inbox_db if notif["status"] == "pending"], 
        key=lambda x: x["created_at"], 
        reverse=True
    )
    return {"notifications": sorted_notifications}

@inbox_router.post("/{notification_id}/reassign")
async def reassign_task(notification_id: int, reassignment_data: dict, x_demo_token: str = Header(None)):
    """Reassign a conflicted task to another employee"""
    # Find the notification
    notification = None
    for notif in manager_inbox_db:
        if notif["id"] == notification_id:
            notification = notif
            break
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    new_empleado_id = reassignment_data["new_empleado_id"]
    new_empleado_name = empleados_map.get(new_empleado_id, f"Empleado {new_empleado_id}")
    
    # Check if new employee is working on that date
    if not is_employee_working(new_empleado_id, notification["fecha"]):
        return {
            "error": "reassignment_conflict",
            "message": f"{new_empleado_name} tampoco está programado para trabajar el {notification['fecha']}"
        }
    
    # Create the task with new assignment
    task_data = notification["task_data"].copy()
    task_data["empleado_id"] = new_empleado_id
    
    # Generate new task ID
    new_id = max([t["id"] for t in tasks_db], default=0) + 1
    
    # Create reassigned task
    new_task = {
        "id": new_id,
        "titulo": task_data["titulo"],
        "descripcion": task_data.get("descripcion", ""),
        "empleado_id": new_empleado_id,
        "empleado": new_empleado_name,
        "fecha": task_data["fecha"],
        "estado": "pendiente",
        "prioridad": task_data.get("prioridad", "media"),
        "is_recurring": task_data.get("is_recurring", False),
        "frequency": task_data.get("frequency", None),
        "parent_task_id": None
    }
    
    # Add to database
    tasks_db.append(new_task)
    
    # Mark notification as resolved
    notification["status"] = "resolved"
    notification["resolved_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    notification["resolution"] = f"Tarea reasignada a {new_empleado_name}"
    
    return {
        "message": f"Tarea reasignada exitosamente a {new_empleado_name}",
        "task": new_task,
        "notification": notification
    }

@inbox_router.post("/{notification_id}/reschedule")
async def reschedule_task(notification_id: int, reschedule_data: dict, x_demo_token: str = Header(None)):
    """Reschedule a conflicted task to a different date"""
    # Find the notification
    notification = None
    for notif in manager_inbox_db:
        if notif["id"] == notification_id:
            notification = notif
            break
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    new_fecha = reschedule_data["new_fecha"]
    empleado_id = notification["empleado_id"]
    
    # Check if employee is working on the new date
    if not is_employee_working(empleado_id, new_fecha):
        return {
            "error": "reschedule_conflict",
            "message": f"{notification['empleado_name']} tampoco está programado para trabajar el {new_fecha}"
        }
    
    # Create the task with new date
    task_data = notification["task_data"].copy()
    task_data["fecha"] = new_fecha
    
    # Generate new task ID
    new_id = max([t["id"] for t in tasks_db], default=0) + 1
    
    # Create rescheduled task
    new_task = {
        "id": new_id,
        "titulo": task_data["titulo"],
        "descripcion": task_data.get("descripcion", ""),
        "empleado_id": empleado_id,
        "empleado": notification["empleado_name"],
        "fecha": new_fecha,
        "estado": "pendiente",
        "prioridad": task_data.get("prioridad", "media"),
        "is_recurring": task_data.get("is_recurring", False),
        "frequency": task_data.get("frequency", None),
        "parent_task_id": None
    }
    
    # Add to database
    tasks_db.append(new_task)
    
    # Mark notification as resolved
    notification["status"] = "resolved"
    notification["resolved_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    notification["resolution"] = f"Tarea reprogramada para {new_fecha}"
    
    return {
        "message": f"Tarea reprogramada exitosamente para {new_fecha}",
        "task": new_task,
        "notification": notification
    }

# Enhanced schedule route to include tasks
@schedules_router.get("/{schedule_id}/tasks")
async def get_schedule_tasks(schedule_id: int, x_demo_token: str = Header(None)):
    """Get all tasks for a specific schedule/date"""
    # Find the schedule
    schedule = None
    for sched in schedules_db:
        if sched["id"] == schedule_id:
            schedule = sched
            break
    
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Generate any pending recurring tasks first
    generate_recurring_tasks()
    
    # Find tasks for this employee on this date
    schedule_tasks = [
        task for task in tasks_db 
        if task["empleado_id"] == schedule["empleado_id"] and task["fecha"] == schedule["fecha"]
    ]
    
    return {
        "schedule": schedule,
        "tasks": sorted(schedule_tasks, key=lambda x: x["prioridad"])
    }

# Register Management Routes
@registers_router.get("")
async def get_registers(x_demo_token: str = Header(None)):
    """Get all active registers"""
    active_registers = [reg for reg in registers_db if reg["activo"]]
    return {"registers": active_registers}

@registers_router.get("/{register_id}")
async def get_register(register_id: int, x_demo_token: str = Header(None)):
    """Get a specific register with its procedures"""
    register = next((reg for reg in registers_db if reg["id"] == register_id), None)
    if not register:
        raise HTTPException(status_code=404, detail="Register not found")
    
    # Get procedures for this register
    register_procedures = [proc for proc in procedures_db if proc["register_id"] == register_id]
    
    return {
        "register": register,
        "procedures": register_procedures
    }

@registers_router.get("/{register_id}/procedures")
async def get_register_procedures(register_id: int, x_demo_token: str = Header(None)):
    """Get all procedures for a specific register"""
    register_procedures = [proc for proc in procedures_db if proc["register_id"] == register_id]
    return {"procedures": register_procedures}

@registers_router.get("/{register_id}/entries")
async def get_register_entries(register_id: int, fecha_inicio: str = None, fecha_fin: str = None, x_demo_token: str = Header(None)):
    """Get register entries with optional date filtering"""
    entries = [entry for entry in register_entries_db if entry["register_id"] == register_id]
    
    # Filter by date range if provided
    if fecha_inicio:
        entries = [entry for entry in entries if entry["fecha_completado"] >= fecha_inicio]
    if fecha_fin:
        entries = [entry for entry in entries if entry["fecha_completado"] <= fecha_fin]
    
    # Sort by completion date, newest first
    entries = sorted(entries, key=lambda x: x["fecha_completado"], reverse=True)
    
    return {"entries": entries}

@registers_router.post("/{register_id}/entries")
async def create_register_entry(register_id: int, entry_data: dict, x_demo_token: str = Header(None)):
    """Create a new register entry (employee signature)"""
    # Generate new entry ID
    new_id = max([entry["id"] for entry in register_entries_db], default=0) + 1
    
    # Get employee name
    empleado_name = empleados_map.get(entry_data["empleado_id"], f"Empleado {entry_data['empleado_id']}")
    
    # Create new register entry
    new_entry = {
        "id": new_id,
        "register_id": register_id,
        "task_id": entry_data["task_id"],
        "procedure_id": entry_data["procedure_id"],
        "empleado_id": entry_data["empleado_id"],
        "empleado_name": empleado_name,
        "fecha_completado": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "firma_empleado": entry_data.get("firma_empleado", "Firmado digitalmente"),
        "observaciones": entry_data.get("observaciones", ""),
        "resultado": entry_data.get("resultado", "completado"),  # completado, incompleto, con_observaciones
        "tiempo_real": entry_data.get("tiempo_real", None),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    # Add to database
    register_entries_db.append(new_entry)
    
    return {"message": "Register entry created", "entry": new_entry}

@registers_router.post("")
async def create_register(register_data: dict, x_demo_token: str = Header(None)):
    """Create a new register"""
    # Generate new ID
    new_id = max([reg["id"] for reg in registers_db], default=0) + 1
    
    new_register = {
        "id": new_id,
        "nombre": register_data["nombre"],
        "tipo": register_data.get("tipo", "general"),
        "descripcion": register_data.get("descripcion", ""),
        "activo": True,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    registers_db.append(new_register)
    return {"message": "Register created", "register": new_register}

@registers_router.post("/{register_id}/procedures")
async def create_procedure(register_id: int, procedure_data: dict, x_demo_token: str = Header(None)):
    """Create a new procedure for a register"""
    # Generate new ID  
    new_id = max([proc["id"] for proc in procedures_db], default=0) + 1
    
    new_procedure = {
        "id": new_id,
        "register_id": register_id,
        "nombre": procedure_data["nombre"],
        "receta": procedure_data.get("receta", {}),
        "procedimiento": procedure_data.get("procedimiento", []),
        "precauciones": procedure_data.get("precauciones", []),
        "tiempo_estimado": procedure_data.get("tiempo_estimado", "1 hora"),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    procedures_db.append(new_procedure)
    return {"message": "Procedure created", "procedure": new_procedure}

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
app.include_router(inbox_router)
app.include_router(registers_router)

print("Starting FastAPI backend with CORS configuration")