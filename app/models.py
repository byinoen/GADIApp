"""
Database models for GADIApp
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    role = Column(String, nullable=False)
    telefono = Column(String, nullable=True)
    activo = Column(Boolean, default=True)
    password = Column(String, default="1234")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    schedules = relationship("Schedule", back_populates="employee")
    tasks = relationship("Task", back_populates="employee")
    register_entries = relationship("RegisterEntry", back_populates="employee")

class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(String, nullable=False)
    turno = Column(String, nullable=False)
    empleado_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    
    # Relationships
    employee = relationship("Employee", back_populates="schedules")

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    empleado_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    fecha = Column(String, nullable=False)
    estado = Column(String, default="pendiente")
    prioridad = Column(String, default="media")
    is_recurring = Column(Boolean, default=False)
    frequency = Column(String, nullable=True)
    parent_task_id = Column(Integer, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    actual_duration_minutes = Column(Integer, nullable=True)
    
    # Relationships
    employee = relationship("Employee", back_populates="tasks")

class Permission(Base):
    __tablename__ = "permissions"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=False)

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    permissions = Column(JSON, default=list)  # Store permissions as JSON list

class Register(Base):
    __tablename__ = "registers"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    descripcion = Column(String, nullable=True)
    activo = Column(Boolean, default=True)
    requiere_firma = Column(Boolean, default=False)
    campos_personalizados = Column(JSON, default=list)  # Custom field definitions
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    entries = relationship("RegisterEntry", back_populates="register")
    procedures = relationship("Procedure", back_populates="register")

class Procedure(Base):
    __tablename__ = "procedures"
    
    id = Column(Integer, primary_key=True, index=True)
    register_id = Column(Integer, ForeignKey("registers.id"), nullable=False)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    orden = Column(Integer, default=1)
    
    # Relationships
    register = relationship("Register", back_populates="procedures")

class RegisterEntry(Base):
    __tablename__ = "register_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    register_id = Column(Integer, ForeignKey("registers.id"), nullable=False)
    empleado_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    fecha = Column(String, nullable=False)
    hora = Column(String, nullable=False)
    observaciones = Column(Text, nullable=True)
    firma_empleado = Column(String, nullable=True)
    firma_supervisor = Column(String, nullable=True)
    campos_personalizados = Column(JSON, default=dict)  # Custom field values
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    register = relationship("Register", back_populates="entries")
    employee = relationship("Employee", back_populates="register_entries")

class ManagerInboxNotification(Base):
    __tablename__ = "manager_inbox_notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="pending")
    data = Column(JSON, default=dict)  # Additional data for the notification
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RecurringTask(Base):
    __tablename__ = "recurring_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    empleado_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    frequency = Column(String, nullable=False)  # daily, weekly, monthly
    prioridad = Column(String, default="media")
    activo = Column(Boolean, default=True)
    last_generated = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    employee = relationship("Employee")