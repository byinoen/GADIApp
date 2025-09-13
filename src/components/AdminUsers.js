import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { listUsers, createUser, updateUser, deleteUser } from '../services/users.api.js';
import { listEmployees } from '../services/employees.api.js';
import './AdminUsers.css';

function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Form state for adding new user
  const [formData, setFormData] = useState({
    email: '',
    nombre: '',
    role: 'trabajador',
    employee_id: '',
    password: ''
  });

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="admin-users-container">
        <div className="permission-denied">
          <h2>Permiso denegado</h2>
          <p>Solo los administradores pueden acceder a esta página.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [usersResponse, employeesResponse] = await Promise.all([
        listUsers(),
        listEmployees()
      ]);
      
      setUsers(Array.isArray(usersResponse) ? usersResponse : []);
      setEmployees(Array.isArray(employeesResponse) ? employeesResponse : []);
    } catch (err) {
      console.error('Error loading data:', err);
      if (err.message.includes('403')) {
        setError('Permiso denegado por el servidor');
      } else {
        setError('Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.nombre || !formData.password) {
      setError('Complete los campos obligatorios');
      return;
    }

    try {
      setOperationLoading(true);
      setError('');

      const userData = {
        email: formData.email,
        nombre: formData.nombre,
        role: formData.role,
        password: formData.password
      };

      if (formData.employee_id) {
        userData.employee_id = parseInt(formData.employee_id);
      }

      await createUser(userData);
      
      // Reset form and reload
      setFormData({
        email: '',
        nombre: '',
        role: 'trabajador',
        employee_id: '',
        password: ''
      });
      setShowAddForm(false);
      await loadData();
    } catch (err) {
      console.error('Error creating user:', err);
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        setError('El correo ya está registrado');
      } else if (err.message.includes('403')) {
        setError('Permiso denegado por el servidor');
      } else {
        setError('Error al crear el usuario');
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser({
      ...user,
      newPassword: '' // For optional password change
    });
  };

  const handleSaveEdit = async (userId) => {
    try {
      setOperationLoading(true);
      setError('');

      const updateData = {
        nombre: editingUser.nombre,
        role: editingUser.role
      };

      if (editingUser.employee_id) {
        updateData.employee_id = parseInt(editingUser.employee_id);
      }

      // Only include password if it's being changed
      if (editingUser.newPassword) {
        updateData.password = editingUser.newPassword;
      }

      await updateUser(userId, updateData);
      setEditingUser(null);
      await loadData();
    } catch (err) {
      console.error('Error updating user:', err);
      if (err.message.includes('403')) {
        setError('Permiso denegado por el servidor');
      } else {
        setError('Error al actualizar el usuario');
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`¿Está seguro de eliminar al usuario ${email}?`)) {
      return;
    }

    try {
      setOperationLoading(true);
      setError('');
      
      await deleteUser(userId);
      await loadData();
    } catch (err) {
      console.error('Error deleting user:', err);
      if (err.message.includes('403')) {
        setError('Permiso denegado por el servidor');
      } else {
        setError('Error al eliminar el usuario');
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return '-';
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.nombre : `ID: ${employeeId}`;
  };

  if (loading) {
    return (
      <div className="admin-users-container">
        <div className="loading-message">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="admin-users-container">
      <div className="admin-users-header">
        <h2 className="admin-users-title">Gestión de Usuarios</h2>
        <button 
          className="add-user-button"
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={operationLoading}
        >
          {showAddForm ? 'Cancelar' : 'Añadir Usuario'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showAddForm && (
        <form className="user-form" onSubmit={handleSubmit}>
          <h3>Nuevo Usuario</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Correo *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={operationLoading}
              />
            </div>
            <div className="form-group">
              <label>Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                required
                disabled={operationLoading}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Rol *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                disabled={operationLoading}
              >
                <option value="trabajador">Trabajador</option>
                <option value="encargado">Encargado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="form-group">
              <label>Empleado (opcional)</label>
              <select
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                disabled={operationLoading}
              >
                <option value="">Seleccionar empleado...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Contraseña *</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                disabled={operationLoading}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="cancel-form-button"
              onClick={() => setShowAddForm(false)}
              disabled={operationLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={operationLoading}
            >
              {operationLoading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      )}

      <table className="users-table">
        <thead>
          <tr>
            <th>Correo</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Empleado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>
                {editingUser?.id === user.id ? (
                  <div className="inline-edit">
                    <input
                      type="text"
                      value={editingUser.nombre}
                      onChange={(e) => setEditingUser({...editingUser, nombre: e.target.value})}
                      disabled={operationLoading}
                    />
                  </div>
                ) : user.nombre}
              </td>
              <td>
                {editingUser?.id === user.id ? (
                  <div className="inline-edit">
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                      disabled={operationLoading}
                    >
                      <option value="trabajador">Trabajador</option>
                      <option value="encargado">Encargado</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                ) : user.role}
              </td>
              <td>
                {editingUser?.id === user.id ? (
                  <div className="inline-edit">
                    <select
                      value={editingUser.employee_id || ''}
                      onChange={(e) => setEditingUser({...editingUser, employee_id: e.target.value ? parseInt(e.target.value) : null})}
                      disabled={operationLoading}
                    >
                      <option value="">Sin empleado</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>
                ) : getEmployeeName(user.employee_id)}
              </td>
              <td>
                <div className="user-actions">
                  {editingUser?.id === user.id ? (
                    <>
                      <button
                        className="save-button"
                        onClick={() => handleSaveEdit(user.id)}
                        disabled={operationLoading}
                      >
                        Guardar
                      </button>
                      <button
                        className="cancel-button"
                        onClick={() => setEditingUser(null)}
                        disabled={operationLoading}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="edit-button"
                        onClick={() => handleEdit(user)}
                        disabled={operationLoading}
                      >
                        Editar
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={operationLoading}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#7f8c8d'}}>
                No hay usuarios registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AdminUsers;