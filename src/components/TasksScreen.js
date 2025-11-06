import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTasks, getEmployees, createTask, getRegisters, getAllProcedures } from '../services/api';
import TaskDetailModal from './TaskDetailModal';
import './TasksScreen.css';

function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [registers, setRegisters] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    titulo: '',
    descripcion: '',
    empleado_id: '',
    fecha: new Date().toISOString().split('T')[0],
    prioridad: 'media',
    estado: 'pendiente',
    register_id: null,
    procedure_id: null,
    requires_signature: false
  });
  const { token, user } = useAuth();

  useEffect(() => {
    if (token) {
      loadTasks();
    }
  }, [token]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const [tasksResponse, employeesResponse, registersResponse, proceduresResponse] = await Promise.all([
        getTasks(token),
        getEmployees(token),
        getRegisters(token),
        getAllProcedures(token)
      ]);
      setTasks(tasksResponse.tasks || []);
      setEmployees(employeesResponse.employees || []);
      setRegisters(registersResponse.registers || []);
      setProcedures(proceduresResponse.procedures || []);
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

  const handleCreateTask = async () => {
    if (!newTask.titulo || !newTask.empleado_id) {
      alert('Por favor complete los campos requeridos (Título y Empleado)');
      return;
    }

    try {
      await createTask(token, newTask);
      alert('Tarea creada exitosamente');
      setShowCreateModal(false);
      setNewTask({
        titulo: '',
        descripcion: '',
        empleado_id: '',
        fecha: new Date().toISOString().split('T')[0],
        prioridad: 'media',
        estado: 'pendiente',
        register_id: null,
        procedure_id: null,
        requires_signature: false
      });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Error al crear la tarea');
    }
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
        <div className="header-buttons">
          {(user?.role === 'admin' || user?.role === 'encargado') && (
            <button className="create-button" onClick={() => setShowCreateModal(true)}>
              ➕ Nueva Tarea
            </button>
          )}
          <button className="refresh-button" onClick={handleRefresh}>
            🔄 Actualizar
          </button>
        </div>
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

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Crear Nueva Tarea</h2>
              <button className="close-button" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={newTask.titulo}
                  onChange={(e) => setNewTask({...newTask, titulo: e.target.value})}
                  placeholder="Título de la tarea"
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={newTask.descripcion}
                  onChange={(e) => setNewTask({...newTask, descripcion: e.target.value})}
                  placeholder="Descripción de la tarea"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Empleado *</label>
                  <select
                    value={newTask.empleado_id}
                    onChange={(e) => setNewTask({...newTask, empleado_id: parseInt(e.target.value)})}
                  >
                    <option value="">Seleccionar empleado</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={newTask.fecha}
                    onChange={(e) => setNewTask({...newTask, fecha: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Prioridad</label>
                  <select
                    value={newTask.prioridad}
                    onChange={(e) => setNewTask({...newTask, prioridad: e.target.value})}
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={newTask.estado}
                    onChange={(e) => setNewTask({...newTask, estado: e.target.value})}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Registro (Opcional)</label>
                  <select
                    value={newTask.register_id || ''}
                    onChange={(e) => setNewTask({...newTask, register_id: e.target.value ? parseInt(e.target.value) : null})}
                  >
                    <option value="">Sin registro</option>
                    {registers.map(reg => (
                      <option key={reg.id} value={reg.id}>{reg.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Procedimiento (Opcional)</label>
                  <select
                    value={newTask.procedure_id || ''}
                    onChange={(e) => setNewTask({...newTask, procedure_id: e.target.value ? parseInt(e.target.value) : null})}
                  >
                    <option value="">Sin procedimiento</option>
                    {procedures.map(proc => (
                      <option key={proc.id} value={proc.id}>
                        {proc.nombre} {proc.register_name ? `(${proc.register_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={newTask.requires_signature}
                    onChange={(e) => setNewTask({...newTask, requires_signature: e.target.checked})}
                  />
                  <span>Requiere firma para completar</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </button>
              <button className="save-button" onClick={handleCreateTask}>
                Crear Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksScreen;
