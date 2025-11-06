import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getRegisters, getRegister, getRegisterEntries, exportRegisterPDF, createRegisterEntry, finishTask } from '../services/api';
import './RegisterScreen.css';

function RegisterScreen({ navigationParams }) {
  const { user, token } = useAuth();
  const { clearParams } = useNavigation();
  const [registers, setRegisters] = useState([]);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [registerDetails, setRegisterDetails] = useState(null);
  const [registerEntries, setRegisterEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState({
    task_id: '',
    observaciones: '',
    resultado: 'completado',
    tiempo_real: ''
  });
  const [dateFilter, setDateFilter] = useState({
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [pendingProcedureOpen, setPendingProcedureOpen] = useState(null);

  const isManager = user?.role === 'admin' || user?.role === 'encargado';

  useEffect(() => {
    loadRegisters();
  }, [token]);

  useEffect(() => {
    if (navigationParams?.autoOpen && navigationParams?.registerId) {
      if (navigationParams.procedureId && navigationParams.taskId) {
        setPendingProcedureOpen({
          procedureId: navigationParams.procedureId,
          taskId: navigationParams.taskId
        });
      }
      loadRegisterDetails(navigationParams.registerId);
      clearParams();
    }
  }, [navigationParams]);

  useEffect(() => {
    if (pendingProcedureOpen && registerDetails?.procedures) {
      const procedure = registerDetails.procedures.find(
        p => p.id === pendingProcedureOpen.procedureId
      );
      if (procedure) {
        setSelectedProcedure(procedure);
        setSignatureData({
          task_id: pendingProcedureOpen.taskId.toString(),
          observaciones: '',
          resultado: 'completado',
          tiempo_real: ''
        });
        setShowSignModal(true);
        setPendingProcedureOpen(null);
      }
    }
  }, [registerDetails?.procedures, pendingProcedureOpen]);

  const loadRegisters = async () => {
    setLoading(true);
    try {
      const response = await getRegisters(token);
      setRegisters(response.registers || []);
    } catch (error) {
      console.error('Error loading registers:', error);
      alert('Error cargando registros: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRegisterDetails = async (registerId) => {
    setLoading(true);
    try {
      const [detailsResponse, entriesResponse] = await Promise.all([
        getRegister(token, registerId),
        getRegisterEntries(token, registerId, dateFilter.fecha_inicio, dateFilter.fecha_fin)
      ]);
      
      setRegisterDetails(detailsResponse);
      setRegisterEntries(entriesResponse.entries || []);
      setSelectedRegister(registerId);
    } catch (error) {
      console.error('Error loading register details:', error);
      alert('Error cargando detalles del registro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedRegister) return;
    
    setLoading(true);
    try {
      const response = await exportRegisterPDF(
        token, 
        selectedRegister, 
        dateFilter.fecha_inicio, 
        dateFilter.fecha_fin
      );
      
      // Create download link for PDF
      const blob = new Blob([Uint8Array.from(atob(response.pdf_base64), c => c.charCodeAt(0))], {
        type: 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('PDF generado y descargado exitosamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error generando PDF: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignProcedure = async () => {
    if (!selectedRegister || !selectedProcedure) return;
    
    setLoading(true);
    try {
      const entryData = {
        task_id: parseInt(signatureData.task_id) || null,
        procedure_id: selectedProcedure.id,
        empleado_id: user.id,
        observaciones: signatureData.observaciones,
        resultado: signatureData.resultado,
        tiempo_real: signatureData.tiempo_real
      };
      
      const response = await createRegisterEntry(token, selectedRegister, entryData);
      
      if (entryData.task_id) {
        try {
          await finishTask(token, entryData.task_id, {
            observaciones: signatureData.observaciones,
            resultado: signatureData.resultado
          });
          alert('✅ Registro firmado y tarea completada automáticamente');
        } catch (taskError) {
          console.error('Error completing task:', taskError);
          alert('✅ Registro firmado. Nota: No se pudo completar la tarea automáticamente.');
        }
      } else {
        alert('✅ Registro firmado exitosamente');
      }
      
      const entriesResponse = await getRegisterEntries(
        token, 
        selectedRegister, 
        dateFilter.fecha_inicio, 
        dateFilter.fecha_fin
      );
      setRegisterEntries(entriesResponse.entries || []);
      
      setSignatureData({
        task_id: '',
        observaciones: '',
        resultado: 'completado',
        tiempo_real: ''
      });
      setShowSignModal(false);
      
      alert('Registro firmado exitosamente');
    } catch (error) {
      console.error('Error signing procedure:', error);
      alert('Error al firmar el registro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'alta': return '#FF3B30';
      case 'media': return '#FF9500';
      case 'baja': return '#34C759';
      default: return '#007AFF';
    }
  };

  const getResultadoColor = (resultado) => {
    switch(resultado) {
      case 'completado': return '#34C759';
      case 'incompleto': return '#FF3B30';
      case 'con_observaciones': return '#FF9500';
      default: return '#007AFF';
    }
  };

  if (loading) {
    return (
      <div className="register-screen">
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando registros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-screen">
      <div className="register-header">
        <h1>📋 Registros y Documentación</h1>
        <p>Gestión de registros de procedimientos y firmas de empleados</p>
      </div>

      {!selectedRegister ? (
        <div className="registers-list">
          <h2>Registros Disponibles</h2>
          {registers.length === 0 ? (
            <div className="empty-state">
              <p>📄 No hay registros disponibles</p>
            </div>
          ) : (
            <div className="registers-grid">
              {registers.map(register => (
                <div 
                  key={register.id} 
                  className="register-card"
                  onClick={() => loadRegisterDetails(register.id)}
                >
                  <h3>{register.nombre}</h3>
                  <p className="register-description">{register.descripcion}</p>
                  <div className="register-type">
                    <span className={`type-badge ${register.tipo}`}>
                      {register.tipo === 'treatment' ? 'Tratamiento' : 
                       register.tipo === 'maintenance' ? 'Mantenimiento' : 'General'}
                    </span>
                  </div>
                  <div className="register-date">
                    Creado: {formatDate(register.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="register-details">
          <div className="register-actions">
            <button onClick={() => setSelectedRegister(null)} className="back-button">
              ← Volver a Registros
            </button>
            {isManager && (
              <button onClick={handleExportPDF} className="export-button">
                📄 Exportar PDF
              </button>
            )}
          </div>

          <div className="register-info">
            <h2>{registerDetails?.register.nombre}</h2>
            <p>{registerDetails?.register.descripcion}</p>
          </div>

          <div className="date-filters">
            <h3>Filtrar por Fecha</h3>
            <div className="filter-row">
              <div className="filter-group">
                <label>Fecha Inicio:</label>
                <input
                  type="date"
                  value={dateFilter.fecha_inicio}
                  onChange={(e) => setDateFilter({...dateFilter, fecha_inicio: e.target.value})}
                />
              </div>
              <div className="filter-group">
                <label>Fecha Fin:</label>
                <input
                  type="date"
                  value={dateFilter.fecha_fin}
                  onChange={(e) => setDateFilter({...dateFilter, fecha_fin: e.target.value})}
                />
              </div>
              <button 
                onClick={() => loadRegisterDetails(selectedRegister)}
                className="filter-button"
              >
                Filtrar
              </button>
              <button 
                onClick={() => {
                  setDateFilter({fecha_inicio: '', fecha_fin: ''});
                  loadRegisterDetails(selectedRegister);
                }}
                className="clear-filter-button"
              >
                Limpiar
              </button>
            </div>
          </div>

          <div className="procedures-section">
            <h3>Procedimientos Disponibles</h3>
            <div className="procedures-grid">
              {registerDetails?.procedures.map(procedure => (
                <div key={procedure.id} className="procedure-card">
                  <h4>{procedure.nombre}</h4>
                  <p><strong>Tiempo estimado:</strong> {procedure.tiempo_estimado}</p>
                  <div className="procedure-actions">
                    <button 
                      onClick={() => {
                        setSelectedProcedure(procedure);
                        setShowProcedureModal(true);
                      }}
                      className="view-button"
                    >
                      👁️ Ver Detalles
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedProcedure(procedure);
                        setShowSignModal(true);
                      }}
                      className="sign-button"
                    >
                      ✍️ Firmar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="entries-section">
            <h3>Entradas del Registro ({registerEntries.length})</h3>
            {registerEntries.length === 0 ? (
              <div className="empty-state">
                <p>📝 No hay entradas registradas para el período seleccionado</p>
              </div>
            ) : (
              <div className="entries-table">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Empleado</th>
                      <th>Procedimiento</th>
                      <th>Resultado</th>
                      <th>Tiempo Real</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registerEntries.map(entry => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.fecha_completado)}</td>
                        <td>{entry.empleado_name}</td>
                        <td>
                          {registerDetails?.procedures.find(p => p.id === entry.procedure_id)?.nombre || 'N/A'}
                        </td>
                        <td>
                          <span 
                            className="resultado-badge" 
                            style={{backgroundColor: getResultadoColor(entry.resultado)}}
                          >
                            {entry.resultado.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{entry.tiempo_real || 'N/A'}</td>
                        <td className="observations">
                          {entry.observaciones || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Procedure Details Modal */}
      {showProcedureModal && selectedProcedure && (
        <div className="modal-overlay" onClick={() => setShowProcedureModal(false)}>
          <div className="modal procedure-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 {selectedProcedure.nombre}</h3>
              <button onClick={() => setShowProcedureModal(false)} className="close-button">×</button>
            </div>
            
            <div className="procedure-content">
              <div className="procedure-info">
                <p><strong>Tiempo estimado:</strong> {selectedProcedure.tiempo_estimado}</p>
              </div>

              {selectedProcedure.receta && (
                <div className="recipe-section">
                  <h4>🧪 Receta/Materiales</h4>
                  {selectedProcedure.receta.ingredientes && (
                    <div>
                      <h5>Ingredientes:</h5>
                      <ul>
                        {selectedProcedure.receta.ingredientes.map((ing, index) => (
                          <li key={index}>
                            <strong>{ing.nombre}:</strong> {ing.cantidad}
                            {ing.concentracion && ` (${ing.concentracion})`}
                            {ing.especificacion && ` - ${ing.especificacion}`}
                            {ing.codigo && ` - Código: ${ing.codigo}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedProcedure.receta.materiales && (
                    <div>
                      <h5>Materiales:</h5>
                      <ul>
                        {selectedProcedure.receta.materiales.map((mat, index) => (
                          <li key={index}>
                            <strong>{mat.nombre}:</strong> {mat.cantidad}
                            {mat.especificacion && ` - ${mat.especificacion}`}
                            {mat.codigo && ` - Código: ${mat.codigo}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedProcedure.receta.proporcion && (
                    <p><strong>Proporción:</strong> {selectedProcedure.receta.proporcion}</p>
                  )}
                  {selectedProcedure.receta.volumen_total && (
                    <p><strong>Volumen total:</strong> {selectedProcedure.receta.volumen_total}</p>
                  )}
                </div>
              )}

              <div className="procedure-steps">
                <h4>📝 Procedimiento</h4>
                <ol>
                  {selectedProcedure.procedimiento.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="precautions-section">
                <h4>⚠️ Precauciones</h4>
                <ul className="precautions-list">
                  {selectedProcedure.precauciones.map((precaution, index) => (
                    <li key={index} className="precaution-item">
                      {precaution}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignModal && selectedProcedure && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal sign-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✍️ Firmar Procedimiento: {selectedProcedure.nombre}</h3>
              <button onClick={() => setShowSignModal(false)} className="close-button">×</button>
            </div>
            
            <div className="sign-form">
              <div className="form-group">
                <label>ID de Tarea (opcional):</label>
                <input
                  type="number"
                  value={signatureData.task_id}
                  onChange={(e) => setSignatureData({...signatureData, task_id: e.target.value})}
                  placeholder="Número de tarea relacionada"
                />
              </div>

              <div className="form-group">
                <label>Resultado:</label>
                <select
                  value={signatureData.resultado}
                  onChange={(e) => setSignatureData({...signatureData, resultado: e.target.value})}
                >
                  <option value="completado">Completado</option>
                  <option value="incompleto">Incompleto</option>
                  <option value="con_observaciones">Con observaciones</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tiempo real empleado:</label>
                <input
                  type="text"
                  value={signatureData.tiempo_real}
                  onChange={(e) => setSignatureData({...signatureData, tiempo_real: e.target.value})}
                  placeholder="ej: 2 horas, 45 minutos"
                />
              </div>

              <div className="form-group">
                <label>Observaciones:</label>
                <textarea
                  value={signatureData.observaciones}
                  onChange={(e) => setSignatureData({...signatureData, observaciones: e.target.value})}
                  placeholder="Cualquier observación sobre la ejecución del procedimiento..."
                  rows="4"
                />
              </div>

              <div className="sign-actions">
                <button onClick={() => setShowSignModal(false)} className="cancel-button">
                  Cancelar
                </button>
                <button onClick={handleSignProcedure} className="confirm-sign-button">
                  ✍️ Confirmar Firma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterScreen;