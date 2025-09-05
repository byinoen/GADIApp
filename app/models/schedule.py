from pydantic import BaseModel
from datetime import date
from typing import List

class Schedule(BaseModel):
    id: int
    fecha: date
    turno: str
    empleado: str
    empleado_id: int

class ScheduleCreate(BaseModel):
    fecha: date
    turno: str
    empleado_id: int

class ScheduleResponse(BaseModel):
    schedules: List[Schedule]