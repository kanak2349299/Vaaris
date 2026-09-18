import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('vaaris_token');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        console.warn('Session expired or invalid, auto-clearing token');
        localStorage.removeItem('vaaris_token');
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('vaaris_token', res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const loginDemo = async () => {
    const res = await api.post('/auth/demo-seed');
    localStorage.setItem('vaaris_token', res.data.access_token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('vaaris_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginDemo, logout, isSynced }}>
      {children}
    </AuthContext.Provider>
  );
};
