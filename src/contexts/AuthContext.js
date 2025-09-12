import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getStoredAuth } from '../services/auth.api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedAuth = getStoredAuth();
    
    if (storedAuth && storedAuth.access_token && storedAuth.user) {
      setUser(storedAuth.user);
      setToken(storedAuth.access_token);
      setCurrentUser({
        nombre: storedAuth.user.nombre || storedAuth.user.name || storedAuth.user.email,
        role: storedAuth.user.role,
        employee_id: storedAuth.user.id
      });
      setIsAuthenticated(true);
    }
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await apiLogin(email, password);
      
      if (response.user && response.access_token) {
        setUser(response.user);
        setToken(response.access_token);
        setCurrentUser({
          nombre: response.user.nombre || response.user.name || response.user.email,
          role: response.user.role,
          employee_id: response.user.id
        });
        setIsAuthenticated(true);
        return response;
      } else {
        throw new Error('Invalid response from login API');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signOut = () => {
    apiLogout(); // Clears localStorage
    setUser(null);
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Legacy login method for backward compatibility
  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setCurrentUser({
      nombre: userData.nombre || userData.name || userData.email,
      role: userData.role,
      employee_id: userData.id
    });
    setIsAuthenticated(true);
    
    // Persist to localStorage in new format
    const authData = {
      access_token: userToken,
      user: userData
    };
    localStorage.setItem('auth', JSON.stringify(authData));
  };

  // Legacy logout method for backward compatibility
  const logout = signOut;

  const value = {
    user,
    token,
    currentUser,
    isAuthenticated,
    signIn,
    signOut,
    login, // Keep for backward compatibility
    logout // Keep for backward compatibility
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}