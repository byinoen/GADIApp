from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse
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
from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models import Base, Employee, Schedule, Task, Permission, Role, Register, Procedure, RegisterEntry, ManagerInboxNotification, RecurringTask, TaskDefinition, TaskAssignment

health_router = APIRouter()
auth_router = APIRouter(prefix="/auth", tags=["auth"])
schedules_router = APIRouter(prefix="/schedules", tags=["schedules"])
tasks_router = APIRouter(prefix="/tasks", tags=["tasks"])
task_definitions_router = APIRouter(prefix="/task-definitions", tags=["task-definitions"])
task_assignments_router = APIRouter(prefix="/task-assignments", tags=["task-assignments"])
inbox_router = APIRouter(prefix="/inbox", tags=["inbox"])
registers_router = APIRouter(prefix="/registers", tags=["registers"])
permissions_router = APIRouter(prefix="/permissions", tags=["permissions"])
roles_router = APIRouter(prefix="/roles", tags=["roles"])

# In-memory storage for schedules - CONVERTED TO DATABASE (commented out for reference)
# schedules_db = [
#     {"id": 1, "fecha": "2025-09-08", "turno": "Mañana (08:00-16:00)", "empleado": "Juan Pérez", "empleado_id": 1},
#     {"id": 2, "fecha": "2025-09-08", "turno": "Tarde (16:00-00:00)", "empleado": "María García", "empleado_id": 2},
#     {"id": 3, "fecha": "2025-09-09", "turno": "Noche (00:00-08:00)", "empleado": "Carlos López", "empleado_id": 3}
# ]

# Employee database with authentication data - CONVERTED TO DATABASE (commented out for reference)
# empleados_db = [
#     {"id": 1, "nombre": "Juan Pérez", "email": "juan@example.com", "role": "trabajador", "telefono": "+34 123 456 789", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
#     {"id": 2, "nombre": "María García", "email": "maria@example.com", "role": "trabajador", "telefono": "+34 123 456 790", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
#     {"id": 3, "nombre": "Carlos López", "email": "carlos@example.com", "role": "trabajador", "telefono": "+34 123 456 791", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
#     {"id": 4, "nombre": "Ana Martínez", "email": "ana@example.com", "role": "encargado", "telefono": "+34 123 456 792", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"},
#     {"id": 5, "nombre": "Pedro Sánchez", "email": "pedro@example.com", "role": "trabajador", "telefono": "+34 123 456 793", "activo": True, "created_at": "2025-09-01 10:00:00", "password": "1234"}
# ]

# Employee mapping for backward compatibility - REPLACED WITH DATABASE QUERIES (commented out for reference)
# empleados_map = {emp["id"]: emp["nombre"] for emp in empleados_db}

# In-memory storage for tasks - CONVERTED TO DATABASE (commented out for reference)
# tasks_db = [
#     {"id": 1, "titulo": "Revisar inventario", "descripcion": "Contar y verificar productos en almacén", "empleado_id": 1, "empleado": "Juan Pérez", "fecha": "2025-09-08", "estado": "pendiente", "prioridad": "media", "is_recurring": False, "frequency": None, "parent_task_id": None},
#     {"id": 2, "titulo": "Limpiar área de trabajo", "descripcion": "Mantener limpieza en zona de producción", "empleado_id": 2, "empleado": "María García", "fecha": "2025-09-08", "estado": "en_progreso", "prioridad": "baja", "is_recurring": False, "frequency": None, "parent_task_id": None},
#     {"id": 3, "titulo": "Preparar reporte diario", "descripcion": "Elaborar resumen de actividades del turno", "empleado_id": 1, "empleado": "Juan Pérez", "fecha": "2025-09-09", "estado": "completada", "prioridad": "alta", "is_recurring": False, "frequency": None, "parent_task_id": None}
# ]

# In-memory storage for recurring task templates - CONVERTED TO DATABASE (commented out for reference)
# recurring_tasks_db = []

# In-memory storage for manager inbox - TO BE CONVERTED TO DATABASE (commented out for reference)
# manager_inbox_db = []

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

# Session store for user contexts (in-memory for demo)
session_store = {}

