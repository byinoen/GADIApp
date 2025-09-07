import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTasks, createTask, updateTaskStatus } from '../services/api';
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
    prioridad: 'media'
  });
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
      await createTask(token, {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        empleado_id: parseInt(formData.empleado_id),
        fecha: formData.fecha,
        prioridad: formData.prioridad
      });
      
      alert('Tarea creada exitosamente');
      setShowForm(false);
      setFormData({
        titulo: '',
        descripcion: '',
        empleado_id: '1',
        fecha: '',
        prioridad: 'media'
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
  }, [token, user]);

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
                    <h3 className="task-title">{task.titulo}</h3>
                    <span 
                      className="priority-badge" 
                      style={{ backgroundColor: getPriorityColor(task.prioridad) }}
                    >
                      {task.prioridad}
                    </span>
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