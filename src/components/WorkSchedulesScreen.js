import React, { useState, useEffect } from 'react';
import { getSchedules, createSchedule } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './WorkSchedulesScreen.css';

export default function WorkSchedulesScreen() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    fecha: '',
    turno: 'Mañana (08:00-16:00)',
    empleado_id: '1'
  });
  const [submitting, setSubmitting] = useState(false);
  const { token, user } = useAuth();

  const TURNOS_OPTIONS = [
    'Mañana (08:00-16:00)',
    'Tarde (16:00-00:00)', 
    'Noche (00:00-08:00)'
  ];

  const EMPLEADOS_OPTIONS = [
    { id: 1, name: 'Juan Pérez' },
    { id: 2, name: 'María García' },
    { id: 3, name: 'Carlos López' },
    { id: 4, name: 'Ana Martínez' },
    { id: 5, name: 'Pedro Sánchez' }
  ];

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await getSchedules(token);
      setSchedules(response.schedules);
    } catch (error) {
      alert('Error al cargar los horarios');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const response = await getSchedules(token);
      setSchedules(response.schedules);
    } catch (error) {
      alert('Error al cargar los horarios');
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    console.log('Form submission started:', formData);
    
    if (!formData.fecha) {
      alert('Por favor ingrese una fecha');
      return;
    }

    setSubmitting(true);
    try {
      console.log('Creating schedule with token:', token);
      const result = await createSchedule(token, {
        fecha: formData.fecha,
        turno: formData.turno,
        empleado_id: parseInt(formData.empleado_id)
      });
      
      console.log('Schedule creation result:', result);
      alert('Turno añadido exitosamente');
      setShowForm(false);
      setFormData({
        fecha: '',
        turno: 'Mañana (08:00-16:00)',
        empleado_id: '1'
      });
      loadSchedules(); // Refresh the list
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error al añadir turno: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canCreateSchedules = user?.role === 'admin' || user?.role === 'encargado';

  useEffect(() => {
    if (token) {
      loadSchedules();
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
              {user?.role === 'trabajador' 
                ? 'Mis horarios asignados' 
                : 'Todos los horarios del equipo'}
            </p>
          </div>
          
          {canCreateSchedules && (
            <button
              className="add-button"
              onClick={() => {
                console.log('Add turno button clicked, opening modal');
                setShowForm(true);
              }}
            >
              ➕ Añadir turno
            </button>
          )}
        </div>
        
        <button className="refresh-button" onClick={handleRefresh}>
          Actualizar
        </button>
      </div>

      <div className="schedules-content">
        {schedules.length === 0 ? (
          <div className="empty-container">
            <p className="empty-text">No hay horarios disponibles</p>
          </div>
        ) : (
          <div className="schedules-grid">
            {schedules.map((schedule) => (
              <div key={schedule.id} className="schedule-card">
                <div className="schedule-header">
                  <span className="schedule-date">{formatDate(schedule.fecha)}</span>
                  <span className="schedule-shift">{schedule.turno}</span>
                </div>
                <p className="schedule-employee">Empleado: {schedule.empleado}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Añadir Nuevo Turno</h2>
            {console.log('Modal is being rendered!')}
            
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
    </div>
  );
}