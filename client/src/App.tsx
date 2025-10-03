import React, { useState, useEffect } from 'react';
import {Routes, Route, Navigate, MemoryRouter, BrowserRouter} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import PlayerView from './components/PlayerView';
import api from './utils/api';
import storage from "./utils/storage";

const useMemoryRouter = import.meta.env.VITE_REACT_APP_USE_MEMORY_ROUTER === 'true';
const Router = useMemoryRouter ? MemoryRouter : BrowserRouter;

function App() {
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [triggerLogout, setTriggerLogout] = useState(false);

  useEffect(() => {
    checkAuthStatus();

    // Listen for logout event from tray
    if (window.trayControls?.onLogout) {
      window.trayControls.onLogout(() => {
        setTriggerLogout(true);
      });
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = storage.get('token');
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        if (window.trayControls?.updateAuthState) {
          window.trayControls.updateAuthState(false);
        }
        return;
      }

      const response = await api.get('/auth/status');
      const authenticated = response.data.authenticated;
      setIsAuthenticated(authenticated);
      if (window.trayControls?.updateAuthState) {
        window.trayControls.updateAuthState(authenticated);
      }
    } catch (error) {
      setIsAuthenticated(false);
      await storage.remove('token');
      if (window.trayControls?.updateAuthState) {
        window.trayControls.updateAuthState(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    if (window.trayControls?.updateAuthState) {
      window.trayControls.updateAuthState(true);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await storage.remove('token');
      setIsAuthenticated(false);
      if (window.trayControls?.updateAuthState) {
        window.trayControls.updateAuthState(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="scrollable in-h-screen bg-gray-100">
        <Routes>
          <Route
            path="/login"
            element={
              !isAuthenticated ? (
                <LoginForm onLogin={handleLogin} />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Dashboard onLogout={handleLogout} triggerLogout={triggerLogout} setTriggerLogout={setTriggerLogout} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/player/:bookId"
            element={
              isAuthenticated ? (
                <PlayerView />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
