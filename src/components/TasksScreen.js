import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTaskDefinitions, createTaskDefinition, updateTaskDefinition, deleteTaskDefinition, getRegisters, getRegister } from '../services/api';
// Employee API no longer needed for template management
// TaskDetailModal no longer needed for template management
import './TasksScreen.css';

function TasksScreen() {
  const [taskDefinitions, setTaskDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
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
  
  // Definition detail modal (simplified for templates)
  const [selectedDefinition, setSelectedDefinition] = useState(null);
  const [showDefinitionDetail, setShowDefinitionDetail] = useState(false);
  const { token, user } = useAuth();

  // Helper function to check if user can manage task definitions
  const canManageDefinitions = () => {
    return user?.role === 'admin' || user?.role === 'encargado';
  };

  const PRIORIDAD_OPTIONS = ['baja', 'media', 'alta'];
  const ESTADO_OPTIONS = ['pendiente', 'en_progreso', 'completada'];
  const FREQUENCY_OPTIONS = [
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' }
  ];

  const loadTaskDefinitions = async () => {
    try {
      setLoading(true);
      const response = await getTaskDefinitions(token);
      setTaskDefinitions(response.task_definitions || []);
    } catch (error) {
      alert('Error al cargar las definiciones de tareas');
    } finally {
      setLoading(false);
    }
  };

  // No longer needed - task definitions are independent of employees

  const handleRefresh = async () => {
    try {
      const response = await getTaskDefinitions(token);
      setTaskDefinitions(response.task_definitions || []);
    } catch (error) {
      alert('Error al cargar las definiciones de tareas');
    }
  };

  const handleDefinitionClick = (definition) => {
    setSelectedDefinition(definition);
    setShowDefinitionDetail(true);
  };

  const handleEditDefinition = (definition) => {
    setEditingDefinition(definition);
    setFormData({
      titulo: definition.titulo,
      descripcion: definition.descripcion,
      prioridad: definition.prioridad,
      is_recurring: definition.is_recurring,
      frequency: definition.frequency || 'weekly',
      register_id: definition.register_id || '',
      procedure_id: definition.procedure_id || '',
      requires_signature: definition.requires_signature || false
    });
    
    // Load procedures if there's a register_id
    if (definition.register_id) {
      loadProcedures(definition.register_id);
    }
    
    setShowForm(true);
  };

  const handleDeleteDefinition = async (definitionId) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta definición de tarea?')) {
      return;
    }
    
    try {
      await deleteTaskDefinition(token, definitionId);
      alert('Definición de tarea eliminada exitosamente');
      loadTaskDefinitions();
    } catch (error) {
      alert('Error al eliminar la definición de tarea: ' + error.message);
    }
  };

  const handleCloseDefinitionDetail = () => {
    setSelectedDefinition(null);
    setShowDefinitionDetail(false);
  };

  const handleSubmitDefinition = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo) {
      alert('Por favor complete el título de la tarea');
      return;
    }

    setSubmitting(true);
    try {
      const definitionData = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        prioridad: formData.prioridad,
        is_recurring: formData.is_recurring,
        frequency: formData.is_recurring ? formData.frequency : null,
        register_id: formData.register_id ? parseInt(formData.register_id) : null,
        procedure_id: formData.procedure_id ? parseInt(formData.procedure_id) : null,
        requires_signature: formData.requires_signature
      };
      
      if (editingDefinition) {
        // Update existing definition
        await updateTaskDefinition(token, editingDefinition.id, definitionData);
        alert('Definición de tarea actualizada exitosamente');
      } else {
        // Create new definition
        await createTaskDefinition(token, definitionData);
        alert('Definición de tarea creada exitosamente');
      }
      
      setShowForm(false);
      setEditingDefinition(null);
      setFormData({
        titulo: '',
        descripcion: '',
        prioridad: 'media',
        is_recurring: false,
        frequency: 'weekly',
        register_id: '',
        procedure_id: '',
        requires_signature: false
      });
      loadTaskDefinitions(); // Refresh the list
    } catch (error) {
      alert('Error al guardar la definición de tarea: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Status changes are now handled in WorkSchedulesScreen where tasks are assigned

  const canCreateDefinitions = user?.role === 'admin' || user?.role === 'encargado';

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
    loadTaskDefinitions();
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
          <p>Cargando definiciones de tareas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks-container">
      <div className="tasks-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="tasks-title">Plantillas de Tareas</h1>
            <p className="tasks-subtitle">
              Gestionar definiciones de tareas reutilizables
            </p>
          </div>
          
          {canCreateDefinitions && (
            <button
              className="add-button"
              onClick={() => {
                setEditingDefinition(null);
                setFormData({
                  titulo: '',
                  descripcion: '',
                  prioridad: 'media',
                  is_recurring: false,
                  frequency: 'weekly',
                  register_id: '',
                  procedure_id: '',
                  requires_signature: false
                });
                setShowForm(true);
              }}
            >
              ➕ Nueva plantilla
            </button>
          )}
        </div>
        
        <button className="refresh-button" onClick={handleRefresh}>
          Actualizar
        </button>
      </div>

      <div className="tasks-content">
        {taskDefinitions.length === 0 ? (
          <div className="empty-container">
            <p className="empty-text">No hay plantillas de tareas disponibles</p>
            {canCreateDefinitions && (
              <p className="empty-hint">Crea plantillas de tareas que luego podrás asignar a empleados en horarios específicos</p>
            )}
          </div>
        ) : (
          <div className="tasks-grid">
            {taskDefinitions.map((definition) => (
              <div 
                key={definition.id} 
                className="task-card task-clickable" 
                onClick={() => handleDefinitionClick(definition)}
              >
                <div className="task-header">
                  <div className="task-title-row">
                    <h3 className="task-title">
                      {definition.is_recurring && '🔄 '}{definition.titulo}
                    </h3>
                    <div className="task-badges">
                      {definition.is_recurring && (
                        <span className="recurring-badge">
                          {definition.frequency === 'daily' && 'Diario'}
                          {definition.frequency === 'weekly' && 'Semanal'}
                          {definition.frequency === 'monthly' && 'Mensual'}
                        </span>
                      )}
                      <span 
                        className="priority-badge" 
                        style={{ backgroundColor: getPriorityColor(definition.prioridad) }}
                      >
                        {definition.prioridad}
                      </span>
                    </div>
                  </div>
                  <div className="task-meta">
                    <span className="task-template">📋 Plantilla de tarea</span>
                    <span className="task-created">
                      Creada: {new Date(definition.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
                
                <p className="task-description">{definition.descripcion}</p>
                
                {(definition.register_id || definition.procedure_id) && (
                  <div className="task-register-info">
                    📋 Con procedimiento documentado {definition.requires_signature && '✍️'}
                  </div>
                )}
                
                <div className="task-click-hint">
                  👆 Haz clic para ver detalles de la plantilla
                </div>
                
                {canCreateDefinitions && (
                  <div className="task-footer">
                    <button 
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDefinition(definition);
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDefinition(definition.id);
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {editingDefinition ? 'Editar Plantilla de Tarea' : 'Nueva Plantilla de Tarea'}
            </h2>
            
            <form onSubmit={handleSubmitDefinition}>
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
                  {submitting ? 'Guardando...' : (editingDefinition ? 'Actualizar Plantilla' : 'Crear Plantilla')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Definition Detail Modal */}
      {showDefinitionDetail && selectedDefinition && (
        <div className="modal-overlay" onClick={handleCloseDefinitionDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Detalles de la Plantilla</h2>
            
            <div className="definition-details">
              <h3>{selectedDefinition.titulo}</h3>
              <p><strong>Descripción:</strong> {selectedDefinition.descripcion}</p>
              <p><strong>Prioridad:</strong> {selectedDefinition.prioridad}</p>
              
              {selectedDefinition.is_recurring && (
                <p><strong>Recurrencia:</strong> {selectedDefinition.frequency === 'daily' && 'Diario'}
                {selectedDefinition.frequency === 'weekly' && 'Semanal'}
                {selectedDefinition.frequency === 'monthly' && 'Mensual'}</p>
              )}
              
              {selectedDefinition.register_id && (
                <p><strong>Con procedimiento documentado</strong> {selectedDefinition.requires_signature && '(requiere firma)'}</p>
              )}
              
              <p><strong>Creada:</strong> {new Date(selectedDefinition.created_at).toLocaleDateString('es-ES')}</p>
            </div>
            
            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={handleCloseDefinitionDetail}
              >
                Cerrar
              </button>
              
              {canCreateDefinitions && (
                <button
                  className="submit-button"
                  onClick={() => {
                    handleCloseDefinitionDetail();
                    handleEditDefinition(selectedDefinition);
                  }}
                >
                  Editar Plantilla
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TasksScreen;