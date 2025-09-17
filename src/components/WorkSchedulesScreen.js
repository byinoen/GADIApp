import React, { useState, useEffect } from 'react';
import { listSchedules, createSchedule, getScheduleTasks } from '../services/schedules.api.js';
import { listTasks } from '../services/tasks.api.js';
import { listEmployees } from '../services/employees.api.js';
import { useAuth } from '../contexts/AuthContext';
import './WorkSchedulesScreen.css';

console.log('WorkSchedulesScreen component file loaded');

export default function WorkSchedulesScreen() {
  console.log('WorkSchedulesScreen component rendering');
  const [schedules, setSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: '',
    turno: 'Mañana (08:00-16:00)',
    empleado_id: '',
    task_id: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [scheduleTasks, setScheduleTasks] = useState([]);
  const [showTasks, setShowTasks] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const { token, user } = useAuth();

  // Role-based helper function
  const hasRole = (...allowedRoles) => {
    if (!user?.role) return false;
    
    // Map Spanish role names to backend role values
    const roleMapping = {
      'Trabajador': 'trabajador',
      'Encargado': 'encargado', 
      'Administrador': 'admin'
    };
    
    return allowedRoles.some(role => {
      const backendRole = roleMapping[role] || role.toLowerCase();
      return user.role === backendRole;
    });
  };

  const TURNOS_OPTIONS = [
    'Mañana (08:00-16:00)',
    'Tarde (16:00-00:00)', 
    'Noche (00:00-08:00)'
  ];

  // Get employee name by ID
  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.nombre : `Empleado ${employeeId}`;
  };

  const loadData = async () => {
    try {
      console.log('loadData called - starting to load schedules...');
      setLoading(true);
      // Load schedules, employees, and tasks in parallel
      const [schedulesData, employeesData, tasksData] = await Promise.all([
        listSchedules(),
        listEmployees(),
        listTasks()
      ]);
      
      console.log('Schedules loaded:', schedulesData);
      setSchedules(schedulesData);
      setEmployees(employeesData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error al cargar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSchedules = async () => {
    try {
      const schedules = await listSchedules();
      setSchedules(schedules);
    } catch (error) {
      console.error('Error loading schedules:', error);
      alert('Error al cargar los horarios: ' + error.message);
    }
  };

  const handleRefresh = async () => {
    try {
      const schedules = await listSchedules();
      setSchedules(schedules);
    } catch (error) {
      console.error('Error refreshing schedules:', error);
      alert('Error al actualizar los horarios: ' + error.message);
    }
  };

  const handleScheduleClick = async (schedule) => {
    if (loadingTasks) return;
    
    setLoadingTasks(true);
    setSelectedSchedule(schedule);
    setShowTasks(true);
    
    try {
      const response = await getScheduleTasks(schedule.id);
      setScheduleTasks(response);
    } catch (error) {
      alert('Error al cargar las tareas del horario');
      setShowTasks(false);
    } finally {
      setLoadingTasks(false);
    }
  };


  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 'alta': return '#ff4444';
      case 'media': return '#ffaa00';
      case 'baja': return '#44aa44';
      default: return '#666';
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'completada': return '#4CAF50';
      case 'en_progreso': return '#2196F3';
      case 'pendiente': return '#ff6b9d';
      default: return '#666';
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    
    // Defensive check before API call
    if (!hasRole('Encargado', 'Administrador')) {
      alert('No tiene permisos para esta acción');
      return;
    }
    
    if (!formData.fecha) {
      alert('Por favor ingrese una fecha');
      return;
    }

    setSubmitting(true);
    try {
      const scheduleData = {
        fecha: formData.fecha,
        turno: formData.turno,
        empleado_id: parseInt(formData.empleado_id)
      };
      
      // Include task_id if a task is selected
      if (formData.task_id) {
        scheduleData.task_id = parseInt(formData.task_id);
      }
      
      await createSchedule(scheduleData);
      
      alert('Turno añadido exitosamente');
      setShowForm(false);
      setFormData({
        fecha: '',
        turno: 'Mañana (08:00-16:00)',
        empleado_id: '',
        task_id: ''
      });
      loadSchedules(); // Refresh the list
    } catch (error) {
      console.error('Error creating schedule:', error);
      
      // Handle 403 errors specifically
      if (error.message.includes('403') || error.message.includes('Forbidden') || error.message.includes('permission')) {
        alert('Permiso denegado por el servidor');
      } else {
        alert('Error al procesar la solicitud');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canCreateSchedules = hasRole('Encargado', 'Administrador');

  useEffect(() => {
    console.log('useEffect triggered, token:', token);
    if (token) {
      console.log('Token exists, calling loadData...');
      loadData();
    } else {
      console.log('No token available');
    }
  }, [token]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p className="loading-text">Cargando horarios...</p>
      </div>
    );
  }

  return (
    <div className="schedules-container">
      <div className="schedules-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="schedules-title">Horarios de Trabajo</h1>
            <p className="schedules-subtitle">
              {hasRole('Trabajador') 
                ? 'Mis horarios asignados' 
                : 'Todos los horarios del equipo'}
            </p>
          </div>
          
          {canCreateSchedules && (
            <button
              className="add-button"
              onClick={() => setShowForm(true)}
            >
              ➕ Añadir turno
            </button>
          )}
        </div>
        
        <button className="refresh-button" onClick={handleRefresh}>
          Actualizar
        </button>
      </div>

      {/* Read-only notice for Trabajador */}
      {hasRole('Trabajador') && (
        <div className="read-only-notice">
          <p style={{
            backgroundColor: '#f8f9fa',
            color: '#6c757d',
            padding: '10px 15px',
            borderRadius: '6px',
            margin: '15px 0',
            border: '1px solid #dee2e6',
            fontSize: '14px'
          }}>
            📖 Solo lectura: no tiene permisos para crear o editar turnos.
          </p>
        </div>
      )}

      <div className="schedules-content">
        {schedules.length === 0 ? (
          <div className="empty-container">
            <p className="empty-text">No hay horarios disponibles</p>
          </div>
        ) : (
          <div className="schedules-grid">
            {schedules.map((schedule) => (
              <div 
                key={schedule.id} 
                className="schedule-card schedule-clickable"
                onClick={() => handleScheduleClick(schedule)}
              >
                <div className="schedule-header">
                  <span className="schedule-date">{formatDate(schedule.fecha)}</span>
                  <span className="schedule-shift">{schedule.turno}</span>
                </div>
                <p className="schedule-employee">Empleado: {getEmployeeName(schedule.empleado_id)}</p>
                <div className="click-hint">📋 Haz clic para ver tareas</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Añadir Nuevo Turno</h2>
            
            <form onSubmit={handleCreateSchedule}>
              <div className="input-group">
                <label className="input-label">Fecha (YYYY-MM-DD)</label>
                <input
                  type="date"
                  className="text-input"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Turno</label>
                <div className="picker-container">
                  {TURNOS_OPTIONS.map((turno) => (
                    <button
                      key={turno}
                      type="button"
                      className={`picker-option ${
                        formData.turno === turno ? 'picker-option-selected' : ''
                      }`}
                      onClick={() => setFormData({...formData, turno})}
                    >
                      {turno}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Empleado</label>
                <select
                  className="text-input"
                  value={formData.empleado_id}
                  onChange={(e) => setFormData({...formData, empleado_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar empleado...</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Tarea (Opcional)</label>
                <select
                  className="text-input"
                  value={formData.task_id}
                  onChange={(e) => setFormData({...formData, task_id: e.target.value})}
                >
                  <option value="">Sin tarea asignada</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  className={`submit-button ${submitting ? 'submit-button-disabled' : ''}`}
                  disabled={submitting}
                >
                  {submitting ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTasks && selectedSchedule && (
        <div className="modal-overlay" onClick={() => setShowTasks(false)}>
          <div className="modal-content tasks-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                📋 Tareas para {getEmployeeName(selectedSchedule.empleado_id)}
              </h2>
              <p className="modal-subtitle">
                {formatDate(selectedSchedule.fecha)} - {selectedSchedule.turno}
              </p>
            </div>

            {loadingTasks ? (
              <div className="loading-container">
                <p>Cargando tareas...</p>
              </div>
            ) : scheduleTasks.length === 0 ? (
              <div className="empty-container">
                <p className="empty-text">No hay tareas asignadas para este horario</p>
              </div>
            ) : (
              <div className="tasks-list">
                {scheduleTasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <div className="task-item-header">
                      <h4 className="task-item-title">
                        {task.is_recurring && '🔄 '}{task.titulo}
                      </h4>
                      <div className="task-item-badges">
                        {task.is_recurring && (
                          <span className="recurring-badge">
                            {task.frequency === 'daily' && 'Diario'}
                            {task.frequency === 'weekly' && 'Semanal'}
                            {task.frequency === 'monthly' && 'Mensual'}
                          </span>
                        )}
                        <span 
                          className="priority-badge" 
                          style={{ backgroundColor: getPriorityColor(task.prioridad) }}
                        >
                          {task.prioridad}
                        </span>
                      </div>
                    </div>
                    
                    <p className="task-item-description">{task.descripcion}</p>
                    
                    <div className="task-item-footer">
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(task.estado) }}
                      >
                        {task.estado.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={() => setShowTasks(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}