# Permission checking utilities
def get_user_from_token(x_demo_token: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Extract user information from token"""
    if not x_demo_token:
        raise HTTPException(status_code=401, detail="Authentication token required")
    
    # Check if user session exists for this token
    if x_demo_token in session_store:
        return session_store[x_demo_token]
    
    # If no session, token is invalid or expired
    raise HTTPException(status_code=401, detail="Invalid token or session expired. Please login again.")

def has_permission(user: Dict[str, Any], permission: str, db: Session = None) -> bool:
    """Check if user has a specific permission"""
    if db is None:
        # Create a new session if none provided
        from app.database import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
    try:
        user_role = user.get("role", "")
        
        # Query the role from database
        role = db.query(Role).filter(Role.id == user_role).first()
        if role:
            # Check if permission is in the role's permissions list
            role_permissions = role.permissions or []
            return permission in role_permissions
        
        # Fallback to in-memory role_permissions_db if role not found in database
        role_permissions = role_permissions_db.get(user_role, [])
        return permission in role_permissions
        
    finally:
        if should_close:
            db.close()

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
async def get_employees(user: Dict[str, Any] = Depends(require_permission("employees.view")), db: Session = Depends(get_db)):
    """Get all employees"""
    employees = db.query(Employee).filter(Employee.activo == True).all()
    
    # Convert to dict format for API response
    employees_data = [{
        "id": emp.id,
        "nombre": emp.nombre,
        "email": emp.email,
        "role": emp.role,
        "telefono": emp.telefono,
        "activo": emp.activo,
        "created_at": emp.created_at.isoformat() if emp.created_at is not None else None,
        "password": emp.password
    } for emp in employees]
    
    return {"employees": employees_data}

@employees_router.get("/{employee_id}")
async def get_employee(employee_id: int, user: Dict[str, Any] = Depends(require_permission("employees.view")), db: Session = Depends(get_db)):
    """Get specific employee"""
    employee = db.query(Employee).filter(Employee.id == employee_id, Employee.activo == True).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee_data = {
        "id": employee.id,
        "nombre": employee.nombre,
        "email": employee.email,
        "role": employee.role,
        "telefono": employee.telefono,
        "activo": employee.activo,
        "created_at": employee.created_at.isoformat() if employee.created_at is not None else None,
        "password": employee.password
    }
    
    return {"employee": employee_data}

@employees_router.post("")
async def create_employee(employee_data: dict, user: Dict[str, Any] = Depends(require_permission("employees.create")), db: Session = Depends(get_db)):
    """Create a new employee"""
    # Set default password if not provided
    default_password = employee_data.get("password", "1234")
    
    # Check if email already exists
    existing_employee = db.query(Employee).filter(Employee.email == employee_data["email"]).first()
    if existing_employee:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new employee instance
    new_employee = Employee(
        nombre=employee_data["nombre"],
        email=employee_data["email"],
        role=employee_data.get("role", "trabajador"),
        telefono=employee_data.get("telefono", ""),
        activo=employee_data.get("activo", True),
        password=default_password
    )
    
    # Add to database
    try:
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)
    except Exception as e:
        db.rollback()
        # Handle database constraint violations
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="Error creating employee: duplicate key constraint")
        elif "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail="Error creating employee: email or ID already exists") 
        else:
            raise HTTPException(status_code=500, detail=f"Error creating employee: {str(e)}")
    
    # Convert to dict format for response
    employee_dict = {
        "id": new_employee.id,
        "nombre": new_employee.nombre,
        "email": new_employee.email,
        "role": new_employee.role,
        "telefono": new_employee.telefono,
        "activo": new_employee.activo,
        "password": new_employee.password,
        "created_at": new_employee.created_at.isoformat() if new_employee.created_at else None
    }
    
    return {"message": "Employee created", "employee": employee_dict}

@employees_router.put("/{employee_id}")
async def update_employee(employee_id: int, employee_data: dict, user: Dict[str, Any] = Depends(require_permission("employees.edit")), db: Session = Depends(get_db)):
    """Update employee information"""
    # Get employee from database
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if email is being changed and if new email already exists
    if "email" in employee_data and employee_data["email"] != employee.email:
        existing_employee = db.query(Employee).filter(Employee.email == employee_data["email"]).first()
        if existing_employee:
            raise HTTPException(status_code=400, detail="Email already exists")
    
    # Update fields
    if "nombre" in employee_data:
        employee.nombre = employee_data["nombre"]
    if "email" in employee_data:
        employee.email = employee_data["email"]
    if "role" in employee_data:
        employee.role = employee_data["role"]
    if "telefono" in employee_data:
        employee.telefono = employee_data["telefono"]
    if "activo" in employee_data:
        employee.activo = employee_data["activo"]
    if "password" in employee_data:
        employee.password = employee_data["password"]
    
    # Save changes to database
    db.commit()
    db.refresh(employee)
    
    # Convert to dict format for response
    employee_dict = {
        "id": employee.id,
        "nombre": employee.nombre,
        "email": employee.email,
        "role": employee.role,
        "telefono": employee.telefono,
        "activo": employee.activo,
        "password": employee.password,
        "created_at": employee.created_at.isoformat() if employee.created_at else None
    }
    
    return {"message": "Employee updated", "employee": employee_dict}

@employees_router.delete("/{employee_id}")
async def delete_employee(employee_id: int, user: Dict[str, Any] = Depends(require_permission("employees.deactivate")), db: Session = Depends(get_db)):
    """Delete/deactivate employee"""
    # Get employee from database
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Deactivate instead of delete to maintain data integrity
    employee.activo = False
    
    # Save changes to database
    db.commit()
    db.refresh(employee)
    
    # Convert to dict format for response
    employee_dict = {
        "id": employee.id,
        "nombre": employee.nombre,
        "email": employee.email,
        "role": employee.role,
        "telefono": employee.telefono,
        "activo": employee.activo,
        "password": employee.password,
        "created_at": employee.created_at.isoformat() if employee.created_at else None
    }
    
    return {"message": "Employee deactivated", "employee": employee_dict}

@auth_router.post("/login")
async def login_user(request: dict, db: Session = Depends(get_db)):
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
        # Check employees from database
        employee = db.query(Employee).filter(
            Employee.email == email,
            Employee.password == password,
            Employee.activo == True
        ).first()
        
        if employee:
            user_data = {
                "id": employee.id,
                "email": employee.email,
                "role": employee.role,
                "nombre": employee.nombre
            }
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # User data is now stored above with the generated token
    
    # Get user permissions from database
    role = db.query(Role).filter(Role.id == user_data["role"]).first()
    user_permissions = role.permissions if role else []
    
    # Generate unique token for this session
    import uuid
    token = str(uuid.uuid4())
    
    # Store user context in session store using unique token
    session_store[token] = user_data
    
    return {
        "access_token": token, 
        "user": user_data,
        "permissions": user_permissions
    }

@schedules_router.get("")
async def get_schedules(user: Dict[str, Any] = Depends(require_permission("schedules.view")), db: Session = Depends(get_db)):
    # Return all schedules sorted by date, then by shift
    schedules = db.query(Schedule).join(Employee).filter(Employee.activo == True).all()
    
    # Convert to dict format with employee names
    schedules_data = []
    for schedule in schedules:
        schedules_data.append({
            "id": schedule.id,
            "fecha": schedule.fecha,
            "turno": schedule.turno,
            "empleado_id": schedule.empleado_id,
            "empleado": schedule.employee.nombre
        })
    
    # Sort by date, then by shift
    sorted_schedules = sorted(schedules_data, key=lambda x: (x["fecha"], x["turno"]))
    return {"schedules": sorted_schedules}

@schedules_router.post("")
async def create_schedule(schedule: dict, user: Dict[str, Any] = Depends(require_permission("schedules.create")), db: Session = Depends(get_db)):
    # Validate employee exists
    employee = db.query(Employee).filter(Employee.id == schedule["empleado_id"], Employee.activo == True).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if schedule already exists for this employee on this date and shift
    existing_schedule = db.query(Schedule).filter(
        Schedule.empleado_id == schedule["empleado_id"],
        Schedule.fecha == schedule["fecha"],
        Schedule.turno == schedule["turno"]
    ).first()
    if existing_schedule:
        raise HTTPException(status_code=400, detail="Schedule already exists for this employee on this date and shift")
    
    # Create new schedule instance
    new_schedule = Schedule(
        fecha=schedule["fecha"],
        turno=schedule["turno"],
        empleado_id=schedule["empleado_id"]
    )
    
    # Add to database
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    
    # Convert to dict format for response
    schedule_dict = {
        "id": new_schedule.id,
        "fecha": new_schedule.fecha,
        "turno": new_schedule.turno,
        "empleado_id": new_schedule.empleado_id,
        "empleado": employee.nombre
    }
    
    return {"message": "Schedule created", "schedule": schedule_dict}

@tasks_router.get("")
async def get_tasks(empleado_id: int = None, user: Dict[str, Any] = Depends(require_any_permission(["tasks.view", "tasks.view_all"])), db: Session = Depends(get_db)):
    # Check if user can see all tasks or only their own
    can_view_all = has_permission(user, "tasks.view_all")
    
    # Build base query
    query = db.query(Task).join(Employee).filter(Employee.activo == True)
    
    # If empleado_id is provided, filter tasks for that employee
    if empleado_id:
        # Check if user can view this employee's tasks
        if not can_view_all and user.get("id") != empleado_id:
            raise HTTPException(status_code=403, detail="Can only view your own tasks")
        query = query.filter(Task.empleado_id == empleado_id)
    elif not can_view_all:
        # If user can't view all tasks, only return their own
        query = query.filter(Task.empleado_id == user.get("id"))
    
    # Execute query and get tasks
    tasks = query.all()
    
    # Convert to dict format
    tasks_data = []
    for task in tasks:
        task_dict = {
            "id": task.id,
            "titulo": task.titulo,
            "descripcion": task.descripcion,
            "empleado_id": task.empleado_id,
            "empleado": task.employee.nombre,
            "fecha": task.fecha,
            "estado": task.estado,
            "prioridad": task.prioridad,
            "is_recurring": task.is_recurring,
            "frequency": task.frequency,
            "parent_task_id": task.parent_task_id
        }
        tasks_data.append(task_dict)
    
    # Sort tasks by date and priority
    sorted_tasks = sorted(tasks_data, key=lambda x: (x["fecha"], x["prioridad"]))
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

def is_employee_working(empleado_id: int, fecha: str, db: Session = None) -> bool:
    """Check if employee is scheduled to work on a specific date"""
    if db is None:
        from app.database import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
    try:
        schedule = db.query(Schedule).filter(
            Schedule.empleado_id == empleado_id,
            Schedule.fecha == fecha
        ).first()
        return schedule is not None
    finally:
        if should_close:
            db.close()

def create_conflict_notification(task_data: dict, conflict_type: str, db: Session = None):
    """Create a conflict notification for managers"""
    if db is None:
        from app.database import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
    try:
        # Get employee name
        employee = db.query(Employee).filter(Employee.id == task_data["empleado_id"]).first()
        empleado_name = employee.nombre if employee else f"Empleado {task_data['empleado_id']}"
        
        # Create notification
        notification = ManagerInboxNotification(
            type=conflict_type,
            title="Conflicto de Programación",
            description=f"No se puede asignar tarea '{task_data['titulo']}' a {empleado_name} el {task_data['fecha']} - no está programado para trabajar",
            status="pending",
            data={
                "task_data": task_data,
                "empleado_id": task_data["empleado_id"],
                "empleado_name": empleado_name,
                "fecha": task_data["fecha"]
            }
        )
        
        db.add(notification)
        db.commit()
        db.refresh(notification)
        
        return {
            "id": notification.id,
            "type": notification.type,
            "title": notification.title,
            "description": notification.description,
            "status": notification.status,
            "data": notification.data,
            "created_at": notification.created_at.isoformat() if notification.created_at else None
        }
    finally:
        if should_close:
            db.close()

def generate_recurring_tasks(db: Session = None):
    """Generate new instances of recurring tasks that are due"""
    if db is None:
        from app.database import SessionLocal
        db = SessionLocal()
        should_close = True
    else:
        should_close = False
    
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Get all active recurring tasks
        recurring_tasks = db.query(RecurringTask).filter(RecurringTask.activo == True).all()
        
        for recurring_task in recurring_tasks:
            # Calculate next generation date if not set
            if recurring_task.last_generated is None:
                last_generated_str = today
            else:
                last_generated_str = recurring_task.last_generated.strftime("%Y-%m-%d")
            
            next_generation_date = calculate_next_date(last_generated_str, str(recurring_task.frequency))
            
            # Check if it's time to generate next instance
            if next_generation_date <= today:
                # Check if employee is working on that date
                if is_employee_working(int(recurring_task.empleado_id), next_generation_date, db):
                    # Create new task instance
                    new_task = Task(
                        titulo=recurring_task.titulo,
                        descripcion=recurring_task.descripcion,
                        empleado_id=recurring_task.empleado_id,
                        fecha=next_generation_date,
                        estado="pendiente",
                        prioridad=recurring_task.prioridad,
                        is_recurring=False,
                        frequency=None,
                        parent_task_id=recurring_task.id
                    )
                    
                    db.add(new_task)
                    
                    # Update last generated date for recurring task
                    recurring_task.last_generated = datetime.now()
                else:
                    # Create conflict notification for recurring task
                    conflict_data = {
                        "titulo": recurring_task.titulo,
                        "descripcion": recurring_task.descripcion,
                        "empleado_id": recurring_task.empleado_id,
                        "fecha": next_generation_date,
                        "prioridad": recurring_task.prioridad,
                        "frequency": recurring_task.frequency
                    }
                    create_conflict_notification(conflict_data, "recurring_conflict", db)
                    
                    # Update to next possible date
                    recurring_task.last_generated = datetime.now()
        
        db.commit()
        
    finally:
        if should_close:
            db.close()

@tasks_router.post("")
async def create_task(task: dict, user: Dict[str, Any] = Depends(require_permission("tasks.create")), db: Session = Depends(get_db)):
    # Validate employee exists and is active
    employee = db.query(Employee).filter(Employee.id == task["empleado_id"], Employee.activo == True).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if employee is working on the task date (check schedule)
    schedule = db.query(Schedule).filter(
        Schedule.empleado_id == task["empleado_id"],
        Schedule.fecha == task["fecha"]
    ).first()
    
    if not schedule:
        # For now, we'll allow task creation even without schedule
        # In a production environment, you might want to enforce schedule requirements
        pass
    
    # Check if this is a recurring task
    is_recurring = task.get("is_recurring", False)
    frequency = task.get("frequency", None)
    
    # If it's a recurring task, create the recurring task template first
    recurring_task_id = None
    if is_recurring and frequency:
        recurring_task = RecurringTask(
            titulo=task["titulo"],
            descripcion=task.get("descripcion", ""),
            empleado_id=task["empleado_id"],
            frequency=frequency,
            prioridad=task.get("prioridad", "media"),
            activo=True
        )
        db.add(recurring_task)
        db.commit()
        db.refresh(recurring_task)
        recurring_task_id = recurring_task.id
    
    # Create new task instance
    new_task = Task(
        titulo=task["titulo"],
        descripcion=task.get("descripcion", ""),
        empleado_id=task["empleado_id"],
        fecha=task["fecha"],
        estado="pendiente",
        prioridad=task.get("prioridad", "media"),
        is_recurring=is_recurring,
        frequency=frequency,
        parent_task_id=recurring_task_id if is_recurring else None
    )
    
    # Add to database
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Convert to dict format for response
    task_dict = {
        "id": new_task.id,
        "titulo": new_task.titulo,
        "descripcion": new_task.descripcion,
        "empleado_id": new_task.empleado_id,
        "empleado": employee.nombre,
        "fecha": new_task.fecha,
        "estado": new_task.estado,
        "prioridad": new_task.prioridad,
        "is_recurring": new_task.is_recurring,
        "frequency": new_task.frequency,
        "parent_task_id": new_task.parent_task_id
    }
    
    message = "Recurring task created" if is_recurring else "Task created"
    return {"message": message, "task": task_dict}

@tasks_router.put("/{task_id}")
async def update_task_status(task_id: int, update_data: dict, user: Dict[str, Any] = Depends(get_user_from_token), db: Session = Depends(get_db)):
    # Find task from database
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get employee info
    employee = db.query(Employee).filter(Employee.id == task.empleado_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update fields if provided
    if "estado" in update_data:
        task.estado = update_data["estado"]
    if "titulo" in update_data:
        task.titulo = update_data["titulo"]
    if "descripcion" in update_data:
        task.descripcion = update_data["descripcion"]
    if "prioridad" in update_data:
        task.prioridad = update_data["prioridad"]
    
    # Save changes
    db.commit()
    db.refresh(task)
    
    # Convert to dict format for response
    task_dict = {
        "id": task.id,
        "titulo": task.titulo,
        "descripcion": task.descripcion,
        "empleado_id": task.empleado_id,
        "empleado": employee.nombre,
        "fecha": task.fecha,
        "estado": task.estado,
        "prioridad": task.prioridad,
        "is_recurring": task.is_recurring,
        "frequency": task.frequency,
        "parent_task_id": task.parent_task_id
    }
    
    return {"message": "Task updated", "task": task_dict}

@tasks_router.post("/{task_id}/start")
async def start_task(task_id: int, user: Dict[str, Any] = Depends(get_user_from_token), db: Session = Depends(get_db)):
    """Start task timer"""
    # Find task from database
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get employee info
    employee = db.query(Employee).filter(Employee.id == task.empleado_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Update task to in_progress with start time
    task.estado = "en_progreso"
    task.start_time = datetime.now()
    task.actual_duration_minutes = None
    
    # Save changes
    db.commit()
    db.refresh(task)
    
    # Convert to dict format for response
    task_dict = {
        "id": task.id,
        "titulo": task.titulo,
        "descripcion": task.descripcion,
        "empleado_id": task.empleado_id,
        "empleado": employee.nombre,
        "fecha": task.fecha,
        "estado": task.estado,
        "prioridad": task.prioridad,
        "is_recurring": task.is_recurring,
        "frequency": task.frequency,
        "parent_task_id": task.parent_task_id,
        "start_time": task.start_time.isoformat() if task.start_time else None
    }
    
    return {"message": "Task started", "task": task_dict}

@tasks_router.post("/{task_id}/finish")
async def finish_task(task_id: int, completion_data: dict, user: Dict[str, Any] = Depends(get_user_from_token), db: Session = Depends(get_db)):
    """Finish task and record completion time"""
    # Find task from database
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get employee info
    employee = db.query(Employee).filter(Employee.id == task.empleado_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Record finish time and calculate duration
    finish_time = datetime.now()
    
    # Calculate duration if task was started
    duration_minutes = None
    if task.start_time:
        duration_seconds = (finish_time - task.start_time).total_seconds()
        duration_minutes = int(duration_seconds / 60)
        task.actual_duration_minutes = duration_minutes
    
    # Update task status
    task.estado = "completada"
    
    # Save task changes
    db.commit()
    db.refresh(task)
    
    # Convert task to dict format for response
    task_dict = {
        "id": task.id,
        "titulo": task.titulo,
        "descripcion": task.descripcion,
        "empleado_id": task.empleado_id,
        "empleado": employee.nombre,
        "fecha": task.fecha,
        "estado": task.estado,
        "prioridad": task.prioridad,
        "is_recurring": task.is_recurring,
        "frequency": task.frequency,
        "parent_task_id": task.parent_task_id,
        "start_time": task.start_time.isoformat() if task.start_time else None,
        "actual_duration_minutes": task.actual_duration_minutes,
        "finish_time": finish_time.isoformat()
    }
    
    # For now, we'll skip the register entry creation since those models need to be updated
    # In a complete implementation, you would also create RegisterEntry if required
    
    return {"message": "Task completed", "task": task_dict, "requires_signature": False}

@tasks_router.get("/{task_id}/details")
async def get_task_details(task_id: int, user: Dict[str, Any] = Depends(get_user_from_token), db: Session = Depends(get_db)):
    """Get detailed task information including procedure details"""
    # Find task from database
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Get employee info
    employee = db.query(Employee).filter(Employee.id == task.empleado_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Convert task to dict format
    task_dict = {
        "id": task.id,
        "titulo": task.titulo,
        "descripcion": task.descripcion,
        "empleado_id": task.empleado_id,
        "empleado": employee.nombre,
        "fecha": task.fecha,
        "estado": task.estado,
        "prioridad": task.prioridad,
        "is_recurring": task.is_recurring,
        "frequency": task.frequency,
        "parent_task_id": task.parent_task_id,
        "start_time": task.start_time.isoformat() if task.start_time else None,
        "actual_duration_minutes": task.actual_duration_minutes
    }
    
    # Get procedure and register details from database if available
    procedure = None
    register = None
    
    # Note: procedure_id and register_id are not in current Task model
    # These would need to be added to the model if required
    
    return {
        "task": task_dict,
        "procedure": procedure,
        "register": register
    }

# Manager Inbox Routes
@inbox_router.get("")
async def get_inbox_notifications(x_demo_token: str = Header(None), db: Session = Depends(get_db)):
    """Get all pending conflict notifications for managers"""
    # Get all pending notifications from database
    notifications = db.query(ManagerInboxNotification).filter(
        ManagerInboxNotification.status == "pending"
    ).order_by(ManagerInboxNotification.created_at.desc()).all()
    
    # Convert to dict format
    notifications_data = [{
        "id": notif.id,
        "type": notif.type,
        "title": notif.title,
        "description": notif.description,
        "status": notif.status,
        "data": notif.data,
        "created_at": notif.created_at.isoformat() if notif.created_at else None
    } for notif in notifications]
    
    return {"notifications": notifications_data}

@inbox_router.post("/{notification_id}/reassign")
async def reassign_task(notification_id: int, reassignment_data: dict, x_demo_token: str = Header(None), db: Session = Depends(get_db)):
    """Reassign a conflicted task to another employee"""
    # Find the notification
    notification = db.query(ManagerInboxNotification).filter(
        ManagerInboxNotification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    new_empleado_id = reassignment_data["new_empleado_id"]
    
    # Get new employee name
    new_employee = db.query(Employee).filter(Employee.id == new_empleado_id).first()
    if not new_employee:
        raise HTTPException(status_code=404, detail="New employee not found")
    new_empleado_name = new_employee.nombre
    
    # Get task data from notification
    task_data = notification.data.get("task_data", {})
    fecha = notification.data.get("fecha", "")
    
    # Check if new employee is working on that date
    if not is_employee_working(new_empleado_id, fecha, db):
        return {
            "error": "reassignment_conflict",
            "message": f"{new_empleado_name} tampoco está programado para trabajar el {fecha}"
        }
    
    # Create the task with new assignment
    new_task = Task(
        titulo=task_data.get("titulo", ""),
        descripcion=task_data.get("descripcion", ""),
        empleado_id=new_empleado_id,
        fecha=fecha,
        estado="pendiente",
        prioridad=task_data.get("prioridad", "media"),
        is_recurring=task_data.get("is_recurring", False),
        frequency=task_data.get("frequency")
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Mark notification as resolved
    notification.status = "resolved"
    notification.data = notification.data or {}
    notification.data["resolution"] = f"Tarea reasignada a {new_empleado_name}"
    notification.data["resolved_at"] = datetime.now().isoformat()
    
    db.commit()
    db.refresh(notification)
    
    # Convert to dict format for response
    task_dict = {
        "id": new_task.id,
        "titulo": new_task.titulo,
        "descripcion": new_task.descripcion,
        "empleado_id": new_task.empleado_id,
        "empleado": new_empleado_name,
        "fecha": new_task.fecha,
        "estado": new_task.estado,
        "prioridad": new_task.prioridad,
        "is_recurring": new_task.is_recurring,
        "frequency": new_task.frequency,
        "parent_task_id": new_task.parent_task_id
    }
    
    return {
        "message": f"Tarea reasignada exitosamente a {new_empleado_name}",
        "task": task_dict,
        "notification": {
            "id": notification.id,
            "status": notification.status,
            "data": notification.data
        }
    }

@inbox_router.post("/{notification_id}/reschedule")
async def reschedule_task(notification_id: int, reschedule_data: dict, x_demo_token: str = Header(None), db: Session = Depends(get_db)):
    """Reschedule a conflicted task to a different date"""
    # Find the notification
    notification = db.query(ManagerInboxNotification).filter(
        ManagerInboxNotification.id == notification_id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    new_fecha = reschedule_data["new_fecha"]
    
    # Get task data from notification
    task_data = notification.data.get("task_data", {})
    empleado_id = notification.data.get("empleado_id", 0)
    empleado_name = notification.data.get("empleado_name", f"Empleado {empleado_id}")
    
    # Check if employee is working on the new date
    if not is_employee_working(empleado_id, new_fecha, db):
        return {
            "error": "reschedule_conflict",
            "message": f"{empleado_name} tampoco está programado para trabajar el {new_fecha}"
        }
    
    # Create rescheduled task
    new_task = Task(
        titulo=task_data.get("titulo", ""),
        descripcion=task_data.get("descripcion", ""),
        empleado_id=empleado_id,
        fecha=new_fecha,
        estado="pendiente",
        prioridad=task_data.get("prioridad", "media"),
        is_recurring=task_data.get("is_recurring", False),
        frequency=task_data.get("frequency")
    )
    
    # Add to database
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Mark notification as resolved
    notification.status = "resolved"
    notification.data = notification.data or {}
    notification.data["resolution"] = f"Tarea reprogramada para {new_fecha}"
    notification.data["resolved_at"] = datetime.now().isoformat()
    
    db.commit()
    db.refresh(notification)
    
    # Convert to dict format for response
    task_dict = {
        "id": new_task.id,
        "titulo": new_task.titulo,
        "descripcion": new_task.descripcion,
        "empleado_id": new_task.empleado_id,
        "empleado": empleado_name,
        "fecha": new_task.fecha,
        "estado": new_task.estado,
        "prioridad": new_task.prioridad,
        "is_recurring": new_task.is_recurring,
        "frequency": new_task.frequency,
        "parent_task_id": new_task.parent_task_id
    }
    
    return {
        "message": f"Tarea reprogramada exitosamente para {new_fecha}",
        "task": task_dict,
        "notification": {
            "id": notification.id,
            "status": notification.status,
            "data": notification.data
        }
    }

# Enhanced schedule route to include tasks
@schedules_router.get("/{schedule_id}/tasks")
async def get_schedule_tasks(schedule_id: int, user: Dict[str, Any] = Depends(get_user_from_token), db: Session = Depends(get_db)):
    """Get all tasks for a specific schedule/date"""
    # Find the schedule from database
    schedule = db.query(Schedule).filter(Schedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    
    # Get employee info
    employee = db.query(Employee).filter(Employee.id == schedule.empleado_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Find tasks for this employee on this date from database
    tasks = db.query(Task).filter(
        Task.empleado_id == schedule.empleado_id,
        Task.fecha == schedule.fecha
    ).all()
    
    # Convert tasks to dict format
    schedule_tasks = []
    for task in tasks:
        task_dict = {
            "id": task.id,
            "titulo": task.titulo,
            "descripcion": task.descripcion,
            "empleado_id": task.empleado_id,
            "empleado": employee.nombre,
            "fecha": task.fecha,
            "estado": task.estado,
            "prioridad": task.prioridad,
            "is_recurring": task.is_recurring,
            "frequency": task.frequency,
            "parent_task_id": task.parent_task_id
        }
        schedule_tasks.append(task_dict)
    
    # Convert schedule to dict format
    schedule_dict = {
        "id": schedule.id,
        "fecha": schedule.fecha,
        "turno": schedule.turno,
        "empleado_id": schedule.empleado_id,
        "empleado": employee.nombre
    }
    
    return {
        "schedule": schedule_dict,
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
    employee = db.query(Employee).filter(Employee.id == entry_data["empleado_id"]).first()
    empleado_name = employee.nombre if employee else f"Empleado {entry_data['empleado_id']}"
    
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

# Create database tables and initialize data
Base.metadata.create_all(bind=engine)

def init_database():
    """Initialize database with default data"""
    db = next(get_db())
    
    # Initialize permissions if not exist
    if not db.query(Permission).first():
        default_permissions = [
            Permission(id="schedules.view", name="Ver Horarios", description="Puede ver los horarios de trabajo", category="schedules"),
            Permission(id="schedules.create", name="Crear Horarios", description="Puede crear nuevos horarios", category="schedules"),
            Permission(id="schedules.edit", name="Editar Horarios", description="Puede modificar horarios existentes", category="schedules"),
            Permission(id="schedules.delete", name="Eliminar Horarios", description="Puede eliminar horarios", category="schedules"),
            Permission(id="tasks.view", name="Ver Tareas", description="Puede ver sus tareas asignadas", category="tasks"),
            Permission(id="tasks.view_all", name="Ver Todas las Tareas", description="Puede ver todas las tareas del sistema", category="tasks"),
            Permission(id="tasks.create", name="Crear Tareas", description="Puede crear nuevas tareas", category="tasks"),
            Permission(id="tasks.edit", name="Editar Tareas", description="Puede modificar tareas existentes", category="tasks"),
            Permission(id="tasks.delete", name="Eliminar Tareas", description="Puede eliminar tareas", category="tasks"),
            Permission(id="tasks.assign", name="Asignar Tareas", description="Puede asignar tareas a empleados", category="tasks"),
            Permission(id="employees.view", name="Ver Empleados", description="Puede ver la lista de empleados", category="employees"),
            Permission(id="employees.create", name="Crear Empleados", description="Puede agregar nuevos empleados", category="employees"),
            Permission(id="employees.edit", name="Editar Empleados", description="Puede modificar información de empleados", category="employees"),
            Permission(id="employees.deactivate", name="Desactivar Empleados", description="Puede desactivar empleados", category="employees"),
            Permission(id="registers.view", name="Ver Registros", description="Puede ver registros de procedimientos", category="registers"),
            Permission(id="registers.create", name="Crear Registros", description="Puede crear nuevos registros", category="registers"),
            Permission(id="registers.edit", name="Editar Registros", description="Puede modificar registros existentes", category="registers"),
            Permission(id="registers.delete", name="Eliminar Registros", description="Puede eliminar registros", category="registers"),
            Permission(id="registers.fill", name="Llenar Registros", description="Puede completar entradas de registro", category="registers"),
            Permission(id="system.manage_roles", name="Gestionar Roles", description="Puede crear y modificar roles del sistema", category="system"),
            Permission(id="system.manage_permissions", name="Gestionar Permisos", description="Puede asignar permisos a roles", category="system"),
            Permission(id="system.view_reports", name="Ver Reportes", description="Puede ver reportes y estadísticas", category="system"),
            Permission(id="system.export_data", name="Exportar Datos", description="Puede exportar datos del sistema", category="system")
        ]
        
        for perm in default_permissions:
            db.add(perm)
    
    # Initialize roles if not exist
    if not db.query(Role).first():
        default_roles = [
            Role(id="admin", name="Administrador", description="Acceso completo al sistema", 
                 permissions=["schedules.view", "schedules.create", "schedules.edit", "schedules.delete", 
                             "tasks.view", "tasks.view_all", "tasks.create", "tasks.edit", "tasks.delete", "tasks.assign",
                             "employees.view", "employees.create", "employees.edit", "employees.deactivate",
                             "registers.view", "registers.create", "registers.edit", "registers.delete", "registers.fill",
                             "system.manage_roles", "system.manage_permissions", "system.view_reports", "system.export_data"]),
            Role(id="encargado", name="Encargado", description="Acceso de gestión y supervisión",
                 permissions=["schedules.view", "schedules.create", "schedules.edit",
                             "tasks.view", "tasks.view_all", "tasks.create", "tasks.edit", "tasks.assign",
                             "employees.view", "employees.edit",
                             "registers.view", "registers.create", "registers.edit", "registers.fill",
                             "system.view_reports"]),
            Role(id="trabajador", name="Trabajador", description="Acceso básico para empleados",
                 permissions=["schedules.view", "tasks.view", "registers.fill"])
        ]
        
        for role in default_roles:
            db.add(role)
    
    # Initialize employees if not exist
    if not db.query(Employee).first():
        default_employees = [
            Employee(id=1, nombre="Juan Pérez", email="juan@example.com", role="trabajador", telefono="+34 123 456 789", activo=True, password="1234"),
            Employee(id=2, nombre="María García", email="maria@example.com", role="trabajador", telefono="+34 123 456 790", activo=True, password="1234"),
            Employee(id=3, nombre="Carlos López", email="carlos@example.com", role="trabajador", telefono="+34 123 456 791", activo=True, password="1234"),
            Employee(id=4, nombre="Ana Martínez", email="ana@example.com", role="encargado", telefono="+34 123 456 792", activo=True, password="1234"),
            Employee(id=5, nombre="Pedro Sánchez", email="pedro@example.com", role="trabajador", telefono="+34 123 456 793", activo=True, password="1234")
        ]
        
        for emp in default_employees:
            db.add(emp)
    
    # Initialize schedules if not exist
    if not db.query(Schedule).first():
        default_schedules = [
            Schedule(id=1, fecha="2025-09-08", turno="Mañana (08:00-16:00)", empleado_id=1),
            Schedule(id=2, fecha="2025-09-08", turno="Tarde (16:00-00:00)", empleado_id=2),
            Schedule(id=3, fecha="2025-09-09", turno="Noche (00:00-08:00)", empleado_id=3)
        ]
        
        for sched in default_schedules:
            db.add(sched)
    
    # Initialize tasks if not exist
    if not db.query(Task).first():
        default_tasks = [
            Task(id=1, titulo="Revisar inventario", descripcion="Contar y verificar productos en almacén", empleado_id=1, fecha="2025-09-08", estado="pendiente", prioridad="media"),
            Task(id=2, titulo="Limpiar área de trabajo", descripcion="Mantener limpieza en zona de producción", empleado_id=2, fecha="2025-09-08", estado="en_progreso", prioridad="baja"),
            Task(id=3, titulo="Revisar maquinaria", descripcion="Inspección rutinaria de equipos", empleado_id=1, fecha="2025-09-09", estado="pendiente", prioridad="alta")
        ]
        
        for task in default_tasks:
            db.add(task)
    
    db.commit()
    db.close()

# Initialize database on startup
init_database()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

# ============================================
# TASK DEFINITIONS API ENDPOINTS
# ============================================

@task_definitions_router.get("")
async def get_task_definitions(
    active_only: bool = True,
    user: Dict[str, Any] = Depends(require_permission("tasks.view")),
    db: Session = Depends(get_db)
):
    """Get all task definitions"""
    query = db.query(TaskDefinition)
    if active_only:
        query = query.filter(TaskDefinition.active == True)
    
    definitions = query.all()
    
    # Convert to dict format
    result = []
    for definition in definitions:
        result.append({
            "id": definition.id,
            "titulo": definition.titulo,
            "descripcion": definition.descripcion,
            "prioridad": definition.prioridad,
            "requires_signature": definition.requires_signature,
            "register_id": definition.register_id,
            "procedure_id": definition.procedure_id,
            "default_duration_minutes": definition.default_duration_minutes,
            "active": definition.active,
            "is_recurring": definition.is_recurring,
            "frequency": definition.frequency,
            "recurrence_params": definition.recurrence_params,
            "created_at": definition.created_at.isoformat() if definition.created_at else None
        })
    
    return result

@task_definitions_router.post("")
async def create_task_definition(
    definition: dict,
    user: Dict[str, Any] = Depends(require_permission("tasks.create")),
    db: Session = Depends(get_db)
):
    """Create a new task definition"""
    # Create new task definition
    new_definition = TaskDefinition(
        titulo=definition["titulo"],
        descripcion=definition.get("descripcion"),
        prioridad=definition.get("prioridad", "media"),
        requires_signature=definition.get("requires_signature", False),
        register_id=definition.get("register_id"),
        procedure_id=definition.get("procedure_id"),
        default_duration_minutes=definition.get("default_duration_minutes"),
        active=definition.get("active", True),
        is_recurring=definition.get("is_recurring", False),
        frequency=definition.get("frequency"),
        recurrence_params=definition.get("recurrence_params", {})
    )
    
    db.add(new_definition)
    db.commit()
    db.refresh(new_definition)
    
    return {
        "id": new_definition.id,
        "titulo": new_definition.titulo,
        "descripcion": new_definition.descripcion,
        "prioridad": new_definition.prioridad,
        "active": new_definition.active,
        "is_recurring": new_definition.is_recurring,
        "frequency": new_definition.frequency,
        "message": "Task definition created successfully"
    }

@task_definitions_router.get("/{definition_id}")
async def get_task_definition(
    definition_id: int,
    user: Dict[str, Any] = Depends(require_permission("tasks.view")),
    db: Session = Depends(get_db)
):
    """Get a specific task definition"""
    definition = db.query(TaskDefinition).filter(TaskDefinition.id == definition_id).first()
    if not definition:
        raise HTTPException(status_code=404, detail="Task definition not found")
    
    return {
        "id": definition.id,
        "titulo": definition.titulo,
        "descripcion": definition.descripcion,
        "prioridad": definition.prioridad,
        "requires_signature": definition.requires_signature,
        "register_id": definition.register_id,
        "procedure_id": definition.procedure_id,
        "default_duration_minutes": definition.default_duration_minutes,
        "active": definition.active,
        "is_recurring": definition.is_recurring,
        "frequency": definition.frequency,
        "recurrence_params": definition.recurrence_params,
        "created_at": definition.created_at.isoformat() if definition.created_at else None
    }

@task_definitions_router.patch("/{definition_id}")
async def update_task_definition(
    definition_id: int,
    update_data: dict,
    user: Dict[str, Any] = Depends(require_permission("tasks.create")),
    db: Session = Depends(get_db)
):
    """Update a task definition"""
    definition = db.query(TaskDefinition).filter(TaskDefinition.id == definition_id).first()
    if not definition:
        raise HTTPException(status_code=404, detail="Task definition not found")
    
    # Update fields
    for field, value in update_data.items():
        if hasattr(definition, field):
            setattr(definition, field, value)
    
    db.commit()
    db.refresh(definition)
    
    return {
        "id": definition.id,
        "titulo": definition.titulo,
        "descripcion": definition.descripcion,
        "prioridad": definition.prioridad,
        "active": definition.active,
        "message": "Task definition updated successfully"
    }

@task_definitions_router.delete("/{definition_id}")
async def delete_task_definition(
    definition_id: int,
    user: Dict[str, Any] = Depends(require_permission("tasks.create")),
    db: Session = Depends(get_db)
):
    """Delete a task definition (set as inactive)"""
    definition = db.query(TaskDefinition).filter(TaskDefinition.id == definition_id).first()
    if not definition:
        raise HTTPException(status_code=404, detail="Task definition not found")
    
    # Set as inactive instead of deleting
    definition.active = False
    db.commit()
    
    return {"message": "Task definition deactivated successfully"}

# ============================================
# TASK ASSIGNMENTS API ENDPOINTS
# ============================================

@task_assignments_router.get("")
async def get_task_assignments(
    empleado_id: int = None,
    fecha: str = None,
    schedule_id: int = None,
    user: Dict[str, Any] = Depends(require_any_permission(["tasks.view", "tasks.view_all"])),
    db: Session = Depends(get_db)
):
    """Get task assignments with filtering"""
    # Check if user can see all assignments or only their own
    can_view_all = has_permission(user, "tasks.view_all")
    
    # Build base query
    query = db.query(TaskAssignment).join(TaskDefinition).join(Employee).filter(Employee.activo == True)
    
    # Apply filters
    if empleado_id:
        query = query.filter(TaskAssignment.empleado_id == empleado_id)
    elif not can_view_all:
        # Workers can only see their own assignments
        query = query.filter(TaskAssignment.empleado_id == user["id"])
    
    if fecha:
        query = query.filter(TaskAssignment.fecha == fecha)
    
    if schedule_id:
        query = query.filter(TaskAssignment.schedule_id == schedule_id)
    
    assignments = query.all()
    
    # Convert to dict format
    result = []
    for assignment in assignments:
        result.append({
            "id": assignment.id,
            "task_definition_id": assignment.task_definition_id,
            "titulo": assignment.task_definition.titulo,
            "descripcion": assignment.task_definition.descripcion,
            "empleado_id": assignment.empleado_id,
            "empleado": assignment.employee.nombre,
            "fecha": assignment.fecha,
            "schedule_id": assignment.schedule_id,
            "estado": assignment.estado,
            "prioridad": assignment.priority_override or assignment.task_definition.prioridad,
            "planned_start": assignment.planned_start.isoformat() if assignment.planned_start else None,
            "planned_duration_minutes": assignment.planned_duration_minutes or assignment.task_definition.default_duration_minutes,
            "actual_duration_minutes": assignment.actual_duration_minutes,
            "start_time": assignment.start_time.isoformat() if assignment.start_time else None,
            "notes": assignment.notes,
            "created_at": assignment.created_at.isoformat() if assignment.created_at else None
        })
    
    return result

@task_assignments_router.post("")
async def create_task_assignment(
    assignment: dict,
    user: Dict[str, Any] = Depends(require_permission("tasks.create")),
    db: Session = Depends(get_db)
):
    """Create a new task assignment"""
    # Validate task definition exists and is active
    task_definition = db.query(TaskDefinition).filter(
        TaskDefinition.id == assignment["task_definition_id"],
        TaskDefinition.active == True
    ).first()
    if not task_definition:
        raise HTTPException(status_code=404, detail="Task definition not found or inactive")
    
    # Validate employee exists and is active
    employee = db.query(Employee).filter(
        Employee.id == assignment["empleado_id"],
        Employee.activo == True
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check for duplicate assignment (same task definition, employee, date)
    existing = db.query(TaskAssignment).filter(
        TaskAssignment.task_definition_id == assignment["task_definition_id"],
        TaskAssignment.empleado_id == assignment["empleado_id"],
        TaskAssignment.fecha == assignment["fecha"]
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Task already assigned to this employee on this date")
    
    # Create new task assignment
    new_assignment = TaskAssignment(
        task_definition_id=assignment["task_definition_id"],
        empleado_id=assignment["empleado_id"],
        fecha=assignment["fecha"],
        schedule_id=assignment.get("schedule_id"),
        estado="pendiente",
        priority_override=assignment.get("priority_override"),
        planned_start=assignment.get("planned_start"),
        planned_duration_minutes=assignment.get("planned_duration_minutes"),
        notes=assignment.get("notes"),
        created_by=user["id"]
    )
    
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    return {
        "id": new_assignment.id,
        "task_definition_id": new_assignment.task_definition_id,
        "titulo": task_definition.titulo,
        "empleado_id": new_assignment.empleado_id,
        "empleado": employee.nombre,
        "fecha": new_assignment.fecha,
        "estado": new_assignment.estado,
        "message": "Task assigned successfully"
    }

@task_assignments_router.get("/{assignment_id}")
async def get_task_assignment(
    assignment_id: int,
    user: Dict[str, Any] = Depends(require_any_permission(["tasks.view", "tasks.view_all"])),
    db: Session = Depends(get_db)
):
    """Get a specific task assignment"""
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Task assignment not found")
    
    # Check if user can view this assignment
    can_view_all = has_permission(user, "tasks.view_all")
    if not can_view_all and assignment.empleado_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this assignment")
    
    return {
        "id": assignment.id,
        "task_definition_id": assignment.task_definition_id,
        "titulo": assignment.task_definition.titulo,
        "descripcion": assignment.task_definition.descripcion,
        "empleado_id": assignment.empleado_id,
        "empleado": assignment.employee.nombre,
        "fecha": assignment.fecha,
        "schedule_id": assignment.schedule_id,
        "estado": assignment.estado,
        "prioridad": assignment.priority_override or assignment.task_definition.prioridad,
        "planned_start": assignment.planned_start.isoformat() if assignment.planned_start else None,
        "planned_duration_minutes": assignment.planned_duration_minutes or assignment.task_definition.default_duration_minutes,
        "actual_duration_minutes": assignment.actual_duration_minutes,
        "start_time": assignment.start_time.isoformat() if assignment.start_time else None,
        "notes": assignment.notes,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None
    }

@task_assignments_router.patch("/{assignment_id}")
async def update_task_assignment(
    assignment_id: int,
    update_data: dict,
    user: Dict[str, Any] = Depends(get_user_from_token),
    db: Session = Depends(get_db)
):
    """Update a task assignment (status, notes, timing)"""
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Task assignment not found")
    
    # Check permissions: assignee can update status/timing, managers can update everything
    can_manage = has_permission(user, "tasks.create")
    is_assignee = assignment.empleado_id == user["id"]
    
    if not can_manage and not is_assignee:
        raise HTTPException(status_code=403, detail="Not authorized to update this assignment")
    
    # Restrict what workers can update
    allowed_worker_fields = {"estado", "actual_duration_minutes", "start_time", "notes"}
    if not can_manage and not all(field in allowed_worker_fields for field in update_data.keys()):
        raise HTTPException(status_code=403, detail="Workers can only update status, timing, and notes")
    
    # Update fields
    for field, value in update_data.items():
        if hasattr(assignment, field):
            # Convert datetime strings for timing fields
            if field in ["start_time", "planned_start"] and value and isinstance(value, str):
                from datetime import datetime
                try:
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid datetime format for {field}")
            
            setattr(assignment, field, value)
    
    try:
        db.commit()
        db.refresh(assignment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to update assignment")
    
    return {
        "id": assignment.id,
        "estado": assignment.estado,
        "actual_duration_minutes": assignment.actual_duration_minutes,
        "notes": assignment.notes,
        "message": "Assignment updated successfully"
    }

@task_assignments_router.delete("/{assignment_id}")
async def delete_task_assignment(
    assignment_id: int,
    user: Dict[str, Any] = Depends(require_permission("tasks.create")),
    db: Session = Depends(get_db)
):
    """Delete a task assignment (only managers can do this)"""
    assignment = db.query(TaskAssignment).filter(TaskAssignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Task assignment not found")
    
    try:
        db.delete(assignment)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete assignment")
    
    return {"message": "Task assignment deleted successfully"}

# Include routers (after all endpoints are defined)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(schedules_router)
app.include_router(tasks_router)
app.include_router(task_definitions_router)
app.include_router(task_assignments_router)
app.include_router(inbox_router)
app.include_router(registers_router)
app.include_router(employees_router)
app.include_router(permissions_router)
app.include_router(roles_router)

# Serve React static files
app.mount("/static", StaticFiles(directory="build/static"), name="static")

# SPA fallback route - serve React app for all other routes
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve React SPA for all non-API routes"""
    return FileResponse("build/index.html")

print("Starting FastAPI backend with CORS configuration")