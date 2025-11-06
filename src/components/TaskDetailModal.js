import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getTaskDetails, startTask, finishTask } from '../services/api';
import './TaskDetailModal.css';

function TaskDetailModal({ task, onClose, onTaskUpdate }) {
  const { token, user } = useAuth();
  const { navigateTo } = useNavigation();
  const [taskDetails, setTaskDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionData, setCompletionData] = useState({
    observaciones: '',
    resultado: 'completado',
    firma_empleado: 'Firmado digitalmente'
  });

  const isManager = user?.role === 'admin' || user?.role === 'encargado';
  const canInteractWithTask = task.empleado_id === user?.id || isManager;
  const isTaskStarted = task.estado === 'en_progreso';
  const isTaskCompleted = task.estado === 'completada';
  const hasRegister = taskDetails?.task?.register_id && taskDetails?.task?.procedure_id;

  useEffect(() => {
    loadTaskDetails();
  }, [task.id]);

  useEffect(() => {
    // Start timer if task is in progress and has start time
    if (isTaskStarted && task.start_time && !isTaskCompleted) {
      const startTime = new Date(task.start_time);
      updateTimer(startTime);
      const interval = setInterval(() => updateTimer(startTime), 1000);
      setTimerInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [isTaskStarted, task.start_time, isTaskCompleted]);

  const updateTimer = (startTime) => {
    const now = new Date();
    const elapsed = Math.floor((now - startTime) / 1000);
    setTimer(elapsed);
  };

  const loadTaskDetails = async () => {
    setLoading(true);
    try {
      const response = await getTaskDetails(token, task.id);
      setTaskDetails(response);
    } catch (error) {
      console.error('Error loading task details:', error);
      alert('Error cargando detalles de la tarea: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async () => {
    try {
      const response = await startTask(token, task.id);
      // Update the task data and reload details
      onTaskUpdate(response.task);
      await loadTaskDetails();
      alert('🟢 Tarea iniciada - El cronómetro está funcionando');
    } catch (error) {
      console.error('Error starting task:', error);
      alert('Error iniciando tarea: ' + error.message);
    }
  };

  const handleFinishTask = async () => {
    if (taskDetails?.task?.requires_signature) {
      setShowCompletionForm(true);
    } else {
      // Complete task without signature
      try {
        const response = await finishTask(token, task.id, {});
        onTaskUpdate(response.task);
        alert('✅ Tarea completada exitosamente');
        onClose();
      } catch (error) {
        console.error('Error finishing task:', error);
        alert('Error completando tarea: ' + error.message);
      }
    }
  };

  const handleCompleteWithSignature = async () => {
    try {
      const response = await finishTask(token, task.id, completionData);
      onTaskUpdate(response.task);
      
      if (response.register_entry) {
        alert('✅ Tarea completada y firmada en el registro exitosamente');
      } else {
        alert('✅ Tarea completada exitosamente');
      }
      
      onClose();
    } catch (error) {
      console.error('Error completing task with signature:', error);
      alert('Error completando tarea: ' + error.message);
    }
  };

  const handleGoToRegister = () => {
    if (!taskDetails?.task?.register_id) {
      alert('Esta tarea no tiene un registro asociado');
      return;
    }
    
    onClose();
    
    navigateTo('registers', {
      taskId: task.id,
      registerId: taskDetails.task.register_id,
      procedureId: taskDetails.task.procedure_id,
      autoOpen: true
    });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal task-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando detalles de la tarea...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal task-detail-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 {taskDetails?.task?.titulo}</h3>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="task-detail-content">
          {/* Task Info */}
          <div className="task-info-section">
            <div className="task-basic-info">
              <div className="info-row">
                <span className="info-label">📅 Fecha:</span>
                <span>{taskDetails?.task?.fecha}</span>
              </div>
              <div className="info-row">
                <span className="info-label">👤 Empleado:</span>
                <span>{taskDetails?.task?.empleado}</span>
              </div>
              <div className="info-row">
                <span className="info-label">📝 Descripción:</span>
                <span>{taskDetails?.task?.descripcion}</span>
              </div>
              <div className="info-row">
                <span className="info-label">🎯 Prioridad:</span>
                <span className={`priority-badge ${taskDetails?.task?.prioridad}`}>
                  {taskDetails?.task?.prioridad?.toUpperCase()}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">📊 Estado:</span>
                <span className={`status-badge ${taskDetails?.task?.estado}`}>
                  {taskDetails?.task?.estado?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Timer Section */}
            {canInteractWithTask && (
              <div className="timer-section">
                <div className="timer-display">
                  <span className="timer-label">⏱️ Tiempo:</span>
                  <span className="timer-value">{formatTime(timer)}</span>
                </div>
                
                {taskDetails?.task?.start_time && (
                  <div className="time-info">
                    <small>Iniciado: {formatDate(taskDetails.task.start_time)}</small>
                  </div>
                )}
                
                {taskDetails?.task?.actual_duration_minutes && (
                  <div className="time-info">
                    <small>Duración: {taskDetails.task.actual_duration_minutes} minutos</small>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Procedure Details */}
          {taskDetails?.procedure && (
            <div className="procedure-section">
              <div className="procedure-header">
                <h4>🧪 Procedimiento: {taskDetails.procedure.nombre}</h4>
                {hasRegister && canInteractWithTask && !isTaskCompleted && (
                  <button 
                    className="goto-register-button"
                    onClick={handleGoToRegister}
                  >
                    📋 Ir al Registro
                  </button>
                )}
              </div>
              
              <div className="procedure-info">
                <p><strong>⏱️ Tiempo estimado:</strong> {taskDetails.procedure.tiempo_estimado}</p>
              </div>

              {/* Recipe/Materials */}
              {taskDetails.procedure.receta && (
                <div className="recipe-section">
                  <h5>📋 Receta/Materiales:</h5>
                  {taskDetails.procedure.receta.ingredientes && (
                    <div className="ingredients-list">
                      <strong>Ingredientes:</strong>
                      <ul>
                        {taskDetails.procedure.receta.ingredientes.map((ing, index) => (
                          <li key={index}>
                            <strong>{ing.nombre}:</strong> {ing.cantidad}
                            {ing.concentracion && ` (${ing.concentracion})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {taskDetails.procedure.receta.materiales && (
                    <div className="materials-list">
                      <strong>Materiales:</strong>
                      <ul>
                        {taskDetails.procedure.receta.materiales.map((mat, index) => (
                          <li key={index}>
                            <strong>{mat.nombre}:</strong> {mat.cantidad}
                            {mat.especificacion && ` - ${mat.especificacion}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {taskDetails.procedure.receta.proporcion && (
                    <p><strong>Proporción:</strong> {taskDetails.procedure.receta.proporcion}</p>
                  )}
                </div>
              )}

              {/* Procedure Steps */}
              <div className="procedure-steps">
                <h5>📝 Pasos a seguir:</h5>
                <ol>
                  {taskDetails.procedure.procedimiento.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              {/* Precautions */}
              <div className="precautions-section">
                <h5>⚠️ Precauciones importantes:</h5>
                <ul className="precautions-list">
                  {taskDetails.procedure.precauciones.map((precaution, index) => (
                    <li key={index} className="precaution-item">
                      {precaution}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Task Controls */}
          {canInteractWithTask && !isTaskCompleted && (
            <div className="task-controls">
              {!isTaskStarted ? (
                <button onClick={handleStartTask} className="start-task-button">
                  🟢 Iniciar Tarea
                </button>
              ) : (
                <button onClick={handleFinishTask} className="finish-task-button">
                  ✅ Completar Tarea
                </button>
              )}
            </div>
          )}

          {/* Task completed info */}
          {isTaskCompleted && (
            <div className="completion-info">
              <div className="completion-badge">
                ✅ Tarea completada
              </div>
              {taskDetails?.task?.finish_time && (
                <small>Completada: {formatDate(taskDetails.task.finish_time)}</small>
              )}
            </div>
          )}
        </div>

        {/* Completion Form Modal */}
        {showCompletionForm && (
          <div className="completion-form-overlay">
            <div className="completion-form">
              <h4>✍️ Completar y Firmar Tarea</h4>
              
              <div className="form-group">
                <label>Resultado:</label>
                <select
                  value={completionData.resultado}
                  onChange={(e) => setCompletionData({...completionData, resultado: e.target.value})}
                >
                  <option value="completado">Completado</option>
                  <option value="incompleto">Incompleto</option>
                  <option value="con_observaciones">Con observaciones</option>
                </select>
              </div>

              <div className="form-group">
                <label>Observaciones:</label>
                <textarea
                  value={completionData.observaciones}
                  onChange={(e) => setCompletionData({...completionData, observaciones: e.target.value})}
                  placeholder="Cualquier observación sobre la ejecución de la tarea..."
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button 
                  onClick={() => setShowCompletionForm(false)}
                  className="cancel-button"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCompleteWithSignature}
                  className="confirm-button"
                >
                  ✍️ Completar y Firmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailModal;