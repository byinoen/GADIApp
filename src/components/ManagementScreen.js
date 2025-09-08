import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getRegisters, 
  getRegister, 
  createRegister, 
  createProcedure,
  getRegisterEntries 
} from '../services/api';
import './ManagementScreen.css';

function ManagementScreen() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('registers');
  const [registers, setRegisters] = useState([]);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [registerDetails, setRegisterDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Register form state
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    nombre: '',
    tipo: 'general',
    descripcion: '',
    campos_personalizados: []
  });
  
  // Procedure form state
  const [showProcedureForm, setShowProcedureForm] = useState(false);
  const [procedureForm, setProcedureForm] = useState({
    nombre: '',
    receta: {
      ingredientes: [],
      materiales: []
    },
    procedimiento: [],
    precauciones: [],
    tiempo_estimado: '1 hora'
  });
  
  // Editing states
  const [editingRegister, setEditingRegister] = useState(null);
  const [editingProcedure, setEditingProcedure] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'encargado';

  useEffect(() => {
    if (isAdmin) {
      loadRegisters();
    }
  }, [token, isAdmin]);

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
      const response = await getRegister(token, registerId);
      setRegisterDetails(response);
      setSelectedRegister(registerId);
    } catch (error) {
      console.error('Error loading register details:', error);
      alert('Error cargando detalles del registro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await createRegister(token, registerForm);
      alert('Registro creado exitosamente');
      setShowRegisterForm(false);
      setRegisterForm({ nombre: '', tipo: 'general', descripcion: '', campos_personalizados: [] });
      await loadRegisters();
    } catch (error) {
      console.error('Error creating register:', error);
      alert('Error al crear registro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcedure = async (e) => {
    e.preventDefault();
    if (!selectedRegister) return;
    
    setLoading(true);
    
    try {
      await createProcedure(token, selectedRegister, procedureForm);
      alert('Procedimiento creado exitosamente');
      setShowProcedureForm(false);
      setProcedureForm({
        nombre: '',
        receta: { ingredientes: [], materiales: [] },
        procedimiento: [],
        precauciones: [],
        tiempo_estimado: '1 hora'
      });
      await loadRegisterDetails(selectedRegister);
    } catch (error) {
      console.error('Error creating procedure:', error);
      alert('Error al crear procedimiento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    setProcedureForm({
      ...procedureForm,
      receta: {
        ...procedureForm.receta,
        ingredientes: [
          ...procedureForm.receta.ingredientes,
          { nombre: '', cantidad: '', especificacion: '' }
        ]
      }
    });
  };

  const addMaterial = () => {
    setProcedureForm({
      ...procedureForm,
      receta: {
        ...procedureForm.receta,
        materiales: [
          ...procedureForm.receta.materiales,
          { nombre: '', cantidad: '', especificacion: '' }
        ]
      }
    });
  };

  const addStep = () => {
    setProcedureForm({
      ...procedureForm,
      procedimiento: [...procedureForm.procedimiento, '']
    });
  };

  const addPrecaution = () => {
    setProcedureForm({
      ...procedureForm,
      precauciones: [...procedureForm.precauciones, '']
    });
  };

  const updateIngredient = (index, field, value) => {
    const newIngredientes = [...procedureForm.receta.ingredientes];
    newIngredientes[index][field] = value;
    setProcedureForm({
      ...procedureForm,
      receta: {
        ...procedureForm.receta,
        ingredientes: newIngredientes
      }
    });
  };

  const updateMaterial = (index, field, value) => {
    const newMateriales = [...procedureForm.receta.materiales];
    newMateriales[index][field] = value;
    setProcedureForm({
      ...procedureForm,
      receta: {
        ...procedureForm.receta,
        materiales: newMateriales
      }
    });
  };

  const updateStep = (index, value) => {
    const newProcedimiento = [...procedureForm.procedimiento];
    newProcedimiento[index] = value;
    setProcedureForm({
      ...procedureForm,
      procedimiento: newProcedimiento
    });
  };

  const updatePrecaution = (index, value) => {
    const newPrecauciones = [...procedureForm.precauciones];
    newPrecauciones[index] = value;
    setProcedureForm({
      ...procedureForm,
      precauciones: newPrecauciones
    });
  };

  const removeIngredient = (index) => {
    setProcedureForm({
      ...procedureForm,
      receta: {
        ...procedureForm.receta,
        ingredientes: procedureForm.receta.ingredientes.filter((_, i) => i !== index)
      }
    });
  };

  const removeMaterial = (index) => {
    setProcedureForm({
      ...procedureForm,
      receta: {
        ...procedureForm.receta,
        materiales: procedureForm.receta.materiales.filter((_, i) => i !== index)
      }
    });
  };

  const removeStep = (index) => {
    setProcedureForm({
      ...procedureForm,
      procedimiento: procedureForm.procedimiento.filter((_, i) => i !== index)
    });
  };

  const removePrecaution = (index) => {
    setProcedureForm({
      ...procedureForm,
      precauciones: procedureForm.precauciones.filter((_, i) => i !== index)
    });
  };

  // Custom field management functions
  const addCustomField = () => {
    setRegisterForm({
      ...registerForm,
      campos_personalizados: [
        ...registerForm.campos_personalizados,
        { nombre: '', tipo: 'text', etiqueta: '', requerido: false, opciones: [] }
      ]
    });
  };

  const updateCustomField = (index, field, value) => {
    const newFields = [...registerForm.campos_personalizados];
    newFields[index][field] = value;
    
    // Clear options if type is not select
    if (field === 'tipo' && value !== 'select') {
      newFields[index].opciones = [];
    }
    
    setRegisterForm({
      ...registerForm,
      campos_personalizados: newFields
    });
  };

  const removeCustomField = (index) => {
    setRegisterForm({
      ...registerForm,
      campos_personalizados: registerForm.campos_personalizados.filter((_, i) => i !== index)
    });
  };

  const addSelectOption = (fieldIndex) => {
    const newFields = [...registerForm.campos_personalizados];
    if (!newFields[fieldIndex].opciones) {
      newFields[fieldIndex].opciones = [];
    }
    newFields[fieldIndex].opciones.push('');
    
    setRegisterForm({
      ...registerForm,
      campos_personalizados: newFields
    });
  };

  const updateSelectOption = (fieldIndex, optionIndex, value) => {
    const newFields = [...registerForm.campos_personalizados];
    newFields[fieldIndex].opciones[optionIndex] = value;
    
    setRegisterForm({
      ...registerForm,
      campos_personalizados: newFields
    });
  };

  const removeSelectOption = (fieldIndex, optionIndex) => {
    const newFields = [...registerForm.campos_personalizados];
    newFields[fieldIndex].opciones = newFields[fieldIndex].opciones.filter((_, i) => i !== optionIndex);
    
    setRegisterForm({
      ...registerForm,
      campos_personalizados: newFields
    });
  };

  if (!isAdmin) {
    return (
      <div className="management-screen">
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>Solo los administradores y encargados pueden acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="management-screen">
      <div className="management-header">
        <h1>🔧 Gestión de Registros y Procedimientos</h1>
        <p>Administrar registros, recetas y procedimientos del sistema</p>
      </div>

      <div className="management-tabs">
        <button
          className={`tab-button ${activeTab === 'registers' ? 'active' : ''}`}
          onClick={() => setActiveTab('registers')}
        >
          📋 Registros
        </button>
        <button
          className={`tab-button ${activeTab === 'procedures' ? 'active' : ''}`}
          onClick={() => setActiveTab('procedures')}
        >
          📝 Procedimientos
        </button>
      </div>

      {activeTab === 'registers' && (
        <div className="registers-management">
          <div className="section-header">
            <h2>Gestión de Registros</h2>
            <button 
              className="add-button"
              onClick={() => setShowRegisterForm(true)}
            >
              ➕ Nuevo Registro
            </button>
          </div>

          <div className="registers-grid">
            {registers.map((register) => (
              <div 
                key={register.id} 
                className={`register-card ${selectedRegister === register.id ? 'selected' : ''}`}
                onClick={() => loadRegisterDetails(register.id)}
              >
                <div className="register-header">
                  <h3>{register.nombre}</h3>
                  <span className={`register-type ${register.tipo}`}>
                    {register.tipo}
                  </span>
                </div>
                <p className="register-description">{register.descripcion}</p>
                <div className="register-status">
                  <span className={`status-badge ${register.activo ? 'active' : 'inactive'}`}>
                    {register.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="created-date">
                    Creado: {new Date(register.created_at).toLocaleDateString('es-ES')}
                  </span>
                </div>
                {register.campos_personalizados && register.campos_personalizados.length > 0 && (
                  <div className="custom-fields-info">
                    <small>📝 {register.campos_personalizados.length} campos personalizados definidos</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'procedures' && (
        <div className="procedures-management">
          <div className="section-header">
            <h2>Gestión de Procedimientos</h2>
            <div className="procedure-controls">
              <select 
                value={selectedRegister || ''} 
                onChange={(e) => loadRegisterDetails(parseInt(e.target.value))}
                className="register-select"
              >
                <option value="">Seleccionar registro...</option>
                {registers.map((register) => (
                  <option key={register.id} value={register.id}>
                    {register.nombre}
                  </option>
                ))}
              </select>
              {selectedRegister && (
                <button 
                  className="add-button"
                  onClick={() => setShowProcedureForm(true)}
                >
                  ➕ Nuevo Procedimiento
                </button>
              )}
            </div>
          </div>

          {registerDetails && (
            <div className="procedures-list">
              <h3>Procedimientos en: {registerDetails.register.nombre}</h3>
              {registerDetails.procedures.map((procedure) => (
                <div key={procedure.id} className="procedure-card">
                  <div className="procedure-header">
                    <h4>{procedure.nombre}</h4>
                    <span className="procedure-time">⏱️ {procedure.tiempo_estimado}</span>
                  </div>
                  
                  {procedure.receta.ingredientes && procedure.receta.ingredientes.length > 0 && (
                    <div className="recipe-section">
                      <h5>🧪 Ingredientes:</h5>
                      <ul>
                        {procedure.receta.ingredientes.map((ing, idx) => (
                          <li key={idx}>
                            <strong>{ing.nombre}</strong> - {ing.cantidad}
                            {ing.concentracion && ` (${ing.concentracion})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {procedure.receta.materiales && procedure.receta.materiales.length > 0 && (
                    <div className="recipe-section">
                      <h5>🔧 Materiales:</h5>
                      <ul>
                        {procedure.receta.materiales.map((mat, idx) => (
                          <li key={idx}>
                            <strong>{mat.nombre}</strong> - {mat.cantidad}
                            {mat.especificacion && ` (${mat.especificacion})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="procedure-section">
                    <h5>📋 Pasos:</h5>
                    <ol>
                      {procedure.procedimiento.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {procedure.precauciones.length > 0 && (
                    <div className="precautions-section">
                      <h5>⚠️ Precauciones:</h5>
                      <ul>
                        {procedure.precauciones.map((precaution, idx) => (
                          <li key={idx}>{precaution}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Register Form Modal */}
      {showRegisterForm && (
        <div className="modal-overlay" onClick={() => setShowRegisterForm(false)}>
          <div className="modal-content register-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nuevo Registro</h2>
            
            <form onSubmit={handleCreateRegister}>
              <div className="input-group">
                <label className="input-label">Nombre del Registro *</label>
                <input
                  type="text"
                  className="text-input"
                  value={registerForm.nombre}
                  onChange={(e) => setRegisterForm({...registerForm, nombre: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Tipo</label>
                <select
                  className="text-input"
                  value={registerForm.tipo}
                  onChange={(e) => setRegisterForm({...registerForm, tipo: e.target.value})}
                >
                  <option value="general">General</option>
                  <option value="treatment">Tratamiento</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="safety">Seguridad</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Descripción</label>
                <textarea
                  className="text-input textarea-input"
                  value={registerForm.descripcion}
                  onChange={(e) => setRegisterForm({...registerForm, descripcion: e.target.value})}
                  rows="3"
                />
              </div>

              {/* Custom Fields Section */}
              <div className="custom-fields-section">
                <div className="section-header">
                  <label className="input-label">📝 Campos Personalizados del Registro</label>
                  <button type="button" className="add-item-btn" onClick={addCustomField}>
                    ➕ Agregar Campo
                  </button>
                </div>
                <p className="field-description">
                  Define qué información debe registrarse cuando se complete este tipo de registro.
                </p>
                
                {registerForm.campos_personalizados.map((field, index) => (
                  <div key={index} className="custom-field-row">
                    <div className="field-inputs">
                      <input
                        type="text"
                        placeholder="Nombre del campo (ej: fecha_aplicacion)"
                        className="field-input"
                        value={field.nombre}
                        onChange={(e) => updateCustomField(index, 'nombre', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Etiqueta visible (ej: Fecha de Aplicación)"
                        className="field-input"
                        value={field.etiqueta}
                        onChange={(e) => updateCustomField(index, 'etiqueta', e.target.value)}
                      />
                      <select
                        className="field-input"
                        value={field.tipo}
                        onChange={(e) => updateCustomField(index, 'tipo', e.target.value)}
                      >
                        <option value="text">Texto</option>
                        <option value="textarea">Texto largo</option>
                        <option value="number">Número</option>
                        <option value="date">Fecha</option>
                        <option value="select">Lista de opciones</option>
                      </select>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={field.requerido}
                          onChange={(e) => updateCustomField(index, 'requerido', e.target.checked)}
                        />
                        Requerido
                      </label>
                      <button 
                        type="button" 
                        className="remove-btn"
                        onClick={() => removeCustomField(index)}
                      >
                        ❌
                      </button>
                    </div>
                    
                    {/* Select options */}
                    {field.tipo === 'select' && (
                      <div className="select-options">
                        <div className="options-header">
                          <span>Opciones disponibles:</span>
                          <button 
                            type="button" 
                            className="add-option-btn"
                            onClick={() => addSelectOption(index)}
                          >
                            ➕ Opción
                          </button>
                        </div>
                        {(field.opciones || []).map((option, optionIndex) => (
                          <div key={optionIndex} className="option-row">
                            <input
                              type="text"
                              placeholder="Valor de la opción"
                              className="option-input"
                              value={option}
                              onChange={(e) => updateSelectOption(index, optionIndex, e.target.value)}
                            />
                            <button 
                              type="button" 
                              className="remove-option-btn"
                              onClick={() => removeSelectOption(index, optionIndex)}
                            >
                              ❌
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowRegisterForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading || !registerForm.nombre}
                >
                  {loading ? 'Creando...' : 'Crear Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Procedure Form Modal */}
      {showProcedureForm && (
        <div className="modal-overlay" onClick={() => setShowProcedureForm(false)}>
          <div className="modal-content procedure-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Crear Nuevo Procedimiento</h2>
            
            <form onSubmit={handleCreateProcedure}>
              <div className="input-group">
                <label className="input-label">Nombre del Procedimiento *</label>
                <input
                  type="text"
                  className="text-input"
                  value={procedureForm.nombre}
                  onChange={(e) => setProcedureForm({...procedureForm, nombre: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Tiempo Estimado</label>
                <input
                  type="text"
                  className="text-input"
                  value={procedureForm.tiempo_estimado}
                  onChange={(e) => setProcedureForm({...procedureForm, tiempo_estimado: e.target.value})}
                  placeholder="ej: 2 horas"
                />
              </div>

              {/* Ingredients Section */}
              <div className="recipe-section">
                <div className="section-header">
                  <label className="input-label">🧪 Ingredientes</label>
                  <button type="button" className="add-item-btn" onClick={addIngredient}>
                    ➕ Agregar
                  </button>
                </div>
                {procedureForm.receta.ingredientes.map((ingredient, index) => (
                  <div key={index} className="ingredient-row">
                    <input
                      type="text"
                      placeholder="Nombre del ingrediente"
                      className="ingredient-input"
                      value={ingredient.nombre}
                      onChange={(e) => updateIngredient(index, 'nombre', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Cantidad"
                      className="ingredient-input"
                      value={ingredient.cantidad}
                      onChange={(e) => updateIngredient(index, 'cantidad', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Especificación"
                      className="ingredient-input"
                      value={ingredient.especificacion}
                      onChange={(e) => updateIngredient(index, 'especificacion', e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeIngredient(index)}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              {/* Materials Section */}
              <div className="recipe-section">
                <div className="section-header">
                  <label className="input-label">🔧 Materiales</label>
                  <button type="button" className="add-item-btn" onClick={addMaterial}>
                    ➕ Agregar
                  </button>
                </div>
                {procedureForm.receta.materiales.map((material, index) => (
                  <div key={index} className="ingredient-row">
                    <input
                      type="text"
                      placeholder="Nombre del material"
                      className="ingredient-input"
                      value={material.nombre}
                      onChange={(e) => updateMaterial(index, 'nombre', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Cantidad"
                      className="ingredient-input"
                      value={material.cantidad}
                      onChange={(e) => updateMaterial(index, 'cantidad', e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Especificación"
                      className="ingredient-input"
                      value={material.especificacion}
                      onChange={(e) => updateMaterial(index, 'especificacion', e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeMaterial(index)}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              {/* Steps Section */}
              <div className="recipe-section">
                <div className="section-header">
                  <label className="input-label">📋 Pasos del Procedimiento</label>
                  <button type="button" className="add-item-btn" onClick={addStep}>
                    ➕ Agregar
                  </button>
                </div>
                {procedureForm.procedimiento.map((step, index) => (
                  <div key={index} className="step-row">
                    <span className="step-number">{index + 1}.</span>
                    <textarea
                      placeholder="Descripción del paso..."
                      className="step-input"
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      rows="2"
                    />
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removeStep(index)}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              {/* Precautions Section */}
              <div className="recipe-section">
                <div className="section-header">
                  <label className="input-label">⚠️ Precauciones</label>
                  <button type="button" className="add-item-btn" onClick={addPrecaution}>
                    ➕ Agregar
                  </button>
                </div>
                {procedureForm.precauciones.map((precaution, index) => (
                  <div key={index} className="step-row">
                    <span className="precaution-icon">⚠️</span>
                    <textarea
                      placeholder="Precaución o advertencia..."
                      className="step-input precaution-input"
                      value={precaution}
                      onChange={(e) => updatePrecaution(index, e.target.value)}
                      rows="2"
                    />
                    <button 
                      type="button" 
                      className="remove-btn"
                      onClick={() => removePrecaution(index)}
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowProcedureForm(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading || !procedureForm.nombre}
                >
                  {loading ? 'Creando...' : 'Crear Procedimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagementScreen;