import React, { useState } from 'react';
import { login as apiLogin } from '../services/auth.api.js';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      alert('Por favor complete todos los campos');
      return;
    }

    setLoading(true);
    try {
      const response = await apiLogin(email, password);
      
      // Save token and user in context  
      login(response.user, response.access_token, response.permissions);
      
      // Show success message - navigation will happen automatically
      alert('Sesión iniciada exitosamente');
      
    } catch (error) {
      // Show Spanish error message
      alert('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-form">
        <h1 className="login-title">Iniciar Sesión</h1>
        
        <div className="input-container">
          <label className="input-label">Correo electrónico</label>
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ingrese su correo electrónico"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <div className="input-container">
          <label className="input-label">Contraseña</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingrese su contraseña"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <button 
          type="submit"
          className={`login-button ${loading ? 'login-button-disabled' : ''}`}
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Iniciar sesión'}
        </button>

        <div className="demo-credentials">
          <h3 className="demo-title">Credenciales de prueba:</h3>
          <p className="demo-text">admin@example.com / 1234</p>
          <p className="demo-text">encargado@example.com / 1234</p>
          <p className="demo-text">trabajador@example.com / 1234</p>
        </div>
      </form>
    </div>
  );
}