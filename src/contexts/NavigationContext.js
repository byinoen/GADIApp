import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [currentView, setCurrentView] = useState('schedules');
  const [navigationParams, setNavigationParams] = useState(null);

  const navigateTo = (view, params = null) => {
    setCurrentView(view);
    setNavigationParams(params);
  };

  const clearParams = () => {
    setNavigationParams(null);
  };

  return (
    <NavigationContext.Provider value={{
      currentView,
      navigationParams,
      navigateTo,
      clearParams,
      setCurrentView
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
