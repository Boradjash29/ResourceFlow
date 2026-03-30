/* eslint-disable react-refresh/only-export-components */
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

  const clearTimers = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, []);

  const logout = useCallback(async (message) => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      clearTimers();
      if (message) toast.success(message);
    }
  }, [clearTimers]);

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;
    clearTimers();

    warningTimerRef.current = setTimeout(() => {
      toast('Your session will expire in 5 minutes due to inactivity.', {
        icon: '⏳',
        duration: 10000,
      });
    }, 25 * 60 * 1000);

    logoutTimerRef.current = setTimeout(() => {
      logout('Your session has expired due to inactivity.');
    }, 30 * 60 * 1000);
  }, [user, clearTimers, logout]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/auth/me');
        if (data && data.user) {
          setUser(data.user);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current > 60000) {
        lastActivityRef.current = now;
        resetInactivityTimer();
      }
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
  }, [user, resetInactivityTimer, clearTimers]);

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



  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, validate2FA }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
