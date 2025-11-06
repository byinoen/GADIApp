import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import LoginScreen from './components/LoginScreen';
import WorkSchedulesScreen from './components/WorkSchedulesScreen';
import TasksScreen from './components/TasksScreen';
import RegisterScreen from './components/RegisterScreen';
import ManagementScreen from './components/ManagementScreen';
import './App.css';

// Main app component that handles navigation
function AppContent() {
  const { isAuthenticated, user, currentUser, logout } = useAuth();
  const { currentView, navigationParams, setCurrentView } = useNavigation();
  const isManager = user?.role === 'admin' || user?.role === 'encargado';

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
            <button 
              className={`nav-tab ${currentView === 'registers' ? 'active' : ''}`}
              onClick={() => setCurrentView('registers')}
            >
              📋 Registros
            </button>
            {isManager && (
              <button 
                className={`nav-tab ${currentView === 'management' ? 'active' : ''}`}
                onClick={() => setCurrentView('management')}
              >
                🔧 Gestión
              </button>
            )}
          </div>
          <div className="nav-user">
            <span className="user-info">
              Hola, {currentUser?.nombre || user?.email}
            </span>
            <button className="logout-button" onClick={logout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>
      
      <main className="app-main">
        {currentView === 'schedules' && <WorkSchedulesScreen />}
        {currentView === 'tasks' && <TasksScreen />}
        {currentView === 'registers' && <RegisterScreen navigationParams={navigationParams} />}
        {currentView === 'management' && <ManagementScreen />}
      </main>
    </div>
  );
}

// Root App component with providers
function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;