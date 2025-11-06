import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTasks, getEmployees } from '../services/api';
import TaskDetailModal from './TaskDetailModal';
import './TasksScreen.css';

function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    if (token) {
      loadTasks();
    }
  }, [token]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [tasksResponse, employeesResponse] = await Promise.all([
        getTasks(token),
        getEmployees(token)
      ]);
      setTasks(tasksResponse.tasks || []);
      setEmployees(employeesResponse.employees || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      alert('Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadTasks();
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  const handleCloseTaskDetail = () => {
    setSelectedTask(null);
    setShowTaskDetail(false);
    loadTasks();
  };

  const getEmployeeName = (empleadoId) => {
    const employee = employees.find(emp => emp.id === empleadoId);
    return employee ? employee.nombre : `Empleado #${empleadoId}`;
  };

  const getPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 'alta':
        return '#e74c3c';
      case 'media':
        return '#f39c12';
      case 'baja':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'completada':
        return '#27ae60';
      case 'en_progreso':
        return '#3498db';
      case 'pendiente':
        return '#95a5a6';
      default:
        return '#95a5a6';
    }
  };

  const getStatusText = (estado) => {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'en_progreso':
        return 'En Progreso';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <div className="tasks-screen">
        <div className="loading-container">
          <p>Cargando tareas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-screen">
      <div className="screen-header">
        <h1 className="screen-title">📋 Tareas</h1>
        <button className="refresh-button" onClick={handleRefresh}>
          🔄 Actualizar
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <p>No hay tareas asignadas</p>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="task-card"
              onClick={() => handleTaskClick(task)}
            >
              <div className="task-card-header">
                <h3 className="task-title">{task.titulo}</h3>
                <span
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(task.prioridad) }}
                >
                  {task.prioridad}
                </span>
              </div>

              <p className="task-description">{task.descripcion}</p>

              <div className="task-card-footer">
                <div className="task-info">
                  <span className="task-employee">
                    👤 {getEmployeeName(task.empleado_id)}
                  </span>
                  <span className="task-date">📅 {task.fecha}</span>
                </div>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(task.estado) }}
                >
                  {getStatusText(task.estado)}
                </span>
              </div>

              {task.register_id && task.procedure_id && (
                <div className="task-procedure-indicator">
                  📋 Con procedimiento documentado
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={handleCloseTaskDetail}
        />
      )}
    </div>
  );
}

export default TasksScreen;
