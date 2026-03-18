import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const logoutTimerRef = useRef(null);
  const warningTimerRef = useRef(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        resetInactivityTimer();
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();

    // Activity listeners
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      resetInactivityTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  };

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;
    clearTimers();

    // 25 mins warning
    warningTimerRef.current = setTimeout(() => {
      toast('Your session will expire in 5 minutes due to inactivity.', {
        icon: '⏳',
        duration: 10000,
      });
    }, 25 * 60 * 1000);

    // 30 mins logout
    logoutTimerRef.current = setTimeout(() => {
      logout('Your session has expired due to inactivity.');
    }, 30 * 60 * 1000);
  }, [user]);

  useEffect(() => {
    if (user) {
      resetInactivityTimer();
    } else {
      clearTimers();
    }
  }, [user, resetInactivityTimer]);

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await api.post('/auth/login', { email, password, rememberMe });
      
      if (response.data.requires2FA) {
        return { 
          success: true, 
          requires2FA: true, 
          tempToken: response.data.tempToken 
        };
      }

      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      // Don't set user yet - they need to verify email first
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const validate2FA = async (code, tempToken) => {
    try {
      const response = await api.post('/auth/2fa/validate', { code, tempToken });
      setUser(response.data.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || '2FA validation failed' 
      };
    }
  };

  const logout = async (message) => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      clearTimers();
      if (message) toast(message, { icon: '👋' });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, validate2FA }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
