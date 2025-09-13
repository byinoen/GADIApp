from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import calendar
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
import base64
from typing import Optional, List, Dict, Any

health_router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
schedules_router = APIRouter(prefix="/schedules", tags=["schedules"])
tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])
inbox_router = APIRouter(prefix="/inbox", tags=["inbox"])
registers_router = APIRouter(prefix="/registers", tags=["registers"])
permissions_router = APIRouter(prefix="/permissions", tags=["permissions"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])

# In-memory storage for schedules
schedules_db = [
    {"id": 1, "fecha": "2025-09-08", "turno": "Mañana (08:00-16:00)", "empleado": "Juan Pérez", "empleado_id": 1},
    {"id": 2, "fecha": "2025-09-08", "turno": "Tarde (16:00-00:00)", "empleado": "María García", "empleado_id": 2},
    {"id": 3, "fecha": "2025-09-09", "turno": "Noche (00:00-08:00)", "empleado": "Carlos López", "empleado_id": 3}
]

# Employee database with authentication data
empleados_db = [
    {"id": 1, "nombre": "Juan Pérez", "email": "juan@example.com", "role": "trabajador", "telefono": "+34 123 456 789", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
    {"id": 2, "nombre": "María García", "email": "maria@example.com", "role": "trabajador", "telefono": "+34 123 456 790", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
    {"id": 3, "nombre": "Carlos López", "email": "carlos@example.com", "role": "trabajador", "telefono": "+34 123 456 791", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
    {"id": 4, "nombre": "Ana Martínez", "email": "ana@example.com", "role": "encargado", "telefono": "+34 123 456 792", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
    {"id": 5, "nombre": "Pedro Sánchez", "email": "pedro@example.com", "role": "trabajador", "telefono": "+34 123 456 793", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"}
]

# Employee mapping for backward compatibility
empleados_map = {emp["id"]: emp["nombre"] for emp in empleados_db}

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
        "created_at": "2025-09-07 12:00:00",
        "campos_personalizados": [
            {"nombre": "fecha_aplicacion", "tipo": "date", "etiqueta": "Fecha de Aplicación", "requerido": True},
            {"nombre": "tipo_producto", "tipo": "select", "etiqueta": "Tipo de Producto", "requerido": True, "opciones": ["Fungicida", "Insecticida", "Herbicida", "Fertilizante"]},
            {"nombre": "ubicacion_finca", "tipo": "text", "etiqueta": "Ubicación en la Finca", "requerido": True},
            {"nombre": "tipo_cultivo", "tipo": "select", "etiqueta": "Tipo de Cultivo", "requerido": True, "opciones": ["Maíz", "Frijol", "Café", "Tomate", "Lechuga"]},
            {"nombre": "maquina_utilizada", "tipo": "text", "etiqueta": "Máquina/Equipo Utilizado", "requerido": False},
            {"nombre": "dosis_aplicada", "tipo": "text", "etiqueta": "Dosis Aplicada", "requerido": True},
            {"nombre": "condiciones_clima", "tipo": "select", "etiqueta": "Condiciones Climáticas", "requerido": False, "opciones": ["Soleado", "Nublado", "Lluvia ligera", "Viento", "Ideal"]}
        ]
    },
    {
        "id": 2,
        "nombre": "Registro de Mantenimiento de Equipos",
        "tipo": "maintenance", 
        "descripcion": "Registro para documentar el mantenimiento y revisión de equipos",
        "activo": True,
        "created_at": "2025-09-07 12:00:00",
        "campos_personalizados": [
            {"nombre": "fecha_mantenimiento", "tipo": "date", "etiqueta": "Fecha de Mantenimiento", "requerido": True},
            {"nombre": "equipo", "tipo": "select", "etiqueta": "Equipo/Máquina", "requerido": True, "opciones": ["Tractor", "Pulverizador", "Cosechadora", "Arado", "Cultivadora"]},
            {"nombre": "tipo_mantenimiento", "tipo": "select", "etiqueta": "Tipo de Mantenimiento", "requerido": True, "opciones": ["Preventivo", "Correctivo", "Emergencia"]},
            {"nombre": "tecnico_responsable", "tipo": "text", "etiqueta": "Técnico Responsable", "requerido": True},
            {"nombre": "partes_cambiadas", "tipo": "textarea", "etiqueta": "Partes Cambiadas/Reparadas", "requerido": False},
            {"nombre": "horas_trabajo", "tipo": "number", "etiqueta": "Horas de Trabajo", "requerido": False},
            {"nombre": "costo_total", "tipo": "number", "etiqueta": "Costo Total (€)", "requerido": False},
            {"nombre": "proxima_revision", "tipo": "date", "etiqueta": "Próxima Revisión", "requerido": False}
        ]
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

# Permission system
permissions_db = [
    # Schedule Management
    {"id": "schedules.view", "name": "Ver Horarios", "description": "Puede ver los horarios de trabajo", "category": "schedules"},
    {"id": "schedules.create", "name": "Crear Horarios", "description": "Puede crear nuevos horarios", "category": "schedules"},
    {"id": "schedules.edit", "name": "Editar Horarios", "description": "Puede modificar horarios existentes", "category": "schedules"},
    {"id": "schedules.delete", "name": "Eliminar Horarios", "description": "Puede eliminar horarios", "category": "schedules"},
    
    # Task Management
    {"id": "tasks.view", "name": "Ver Tareas", "description": "Puede ver las tareas asignadas", "category": "tasks"},
    {"id": "tasks.view_all", "name": "Ver Todas las Tareas", "description": "Puede ver tareas de todos los empleados", "category": "tasks"},
    {"id": "tasks.create", "name": "Crear Tareas", "description": "Puede crear nuevas tareas", "category": "tasks"},
    {"id": "tasks.edit", "name": "Editar Tareas", "description": "Puede modificar tareas", "category": "tasks"},
    {"id": "tasks.delete", "name": "Eliminar Tareas", "description": "Puede eliminar tareas", "category": "tasks"},
    {"id": "tasks.assign", "name": "Asignar Tareas", "description": "Puede asignar tareas a empleados", "category": "tasks"},
    
    # Employee Management
    {"id": "employees.view", "name": "Ver Empleados", "description": "Puede ver la lista de empleados", "category": "employees"},
    {"id": "employees.create", "name": "Crear Empleados", "description": "Puede crear nuevos empleados", "category": "employees"},
    {"id": "employees.edit", "name": "Editar Empleados", "description": "Puede modificar información de empleados", "category": "employees"},
    {"id": "employees.deactivate", "name": "Desactivar Empleados", "description": "Puede desactivar empleados", "category": "employees"},
    
    # Register Management
    {"id": "registers.view", "name": "Ver Registros", "description": "Puede ver los registros", "category": "registers"},
    {"id": "registers.create", "name": "Crear Registros", "description": "Puede crear nuevos registros", "category": "registers"},
    {"id": "registers.edit", "name": "Editar Registros", "description": "Puede modificar registros", "category": "registers"},
    {"id": "registers.delete", "name": "Eliminar Registros", "description": "Puede eliminar registros", "category": "registers"},
    {"id": "registers.fill", "name": "Llenar Registros", "description": "Puede completar entradas de registros", "category": "registers"},
    
    # System Administration
    {"id": "system.manage_roles", "name": "Gestionar Roles", "description": "Puede crear y modificar roles", "category": "system"},
    {"id": "system.manage_permissions", "name": "Gestionar Permisos", "description": "Puede asignar permisos a roles", "category": "system"},
    {"id": "system.view_reports", "name": "Ver Reportes", "description": "Puede acceder a reportes del sistema", "category": "system"},
    {"id": "system.export_data", "name": "Exportar Datos", "description": "Puede exportar datos en PDF y otros formatos", "category": "system"},
]

# Role-Permission mappings
role_permissions_db = {
    "admin": [
        # Full system access
        "schedules.view", "schedules.create", "schedules.edit", "schedules.delete",
        "tasks.view", "tasks.view_all", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign",
        "employees.view", "employees.create", "employees.edit", "employees.deactivate",
        "registers.view", "registers.create", "registers.edit", "registers.delete", "registers.fill",
        "system.manage_roles", "system.manage_permissions", "system.view_reports", "system.export_data"
    ],
    "encargado": [
        # Management level access
        "schedules.view", "schedules.create", "schedules.edit",
        "tasks.view", "tasks.view_all", "tasks.create", "tasks.edit", "tasks.assign",
        "employees.view", "employees.create", "employees.edit",
        "registers.view", "registers.create", "registers.edit", "registers.fill",
        "system.view_reports", "system.export_data"
    ],
    "trabajador": [
        # Basic worker access
        "schedules.view",
        "tasks.view", "tasks.edit",  # Only edit their own tasks
        "registers.view", "registers.fill"
    ]
}

# Current user context (stored after login)
current_user_context = {}

# Permission checking utilities
def get_user_from_token(x_demo_token: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Extract user information from token"""
    if not x_demo_token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    # For demo purposes, we'll extract user from the stored context
    # In production, this would validate JWT and extract user info
    user = current_user_context.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token or session expired")
    
    return user

def has_permission(user: Dict[str, Any], permission: str) -> bool:
    """Check if user has a specific permission"""
    user_role = user.get("role", "")
    role_permissions = role_permissions_db.get(user_role, [])
    return permission in role_permissions

def require_permission(permission: str):
    """Dependency to require a specific permission"""
    def permission_checker(user: Dict[str, Any] = Depends(get_user_from_token)):
        if not has_permission(user, permission):
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required: {permission}"
            )
        return user
    return permission_checker

def require_any_permission(permissions: List[str]):
    """Dependency to require any of the specified permissions"""
    def permission_checker(user: Dict[str, Any] = Depends(get_user_from_token)):
        if not any(has_permission(user, perm) for perm in permissions):
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required one of: {', '.join(permissions)}"
            )
        return user
    return permission_checker

@health_router.get("/health")
async def health_check():
    return {"status": "ok"}

# Employee management endpoints
employees_router = APIRouter(prefix="/employees", tags=["employees"])

@employees_router.get("")
async def get_employees(user: Dict[str, Any] = Depends(require_permission("employees.view"))):
    """Get all employees"""
    # Update empleados_map for backward compatibility
    global empleados_map
    empleados_map = {emp["id"]: emp["nombre"] for emp in empleados_db}
    
    return {"employees": empleados_db}

@employees_router.get("/{employee_id}")
async def get_employee(employee_id: int, user: Dict[str, Any] = Depends(require_permission("employees.view"))):
    """Get specific employee"""
    employee = next((emp for emp in empleados_db if emp["id"] == employee_id), None)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return {"employee": employee}

@employees_router.post("")
async def create_employee(employee_data: dict, user: Dict[str, Any] = Depends(require_permission("employees.create"))):
    """Create a new employee"""
    # Generate new ID
    new_id = max([emp["id"] for emp in empleados_db], default=0) + 1
    
    # Set default password if not provided
    default_password = employee_data.get("password", "1234")
    
    new_employee = {
        "id": new_id,
        "nombre": employee_data["nombre"],
        "email": employee_data["email"],
        "role": employee_data.get("role", "trabajador"),
        "telefono": employee_data.get("telefono", ""),
        "activo": employee_data.get("activo", True),
        "password": default_password,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    empleados_db.append(new_employee)
    
    # Update empleados_map for backward compatibility
    global empleados_map
    empleados_map = {emp["id"]: emp["nombre"] for emp in empleados_db}
    
    return {"message": "Employee created", "employee": new_employee}

@employees_router.put("/{employee_id}")
async def update_employee(employee_id: int, employee_data: dict, user: Dict[str, Any] = Depends(require_permission("employees.edit"))):
    """Update employee information"""
    employee = next((emp for emp in empleados_db if emp["id"] == employee_id), None)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update fields
    employee["nombre"] = employee_data.get("nombre", employee["nombre"])
    employee["email"] = employee_data.get("email", employee["email"])
    employee["role"] = employee_data.get("role", employee["role"])
    employee["telefono"] = employee_data.get("telefono", employee["telefono"])
    employee["activo"] = employee_data.get("activo", employee["activo"])
    
    # Update empleados_map for backward compatibility
    global empleados_map
    empleados_map = {emp["id"]: emp["nombre"] for emp in empleados_db}
    
    return {"message": "Employee updated", "employee": employee}

@employees_router.delete("/{employee_id}")
async def delete_employee(employee_id: int, user: Dict[str, Any] = Depends(require_permission("employees.deactivate"))):
    """Delete/deactivate employee"""
    employee = next((emp for emp in empleados_db if emp["id"] == employee_id), None)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Deactivate instead of delete to maintain data integrity
    employee["activo"] = False
    
    # Update empleados_map for backward compatibility
    global empleados_map
    empleados_map = {emp["id"]: emp["nombre"] for emp in empleados_db if emp["activo"]}
    
    return {"message": "Employee deactivated", "employee": employee}

@auth_router.post("/login")
async def login_user(request: dict):
    email = request.get("email", "")
    password = request.get("password", "")
    
    # Check hardcoded admin users first
    hardcoded_users = {
        "admin@example.com": {"id": 1, "email": "admin@example.com", "role": "admin", "nombre": "Administrador"},
        "encargado@example.com": {"id": 2, "email": "encargado@example.com", "role": "encargado", "nombre": "Encargado"},
        "trabajador@example.com": {"id": 3, "email": "trabajador@example.com", "role": "trabajador", "nombre": "Trabajador"}
    }
    
    user_data = None
    
    # First check hardcoded users
    if email in hardcoded_users and password == "1234":
        user_data = hardcoded_users[email]
    else:
        # Then check dynamic employees from database
        for employee in empleados_db:
            if employee["email"] == email and employee.get("password", "1234") == password and employee["activo"]:
                user_data = {
                    "id": employee["id"],
                    "email": employee["email"],
                    "role": employee["role"],
                    "nombre": employee["nombre"]
                }
                break
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Store user context for permission checking
    global current_user_context
    current_user_context = {"user": user_data}
    
    # Add user permissions to response
    user_permissions = role_permissions_db.get(user_data["role"], [])
    
    return {
        "access_token": "demo", 
        "user": user_data,
        "permissions": user_permissions
    }

@schedules_router.get("")
async def get_schedules(user: Dict[str, Any] = Depends(require_permission("schedules.view"))):
    # Return all schedules sorted by date, then by shift
    sorted_schedules = sorted(schedules_db, key=lambda x: (x["fecha"], x["turno"]))
    return {"schedules": sorted_schedules}

@schedules_router.post("")
async def create_schedule(schedule: dict, user: Dict[str, Any] = Depends(require_permission("schedules.create"))):
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
async def get_tasks(empleado_id: int = None, user: Dict[str, Any] = Depends(require_any_permission(["tasks.view", "tasks.view_all"]))):
    # Generate any pending recurring tasks first
    generate_recurring_tasks()
    
    # Check if user can see all tasks or only their own
    can_view_all = has_permission(user, "tasks.view_all")
    
    # If empleado_id is provided, filter tasks for that employee
    if empleado_id:
        # Check if user can view this employee's tasks
        if not can_view_all and user.get("id") != empleado_id:
            raise HTTPException(status_code=403, detail="Can only view your own tasks")
        filtered_tasks = [task for task in tasks_db if task["empleado_id"] == empleado_id]
        return {"tasks": sorted(filtered_tasks, key=lambda x: (x["fecha"], x["prioridad"]))}
    
    # If user can't view all tasks, only return their own
    if not can_view_all:
        user_tasks = [task for task in tasks_db if task["empleado_id"] == user.get("id")]
        return {"tasks": sorted(user_tasks, key=lambda x: (x["fecha"], x["prioridad"]))}
    
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
async def create_task(task: dict, user: Dict[str, Any] = Depends(require_permission("tasks.create"))):
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
        "requires_signature": task.get("requires_signature", False),
        "start_time": None,
        "finish_time": None,
        "actual_duration_minutes": None
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

@tasks_router.post("/{task_id}/start")
async def start_task(task_id: int, x_demo_token: str = Header(None)):
    """Start task timer"""
    task = next((t for t in tasks_db if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task to in_progress with start time
    task["estado"] = "en_progreso"
    task["start_time"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    task["finish_time"] = None
    task["actual_duration_minutes"] = None
    
    return {"message": "Task started", "task": task}

@tasks_router.post("/{task_id}/finish")
async def finish_task(task_id: int, completion_data: dict, x_demo_token: str = Header(None)):
    """Finish task and record completion time"""
    task = next((t for t in tasks_db if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Record finish time and calculate duration
    finish_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    task["finish_time"] = finish_time
    
    # Calculate duration if task was started
    if task.get("start_time"):
        start_dt = datetime.strptime(task["start_time"], "%Y-%m-%d %H:%M:%S")
        finish_dt = datetime.strptime(finish_time, "%Y-%m-%d %H:%M:%S")
        duration_minutes = int((finish_dt - start_dt).total_seconds() / 60)
        task["actual_duration_minutes"] = duration_minutes
    
    # Update task status
    task["estado"] = "completada"
    
    # If task has register and procedure, create register entry automatically
    if task.get("register_id") and task.get("procedure_id") and task.get("requires_signature"):
        # Get employee name
        empleado_name = empleados_map.get(task["empleado_id"], f"Empleado {task['empleado_id']}")
        
        # Generate new entry ID
        new_entry_id = max([entry["id"] for entry in register_entries_db], default=0) + 1
        
        # Create register entry
        new_entry = {
            "id": new_entry_id,
            "register_id": task["register_id"],
            "task_id": task_id,
            "procedure_id": task["procedure_id"],
            "empleado_id": task["empleado_id"],
            "empleado_name": empleado_name,
            "fecha_completado": finish_time,
            "firma_empleado": completion_data.get("firma_empleado", "Firmado digitalmente"),
            "observaciones": completion_data.get("observaciones", ""),
            "resultado": completion_data.get("resultado", "completado"),
            "tiempo_real": f"{task['actual_duration_minutes']} minutos" if task.get("actual_duration_minutes") else None,
            "created_at": finish_time
        }
        
        # Add to database
        register_entries_db.append(new_entry)
        
        return {
            "message": "Task completed and signed", 
            "task": task, 
            "register_entry": new_entry,
            "requires_signature": True
        }
    
    return {"message": "Task completed", "task": task, "requires_signature": False}

@tasks_router.get("/{task_id}/details")
async def get_task_details(task_id: int, x_demo_token: str = Header(None)):
    """Get detailed task information including procedure details"""
    task = next((t for t in tasks_db if t["id"] == task_id), None)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get procedure details if available
    procedure = None
    register = None
    if task.get("procedure_id"):
        procedure = next((p for p in procedures_db if p["id"] == task["procedure_id"]), None)
    if task.get("register_id"):
        register = next((r for r in registers_db if r["id"] == task["register_id"]), None)
    
    return {
        "task": task,
        "procedure": procedure,
        "register": register
    }

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

def validate_custom_fields(register_id: int, custom_field_data: dict):
    """Validate custom field data against register field definitions"""
    # Get register
    register = next((reg for reg in registers_db if reg["id"] == register_id), None)
    if not register:
        return False, "Register not found"
    
    campos_personalizados = register.get("campos_personalizados", [])
    errors = []
    
    # Check required fields
    for campo in campos_personalizados:
        if campo["requerido"] and campo["nombre"] not in custom_field_data:
            errors.append(f"Campo requerido faltante: {campo['etiqueta']}")
        
        # Validate field values if present
        if campo["nombre"] in custom_field_data:
            value = custom_field_data[campo["nombre"]]
            
            # Check select field options
            if campo["tipo"] == "select" and "opciones" in campo:
                if value not in campo["opciones"]:
                    errors.append(f"Valor inválido para {campo['etiqueta']}: {value}")
            
            # Basic type validation
            if campo["tipo"] == "number":
                try:
                    float(value)
                except (ValueError, TypeError):
                    errors.append(f"Valor numérico inválido para {campo['etiqueta']}: {value}")
    
    return len(errors) == 0, errors

@registers_router.post("/{register_id}/entries")
async def create_register_entry(register_id: int, entry_data: dict, x_demo_token: str = Header(None)):
    """Create a new register entry (employee signature) with custom fields"""
    # Generate new entry ID
    new_id = max([entry["id"] for entry in register_entries_db], default=0) + 1
    
    # Get employee name
    empleado_name = empleados_map.get(entry_data["empleado_id"], f"Empleado {entry_data['empleado_id']}")
    
    # Validate custom fields if provided
    custom_field_data = entry_data.get("campos_personalizados", {})
    if custom_field_data:
        is_valid, validation_errors = validate_custom_fields(register_id, custom_field_data)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Errores de validación: {'; '.join(validation_errors)}")
    
    # Create new register entry
    new_entry = {
        "id": new_id,
        "register_id": register_id,
        "task_id": entry_data.get("task_id"),
        "procedure_id": entry_data.get("procedure_id"),
        "empleado_id": entry_data["empleado_id"],
        "empleado_name": empleado_name,
        "fecha_completado": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "firma_empleado": entry_data.get("firma_empleado", "Firmado digitalmente"),
        "observaciones": entry_data.get("observaciones", ""),
        "resultado": entry_data.get("resultado", "completado"),  # completado, incompleto, con_observaciones
        "tiempo_real": entry_data.get("tiempo_real", None),
        "campos_personalizados": custom_field_data,
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
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "campos_personalizados": register_data.get("campos_personalizados", [])
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

@registers_router.put("/{register_id}")
async def update_register(register_id: int, register_data: dict, x_demo_token: str = Header(None)):
    """Update an existing register"""
    register = next((reg for reg in registers_db if reg["id"] == register_id), None)
    if not register:
        raise HTTPException(status_code=404, detail="Register not found")
    
    # Update fields
    register["nombre"] = register_data.get("nombre", register["nombre"])
    register["tipo"] = register_data.get("tipo", register["tipo"])
    register["descripcion"] = register_data.get("descripcion", register["descripcion"])
    register["activo"] = register_data.get("activo", register["activo"])
    register["campos_personalizados"] = register_data.get("campos_personalizados", register.get("campos_personalizados", []))
    
    return {"message": "Register updated", "register": register}

@registers_router.put("/{register_id}/procedures/{procedure_id}")
async def update_procedure(register_id: int, procedure_id: int, procedure_data: dict, x_demo_token: str = Header(None)):
    """Update an existing procedure"""
    procedure = next((proc for proc in procedures_db if proc["id"] == procedure_id and proc["register_id"] == register_id), None)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    
    # Update fields
    procedure["nombre"] = procedure_data.get("nombre", procedure["nombre"])
    procedure["receta"] = procedure_data.get("receta", procedure["receta"])
    procedure["procedimiento"] = procedure_data.get("procedimiento", procedure["procedimiento"])
    procedure["precauciones"] = procedure_data.get("precauciones", procedure["precauciones"])
    procedure["tiempo_estimado"] = procedure_data.get("tiempo_estimado", procedure["tiempo_estimado"])
    
    return {"message": "Procedure updated", "procedure": procedure}

@registers_router.delete("/{register_id}")
async def delete_register(register_id: int, x_demo_token: str = Header(None)):
    """Deactivate a register"""
    register = next((reg for reg in registers_db if reg["id"] == register_id), None)
    if not register:
        raise HTTPException(status_code=404, detail="Register not found")
    
    register["activo"] = False
    return {"message": "Register deactivated", "register": register}

@registers_router.delete("/{register_id}/procedures/{procedure_id}")
async def delete_procedure(register_id: int, procedure_id: int, x_demo_token: str = Header(None)):
    """Delete a procedure"""
    global procedures_db
    procedure = next((proc for proc in procedures_db if proc["id"] == procedure_id and proc["register_id"] == register_id), None)
    if not procedure:
        raise HTTPException(status_code=404, detail="Procedure not found")
    
    procedures_db = [proc for proc in procedures_db if not (proc["id"] == procedure_id and proc["register_id"] == register_id)]
    return {"message": "Procedure deleted"}

@registers_router.put("/entries/{entry_id}")
async def update_register_entry(entry_id: int, entry_data: dict, x_demo_token: str = Header(None)):
    """Update an existing register entry"""
    entry = next((ent for ent in register_entries_db if ent["id"] == entry_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Register entry not found")
    
    # Validate custom fields if provided
    if "campos_personalizados" in entry_data:
        custom_field_data = entry_data["campos_personalizados"]
        is_valid, validation_errors = validate_custom_fields(entry["register_id"], custom_field_data)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Errores de validación: {'; '.join(validation_errors)}")
    
    # Update fields
    entry["observaciones"] = entry_data.get("observaciones", entry["observaciones"])
    entry["resultado"] = entry_data.get("resultado", entry["resultado"])
    entry["tiempo_real"] = entry_data.get("tiempo_real", entry["tiempo_real"])
    if "campos_personalizados" in entry_data:
        entry["campos_personalizados"] = entry_data["campos_personalizados"]
    
    return {"message": "Register entry updated", "entry": entry}

@registers_router.get("/{register_id}/export/pdf")
async def export_register_pdf(register_id: int, fecha_inicio: str = None, fecha_fin: str = None, x_demo_token: str = Header(None)):
    """Generate PDF export of register entries"""
    # Get register info
    register = next((reg for reg in registers_db if reg["id"] == register_id), None)
    if not register:
        raise HTTPException(status_code=404, detail="Register not found")
    
    # Get entries for the register
    entries = [entry for entry in register_entries_db if entry["register_id"] == register_id]
    
    # Filter by date range if provided
    if fecha_inicio:
        entries = [entry for entry in entries if entry["fecha_completado"][:10] >= fecha_inicio]
    if fecha_fin:
        entries = [entry for entry in entries if entry["fecha_completado"][:10] <= fecha_fin]
    
    # Sort by completion date
    entries = sorted(entries, key=lambda x: x["fecha_completado"])
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.darkblue
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=12,
        textColor=colors.darkblue
    )
    
    # Build PDF content
    story = []
    
    # Title
    story.append(Paragraph(f"📋 {register['nombre']}", title_style))
    story.append(Paragraph(f"Registro Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Register description
    story.append(Paragraph("Descripción del Registro:", heading_style))
    story.append(Paragraph(register['descripcion'], styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Date range info
    if fecha_inicio or fecha_fin:
        date_range = f"Período: "
        if fecha_inicio:
            date_range += f"Desde {fecha_inicio} "
        if fecha_fin:
            date_range += f"Hasta {fecha_fin}"
        story.append(Paragraph(date_range, styles['Normal']))
        story.append(Spacer(1, 12))
    
    # Entries summary
    story.append(Paragraph("Resumen de Entradas:", heading_style))
    story.append(Paragraph(f"Total de entradas registradas: {len(entries)}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    if entries:
        # Create entries table
        table_data = [['Fecha', 'Empleado', 'Procedimiento', 'Resultado', 'Observaciones']]
        
        for entry in entries:
            # Get procedure name
            procedure_name = "N/A"
            if entry["procedure_id"]:
                procedure = next((p for p in procedures_db if p["id"] == entry["procedure_id"]), None)
                if procedure:
                    procedure_name = procedure["nombre"]
            
            table_data.append([
                entry["fecha_completado"][:10],  # Date only
                entry["empleado_name"],
                procedure_name,
                entry["resultado"].title(),
                entry["observaciones"][:50] + "..." if len(entry["observaciones"]) > 50 else entry["observaciones"]
            ])
        
        # Create and style table
        table = Table(table_data, colWidths=[1.2*inch, 1.5*inch, 2*inch, 1*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(table)
        story.append(Spacer(1, 20))
        
        # Detailed entries
        story.append(Paragraph("Detalles de Entradas:", heading_style))
        
        for i, entry in enumerate(entries, 1):
            # Get procedure details
            procedure = None
            if entry["procedure_id"]:
                procedure = next((p for p in procedures_db if p["id"] == entry["procedure_id"]), None)
            
            story.append(Paragraph(f"Entrada #{i}", styles['Heading3']))
            story.append(Paragraph(f"<b>Fecha:</b> {entry['fecha_completado']}", styles['Normal']))
            story.append(Paragraph(f"<b>Empleado:</b> {entry['empleado_name']}", styles['Normal']))
            story.append(Paragraph(f"<b>Resultado:</b> {entry['resultado'].title()}", styles['Normal']))
            
            if procedure:
                story.append(Paragraph(f"<b>Procedimiento:</b> {procedure['nombre']}", styles['Normal']))
                story.append(Paragraph(f"<b>Tiempo Estimado:</b> {procedure['tiempo_estimado']}", styles['Normal']))
            
            if entry["observaciones"]:
                story.append(Paragraph(f"<b>Observaciones:</b> {entry['observaciones']}", styles['Normal']))
            
            story.append(Paragraph(f"<b>Firma:</b> {entry['firma_empleado']}", styles['Normal']))
            story.append(Spacer(1, 12))
    else:
        story.append(Paragraph("No se encontraron entradas para el período seleccionado.", styles['Normal']))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    # Return PDF as base64 encoded string
    pdf_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "pdf_base64": pdf_base64,
        "filename": f"registro_{register['nombre'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    }

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
app.include_router(employees_router)
app.include_router(permissions_router)
app.include_router(roles_router)

# Permission Management Endpoints
@permissions_router.get("")
async def get_permissions(user: Dict[str, Any] = Depends(require_permission("system.manage_permissions"))):
    """Get all available permissions"""
    return {"permissions": permissions_db}

@permissions_router.get("/categories")
async def get_permission_categories(user: Dict[str, Any] = Depends(require_permission("system.manage_permissions"))):
    """Get permission categories"""
    categories = {}
    for perm in permissions_db:
        category = perm["category"]
        if category not in categories:
            categories[category] = []
        categories[category].append(perm)
    return {"categories": categories}

# Role Management Endpoints
@roles_router.get("")
async def get_roles(user: Dict[str, Any] = Depends(require_permission("system.manage_roles"))):
    """Get all roles"""
    roles = []
    for role_id, permissions in role_permissions_db.items():
        role_info = {
            "id": role_id,
            "name": role_id.title(),
            "permissions": permissions,
            "is_system_role": role_id in ["admin", "encargado", "trabajador"]
        }
        roles.append(role_info)
    return {"roles": roles}

@roles_router.get("/{role_id}/permissions")
async def get_role_permissions(role_id: str, user: Dict[str, Any] = Depends(require_permission("system.manage_permissions"))):
    """Get permissions for a specific role"""
    if role_id not in role_permissions_db:
        raise HTTPException(status_code=404, detail="Role not found")
    
    return {"role": role_id, "permissions": role_permissions_db[role_id]}

@roles_router.put("/{role_id}/permissions")
async def update_role_permissions(
    role_id: str, 
    permission_data: dict, 
    user: Dict[str, Any] = Depends(require_permission("system.manage_permissions"))
):
    """Update permissions for a role"""
    if role_id not in role_permissions_db:
        raise HTTPException(status_code=404, detail="Role not found")
    
    new_permissions = permission_data.get("permissions", [])
    
    # Validate permissions exist
    valid_permissions = [perm["id"] for perm in permissions_db]
    for perm in new_permissions:
        if perm not in valid_permissions:
            raise HTTPException(status_code=400, detail=f"Invalid permission: {perm}")
    
    # Update role permissions
    role_permissions_db[role_id] = new_permissions
    
    return {"message": "Role permissions updated", "role": role_id, "permissions": new_permissions}

@roles_router.post("")
async def create_role(
    role_data: dict, 
    user: Dict[str, Any] = Depends(require_permission("system.manage_roles"))
):
    """Create a new role"""
    role_id = role_data.get("id", "").lower().replace(" ", "_")
    role_name = role_data.get("name", "")
    permissions = role_data.get("permissions", [])
    
    if not role_id or not role_name:
        raise HTTPException(status_code=400, detail="Role ID and name are required")
    
    if role_id in role_permissions_db:
        raise HTTPException(status_code=400, detail="Role already exists")
    
    # Validate permissions
    valid_permissions = [perm["id"] for perm in permissions_db]
    for perm in permissions:
        if perm not in valid_permissions:
            raise HTTPException(status_code=400, detail=f"Invalid permission: {perm}")
    
    # Create role
    role_permissions_db[role_id] = permissions
    
    return {"message": "Role created", "role": role_id, "permissions": permissions}

@roles_router.delete("/{role_id}")
async def delete_role(
    role_id: str, 
    user: Dict[str, Any] = Depends(require_permission("system.manage_roles"))
):
    """Delete a role (cannot delete system roles)"""
    if role_id in ["admin", "encargado", "trabajador"]:
        raise HTTPException(status_code=400, detail="Cannot delete system roles")
    
    if role_id not in role_permissions_db:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Check if any users have this role
    users_with_role = [emp for emp in empleados_db if emp["role"] == role_id]
    if users_with_role:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot delete role. {len(users_with_role)} users are assigned this role"
        )
    
    # Delete role
    del role_permissions_db[role_id]
    
    return {"message": "Role deleted", "role": role_id}

# Get current user permissions
@auth_router.get("/me/permissions")
async def get_current_user_permissions(user: Dict[str, Any] = Depends(get_user_from_token)):
    """Get current user's permissions"""
    user_permissions = role_permissions_db.get(user.get("role", ""), [])
    return {"user": user, "permissions": user_permissions}

print("Starting FastAPI backend with CORS configuration")