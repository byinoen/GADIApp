import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, getStoredUser, getStoredToken } from '../services/auth.api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const storedUser = getStoredUser();
    const storedToken = getStoredToken();
    
    if (storedUser && storedToken) {
      setUser(storedUser);
      setToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  const signIn = async (email, password) => {
    try {
      const response = await apiLogin(email, password);
      
      if (response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
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
    setIsAuthenticated(false);
  };

  // Legacy login method for backward compatibility
  const login = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    setIsAuthenticated(true);
    
    // Persist to localStorage for consistency
    if (userToken) {
      localStorage.setItem('token', userToken);
      localStorage.setItem('X-Demo-Token', userToken);
    }
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  // Legacy logout method for backward compatibility
  const logout = signOut;

  const value = {
    user,
    token,
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