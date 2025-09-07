import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTasks, createTask, updateTaskStatus, getRegisters, getRegister } from '../services/api';
import './TasksScreen.css';

function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    empleado_id: '1',
    fecha: '',
    prioridad: 'media',
    is_recurring: false,
    frequency: 'weekly',
    register_id: '',
    procedure_id: '',
    requires_signature: false
  });
  
  // Register and procedure data
  const [registers, setRegisters] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const { token, user } = useAuth();

  const EMPLEADOS_OPTIONS = [
    { id: 1, name: 'Juan Pérez' },
    { id: 2, name: 'María García' },
    { id: 3, name: 'Carlos López' },
    { id: 4, name: 'Ana Martínez' },
    { id: 5, name: 'Pedro Sánchez' }
  ];

  const PRIORIDAD_OPTIONS = ['baja', 'media', 'alta'];
  const ESTADO_OPTIONS = ['pendiente', 'en_progreso', 'completada'];
  const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' }
  ];

  const loadTasks = async () => {
    try {
      setLoading(true);
      // If user is trabajador, filter by their employee ID, else show all tasks
      const empleadoId = user?.role === 'trabajador' ? user?.id : null;
      const response = await getTasks(token, empleadoId);
      setTasks(response.tasks);
    } catch (error) {
      alert('Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const empleadoId = user?.role === 'trabajador' ? user?.id : null;
      const response = await getTasks(token, empleadoId);
      setTasks(response.tasks);
    } catch (error) {
      alert('Error al cargar las tareas');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.fecha) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    setSubmitting(true);
    try {
      const taskData = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        empleado_id: parseInt(formData.empleado_id),
        fecha: formData.fecha,
        prioridad: formData.prioridad,
        is_recurring: formData.is_recurring,
        frequency: formData.is_recurring ? formData.frequency : null,
        register_id: formData.register_id ? parseInt(formData.register_id) : null,
        procedure_id: formData.procedure_id ? parseInt(formData.procedure_id) : null,
        requires_signature: formData.requires_signature
      };
      
      const response = await createTask(token, taskData);
      
      // Check if there's a scheduling conflict
      if (response.error === 'scheduling_conflict') {
        const conflictMessage = `⚠️ CONFLICTO DE HORARIO\n\n${response.message}\n\n${response.suggestion}\n\nSe ha enviado una notificación a su bandeja de entrada para resolver este conflicto.`;
        alert(conflictMessage);
        setShowForm(false);
        setFormData({
          titulo: '',
          descripcion: '',
          empleado_id: '1',
          fecha: '',
          prioridad: 'media',
          is_recurring: false,
          frequency: 'weekly'
        });
        return; // Don't reload tasks, conflict was created instead
      }
      
      const message = formData.is_recurring ? 'Tarea recurrente creada exitosamente' : 'Tarea creada exitosamente';
      alert(message);
      setShowForm(false);
      setFormData({
        titulo: '',
        descripcion: '',
        empleado_id: '1',
        fecha: '',
        prioridad: 'media',
        is_recurring: false,
        frequency: 'weekly'
      });
      loadTasks(); // Refresh the list
    } catch (error) {
      alert('Error al crear tarea: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(token, taskId, newStatus);
      loadTasks(); // Refresh the list
    } catch (error) {
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const canCreateTasks = user?.role === 'admin' || user?.role === 'encargado';

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta': return '#ff4757';
      case 'media': return '#ffa502';
      case 'baja': return '#26de81';
      default: return '#ffa502';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completada': return '#26de81';
      case 'en_progreso': return '#3742fa';
      case 'pendiente': return '#ff9ff3';
      default: return '#ff9ff3';
    }
  };

  useEffect(() => {
    loadTasks();
    loadRegisters();
  }, [token, user]);

  const loadRegisters = async () => {
    try {
      const response = await getRegisters(token);
      setRegisters(response.registers || []);
    } catch (error) {
      console.error('Error loading registers:', error);
    }
  };

  const loadProcedures = async (registerId) => {
    if (!registerId) {
      setProcedures([]);
      return;
    }
    try {
      const response = await getRegister(token, registerId);
      setProcedures(response.procedures || []);
    } catch (error) {
      console.error('Error loading procedures:', error);
      setProcedures([]);
    }
  };

  if (loading) {
    return (
      <div className="tasks-container">
        <div className="loading-container">
          <p>Cargando tareas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="tasks-title">Gestión de Tareas</h1>
            <p className="tasks-subtitle">
              {user?.role === 'trabajador' 
                ? 'Mis tareas asignadas' 
                : 'Todas las tareas del equipo'}
            </p>
          </div>
          
          {canCreateTasks && (
            <button
              className="add-button"
              onClick={() => setShowForm(true)}
            >
              ➕ Nueva tarea
            </button>
          )}
        </div>
        
        <button className="refresh-button" onClick={handleRefresh}>
          Actualizar
        </button>
      </div>

      <div className="tasks-content">
        {tasks.length === 0 ? (
          <div className="empty-container">
            <p className="empty-text">No hay tareas disponibles</p>
          </div>
        ) : (
          <div className="tasks-grid">
            {tasks.map((task) => (
              <div key={task.id} className="task-card">
                <div className="task-header">
                  <div className="task-title-row">
                    <h3 className="task-title">
                      {task.is_recurring && '🔄 '}{task.titulo}
                    </h3>
                    <div className="task-badges">
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
                  <div className="task-meta">
                    <span className="task-date">{formatDate(task.fecha)}</span>
                    <span className="task-employee">👤 {task.empleado}</span>
                  </div>
                </div>
                
                <p className="task-description">{task.descripcion}</p>
                
                <div className="task-footer">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(task.estado) }}
                  >
                    {task.estado.replace('_', ' ')}
                  </span>
                  
                  {(canCreateTasks || user?.id === task.empleado_id) && (
                    <div className="status-buttons">
                      {ESTADO_OPTIONS.map((estado) => (
                        <button
                          key={estado}
                          className={`status-btn ${task.estado === estado ? 'active' : ''}`}
                          onClick={() => handleStatusChange(task.id, estado)}
                          disabled={task.estado === estado}
                        >
                          {estado.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Nueva Tarea</h2>
            
            <form onSubmit={handleCreateTask}>
              <div className="input-group">
                <label className="input-label">Título *</label>
                <input
                  type="text"
                  className="text-input"
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  required
                  placeholder="Descripción breve de la tarea"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Descripción</label>
                <textarea
                  className="text-input textarea-input"
                  rows="3"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Detalles de la tarea a realizar"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Fecha *</label>
                <input
                  type="date"
                  className="text-input"
                  value={formData.fecha}
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Asignar a</label>
                <div className="picker-container">
                  {EMPLEADOS_OPTIONS.map((empleado) => (
                    <button
                      key={empleado.id}
                      type="button"
                      className={`picker-option ${
                        formData.empleado_id === empleado.id.toString() ? 'picker-option-selected' : ''
                      }`}
                      onClick={() => setFormData({...formData, empleado_id: empleado.id.toString()})}
                    >
                      {empleado.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Prioridad</label>
                <div className="picker-container">
                  {PRIORIDAD_OPTIONS.map((prioridad) => (
                    <button
                      key={prioridad}
                      type="button"
                      className={`picker-option ${
                        formData.prioridad === prioridad ? 'picker-option-selected' : ''
                      }`}
                      onClick={() => setFormData({...formData, prioridad})}
                    >
                      <span style={{ color: getPriorityColor(prioridad) }}>●</span> {prioridad}
                    </button>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">📋 Registro</label>
                <select
                  className="form-input"
                  value={formData.register_id}
                  onChange={(e) => {
                    setFormData({...formData, register_id: e.target.value, procedure_id: ''});
                    loadProcedures(e.target.value);
                  }}
                >
                  <option value="">Sin registro específico</option>
                  {registers.map(register => (
                    <option key={register.id} value={register.id}>
                      {register.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {formData.register_id && (
                <div className="input-group">
                  <label className="input-label">🧪 Procedimiento</label>
                  <select
                    className="form-input"
                    value={formData.procedure_id}
                    onChange={(e) => setFormData({...formData, procedure_id: e.target.value})}
                  >
                    <option value="">Seleccionar procedimiento</option>
                    {procedures.map(procedure => (
                      <option key={procedure.id} value={procedure.id}>
                        {procedure.nombre} ({procedure.tiempo_estimado})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.register_id && (
                <div className="input-group">
                  <label className="input-label">
                    <input
                      type="checkbox"
                      checked={formData.requires_signature}
                      onChange={(e) => setFormData({...formData, requires_signature: e.target.checked})}
                      style={{ marginRight: '8px' }}
                    />
                    ✍️ Requiere firma del empleado
                  </label>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">
                  <input
                    type="checkbox"
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                    style={{ marginRight: '8px' }}
                  />
                  🔄 Tarea recurrente
                </label>
              </div>

              {formData.is_recurring && (
                <div className="input-group">
                  <label className="input-label">Frecuencia</label>
                  <div className="picker-container">
                    {FREQUENCY_OPTIONS.map((freq) => (
                      <button
                        key={freq.value}
                        type="button"
                        className={`picker-option ${
                          formData.frequency === freq.value ? 'picker-option-selected' : ''
                        }`}
                        onClick={() => setFormData({...formData, frequency: freq.value})}
                      >
                        🔄 {freq.label}
                      </button>
                    ))}
                  </div>
                  <p className="frequency-info">
                    {formData.frequency === 'daily' && 'Se creará una nueva tarea cada día'}
                    {formData.frequency === 'weekly' && 'Se creará una nueva tarea cada semana'}
                    {formData.frequency === 'monthly' && 'Se creará una nueva tarea cada mes'}
                  </p>
                </div>
              )}

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
                  {submitting ? 'Creando...' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksScreen;