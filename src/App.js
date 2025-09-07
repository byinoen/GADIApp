import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import WorkSchedulesScreen from './components/WorkSchedulesScreen';
import TasksScreen from './components/TasksScreen';
import './App.css';

// Main app component that handles navigation
function AppContent() {
  const { isAuthenticated, user, logout } = useAuth();
  const [currentView, setCurrentView] = useState('schedules');

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="app-container">
      <nav className="app-nav">
        <div className="nav-content">
          <h1 className="app-title">GADIApp</h1>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${currentView === 'schedules' ? 'active' : ''}`}
              onClick={() => setCurrentView('schedules')}
            >
              📅 Horarios
            </button>
            <button 
              className={`nav-tab ${currentView === 'tasks' ? 'active' : ''}`}
              onClick={() => setCurrentView('tasks')}
            >
              ✅ Tareas
            </button>
          </div>
          <div className="nav-user">
            <span className="user-info">
              {user?.email} ({user?.role})
            </span>
            <button className="logout-button" onClick={logout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>
      
      <main className="app-main">
        {currentView === 'schedules' ? <WorkSchedulesScreen /> : <TasksScreen />}
      </main>
    </div>
  );
}

// Root App component with providers
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;