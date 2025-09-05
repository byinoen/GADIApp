from fastapi import APIRouter, Depends
from app.models.schedule import Schedule, ScheduleResponse
from app.models.user import UserPublic
from app.security.deps import get_current_user
from datetime import date

router = APIRouter(prefix="/schedules", tags=["schedules"])

# Demo schedule data with Spanish content
DEMO_SCHEDULES = [
    Schedule(id=1, fecha=date(2025, 9, 5), turno="Mañana (08:00-16:00)", empleado="Juan Pérez", empleado_id=1),
    Schedule(id=2, fecha=date(2025, 9, 5), turno="Tarde (16:00-00:00)", empleado="María García", empleado_id=2),
    Schedule(id=3, fecha=date(2025, 9, 5), turno="Noche (00:00-08:00)", empleado="Carlos López", empleado_id=3),
    Schedule(id=4, fecha=date(2025, 9, 6), turno="Mañana (08:00-16:00)", empleado="Ana Martínez", empleado_id=4),
    Schedule(id=5, fecha=date(2025, 9, 6), turno="Tarde (16:00-00:00)", empleado="Juan Pérez", empleado_id=1),
    Schedule(id=6, fecha=date(2025, 9, 6), turno="Noche (00:00-08:00)", empleado="Pedro Sánchez", empleado_id=5),
    Schedule(id=7, fecha=date(2025, 9, 7), turno="Mañana (08:00-16:00)", empleado="María García", empleado_id=2),
    Schedule(id=8, fecha=date(2025, 9, 7), turno="Tarde (16:00-00:00)", empleado="Carlos López", empleado_id=3),
]

# Map user emails to employee IDs for filtering
USER_EMPLOYEE_MAP = {
    "trabajador@example.com": 1,  # Juan Pérez
    "encargado@example.com": 2,   # María García  
    "admin@example.com": None     # Admin sees all
}

@router.get("", response_model=ScheduleResponse)
def get_schedules(current_user: UserPublic = Depends(get_current_user)):
    """Get schedules based on user role"""
    
    # Admin and Encargado see all schedules
    if current_user.role in ["admin", "encargado"]:
        return ScheduleResponse(schedules=DEMO_SCHEDULES)
    
    # Trabajador sees only their own schedules
    elif current_user.role == "trabajador":
        employee_id = USER_EMPLOYEE_MAP.get(current_user.email)
        if employee_id:
            filtered_schedules = [s for s in DEMO_SCHEDULES if s.empleado_id == employee_id]
            return ScheduleResponse(schedules=filtered_schedules)
        else:
            return ScheduleResponse(schedules=[])
    
    # Default: empty list
    return ScheduleResponse(schedules=[])