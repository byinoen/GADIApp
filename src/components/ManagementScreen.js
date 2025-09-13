import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getRegisters, 
  getRegister, 
  createRegister,
  updateRegister,
  createProcedure,
  getRegisterEntries,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../services/api';
import './ManagementScreen.css';

function ManagementScreen() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('registers');
  const [registers, setRegisters] = useState([]);
  const [selectedRegister, setSelectedRegister] = useState(null);
  const [registerDetails, setRegisterDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // User management state
  const [employees, setEmployees] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    nombre: '',
    email: '',
    role: 'trabajador',
    telefono: '',
    activo: true,
    password: ''
  });
  
  // Role management state
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([
    { value: 'trabajador', label: 'Trabajador', description: 'Acceso básico a tareas y horarios' },
    { value: 'encargado', label: 'Encargado', description: 'Gestión de empleados y asignación de tareas' },
    { value: 'admin', label: 'Administrador', description: 'Acceso completo al sistema' }
  ]);
  const [roleForm, setRoleForm] = useState({ value: '', label: '', description: '' });
  const [editingRole, setEditingRole] = useState(null);
  
  // Register form state
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [editingRegister, setEditingRegister] = useState(null);
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
  const [editingProcedure, setEditingProcedure] = useState(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'encargado';

  useEffect(() => {
    if (isAdmin) {
      loadRegisters();
      loadEmployees();
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
      if (editingRegister) {
        // Update existing register
        await updateRegister(token, editingRegister.id, registerForm);
        alert('Registro actualizado exitosamente');
      } else {
        // Create new register
        await createRegister(token, registerForm);
        alert('Registro creado exitosamente');
      }
      
      setShowRegisterForm(false);
      setEditingRegister(null);
      setRegisterForm({ nombre: '', tipo: 'general', descripcion: '', campos_personalizados: [] });
      await loadRegisters();
    } catch (error) {
      console.error('Error saving register:', error);
      alert('Error al guardar registro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRegister = (register) => {
    setEditingRegister(register);
    setRegisterForm({
      nombre: register.nombre,
      tipo: register.tipo,
      descripcion: register.descripcion,
      campos_personalizados: register.campos_personalizados || []
    });
    setShowRegisterForm(true);
  };

  const handleCancelRegisterForm = () => {
    setShowRegisterForm(false);
    setEditingRegister(null);
    setRegisterForm({ nombre: '', tipo: 'general', descripcion: '', campos_personalizados: [] });
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

  // Employee management functions
  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await getEmployees(token);
      setEmployees(response.employees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      alert('Error cargando empleados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingUser) {
        await updateEmployee(token, editingUser.id, userForm);
        alert('Usuario actualizado exitosamente');
      } else {
        await createEmployee(token, userForm);
        alert('Usuario creado exitosamente');
      }
      
      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({ nombre: '', email: '', role: 'trabajador', telefono: '', activo: true, password: '' });
      await loadEmployees();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar usuario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserForm({
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      telefono: user.telefono,
      activo: user.activo,
      password: '' // Don't pre-fill password
    });
    setShowUserForm(true);
  };


  const handleDeactivateUser = async (user) => {
    if (window.confirm(`¿Está seguro que desea desactivar al usuario ${user.nombre}?`)) {
      setLoading(true);
      try {
        await deleteEmployee(token, user.id);
        alert('Usuario desactivado exitosamente');
        await loadEmployees();
      } catch (error) {
        console.error('Error deactivating user:', error);
        alert('Error al desactivar usuario: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Role management functions
  const handleCancelUserForm = () => {
    setShowUserForm(false);
    setEditingUser(null);
    setUserForm({ nombre: '', email: '', role: 'trabajador', telefono: '', activo: true, password: '' });
  };

  const handleAddRole = () => {
    if (roleForm.value && roleForm.label) {
      if (editingRole) {
        setAvailableRoles(roles => roles.map(role => 
          role.value === editingRole.value ? { ...roleForm } : role
        ));
        alert('Rol actualizado exitosamente');
      } else {
        if (availableRoles.find(role => role.value === roleForm.value)) {
          alert('Ya existe un rol con ese valor');
          return;
        }
        setAvailableRoles(roles => [...roles, { ...roleForm }]);
        alert('Rol agregado exitosamente');
      }
      setRoleForm({ value: '', label: '', description: '' });
      setEditingRole(null);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleForm({ ...role });
  };

  const handleDeleteRole = (roleValue) => {
    if (['trabajador', 'encargado', 'admin'].includes(roleValue)) {
      alert('No se pueden eliminar los roles predeterminados del sistema');
      return;
    }
    
    const usersWithRole = employees.filter(emp => emp.role === roleValue);
    if (usersWithRole.length > 0) {
      alert(`No se puede eliminar el rol porque ${usersWithRole.length} usuario(s) lo tienen asignado`);
      return;
    }
    
    if (window.confirm(`¿Está seguro que desea eliminar el rol "${roleValue}"?`)) {
      setAvailableRoles(roles => roles.filter(role => role.value !== roleValue));
      alert('Rol eliminado exitosamente');
    }
  };

  const handleCancelRoleForm = () => {
    setRoleForm({ value: '', label: '', description: '' });
    setEditingRole(null);
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
        <button
          className={`tab-button ${activeTab === 'usuarios' ? 'active' : ''}`}
          onClick={() => setActiveTab('usuarios')}
        >
          👥 Usuarios
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
              <div key={register.id} className="register-card-container">
                <div 
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
                <button 
                  className="edit-register-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditRegister(register);
                  }}
                  title="Editar registro"
                >
                  ✏️ Editar
                </button>
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

      {activeTab === 'usuarios' && (
        <div className="users-management">
          <div className="section-header">
            <h2>Gestión de Usuarios</h2>
            <div className="section-actions">
              <button 
                className="add-button"
                onClick={() => setShowUserForm(true)}
              >
                ➕ Nuevo Usuario
              </button>
              <button 
                className="role-manager-button"
                onClick={() => setShowRoleManager(true)}
              >
                🔧 Gestionar Roles
              </button>
            </div>
          </div>

          <div className="users-grid">
            {employees.map((user) => {
              const roleInfo = availableRoles.find(r => r.value === user.role) || { label: user.role, description: '' };
              return (
                <div key={user.id} className="user-card-container">
                  <div className={`user-card ${!user.activo ? 'inactive' : ''}`}>
                    <div className="user-header">
                      <h3>{user.nombre}</h3>
                      <span className={`role-badge ${user.role}`} title={roleInfo.description}>
                        {roleInfo.label}
                      </span>
                    </div>
                    <div className="user-info">
                      <p><strong>📧 Email:</strong> {user.email}</p>
                      <p><strong>📞 Teléfono:</strong> {user.telefono || 'No especificado'}</p>
                      <p><strong>📅 Registrado:</strong> {new Date(user.created_at).toLocaleDateString('es-ES')}</p>
                      <p><strong>🔑 Rol:</strong> {roleInfo.description}</p>
                    </div>
                    <div className="user-status">
                      <span className={`status-badge ${user.activo ? 'active' : 'inactive'}`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                  <div className="user-actions">
                    <button 
                      className="edit-user-btn"
                      onClick={() => handleEditUser(user)}
                      title="Editar usuario"
                    >
                      ✏️ Editar
                    </button>
                    {user.activo && (
                      <button 
                        className="deactivate-user-btn"
                        onClick={() => handleDeactivateUser(user)}
                        title="Desactivar usuario"
                      >
                        ❌ Desactivar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <div className="modal-overlay" onClick={handleCancelUserForm}>
          <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            
            <form onSubmit={handleCreateUser}>
              <div className="input-group">
                <label className="input-label">Nombre Completo *</label>
                <input
                  type="text"
                  className="text-input"
                  value={userForm.nombre}
                  onChange={(e) => setUserForm({...userForm, nombre: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Email *</label>
                <input
                  type="email"
                  className="text-input"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label">Contraseña {editingUser ? '(dejar vacío para mantener actual)' : '*'}</label>
                <input
                  type="password"
                  className="text-input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  required={!editingUser}
                  placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Rol</label>
                <select
                  className="text-input"
                  value={userForm.role}
                  onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                >
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value} title={role.description}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <small className="input-help">
                  {availableRoles.find(r => r.value === userForm.role)?.description || ''}
                </small>
              </div>

              <div className="input-group">
                <label className="input-label">Teléfono</label>
                <input
                  type="tel"
                  className="text-input"
                  value={userForm.telefono}
                  onChange={(e) => setUserForm({...userForm, telefono: e.target.value})}
                  placeholder="+34 123 456 789"
                />
              </div>

              <div className="input-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={userForm.activo}
                    onChange={(e) => setUserForm({...userForm, activo: e.target.checked})}
                  />
                  Usuario activo
                </label>
              </div>

              <div className="modal-buttons">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={handleCancelUserForm}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editingUser ? 'Actualizar Usuario' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Manager Modal */}
      {showRoleManager && (
        <div className="modal-overlay" onClick={() => setShowRoleManager(false)}>
          <div className="modal-content role-manager-modal" onClick={(e) => e.stopPropagation()}>
            <h2>🔧 Gestión de Roles</h2>
            
            <div className="role-manager-content">
              <div className="role-form-section">
                <h3>{editingRole ? 'Editar Rol' : 'Agregar Nuevo Rol'}</h3>
                <div className="role-form">
                  <div className="input-group">
                    <label className="input-label">Valor del Rol *</label>
                    <input
                      type="text"
                      className="text-input"
                      value={roleForm.value}
                      onChange={(e) => setRoleForm({...roleForm, value: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                      placeholder="ej: supervisor"
                      disabled={editingRole && ['trabajador', 'encargado', 'admin'].includes(editingRole.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Nombre del Rol *</label>
                    <input
                      type="text"
                      className="text-input"
                      value={roleForm.label}
                      onChange={(e) => setRoleForm({...roleForm, label: e.target.value})}
                      placeholder="ej: Supervisor"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Descripción</label>
                    <textarea
                      className="text-input"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                      placeholder="Describe los permisos y responsabilidades de este rol"
                      rows="3"
                    />
                  </div>
                  <div className="role-form-actions">
                    <button type="button" className="cancel-button" onClick={handleCancelRoleForm}>
                      Cancelar
                    </button>
                    <button type="button" className="save-button" onClick={handleAddRole}>
                      {editingRole ? 'Actualizar' : 'Agregar'} Rol
                    </button>
                  </div>
                </div>
              </div>

              <div className="roles-list-section">
                <h3>Roles Existentes</h3>
                <div className="roles-list">
                  {availableRoles.map((role) => {
                    const isSystemRole = ['trabajador', 'encargado', 'admin'].includes(role.value);
                    const usersCount = employees.filter(emp => emp.role === role.value).length;
                    
                    return (
                      <div key={role.value} className={`role-item ${isSystemRole ? 'system-role' : 'custom-role'}`}>
                        <div className="role-info">
                          <div className="role-header">
                            <strong>{role.label}</strong>
                            <span className={`role-badge ${role.value}`}>{role.value}</span>
                            {isSystemRole && <span className="system-badge">Sistema</span>}
                          </div>
                          <p className="role-description">{role.description}</p>
                          <small className="users-count">👥 {usersCount} usuario(s) con este rol</small>
                        </div>
                        <div className="role-actions">
                          <button 
                            className="edit-role-btn"
                            onClick={() => handleEditRole(role)}
                          >
                            ✏️ Editar
                          </button>
                          {!isSystemRole && (
                            <button 
                              className="delete-role-btn"
                              onClick={() => handleDeleteRole(role.value)}
                              disabled={usersCount > 0}
                              title={usersCount > 0 ? 'No se puede eliminar, hay usuarios asignados' : 'Eliminar rol'}
                            >
                              🗑️ Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowRoleManager(false);
                  handleCancelRoleForm();
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Form Modal */}
      {showRegisterForm && (
        <div className="modal-overlay" onClick={() => setShowRegisterForm(false)}>
          <div className="modal-content register-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRegister ? 'Editar Registro' : 'Crear Nuevo Registro'}</h2>
            
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