import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('opshub_token');
    const savedUser = localStorage.getItem('opshub_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      api.get('/auth/me').then(res => {
        setUser(res.data);
        localStorage.setItem('opshub_user', JSON.stringify(res.data));
      }).catch(() => {
        localStorage.removeItem('opshub_token');
        localStorage.removeItem('opshub_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('opshub_token', token);
    localStorage.setItem('opshub_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('opshub_token');
    localStorage.removeItem('opshub_user');
    setUser(null);
  };

  const updateUser = (updates) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('opshub_user', JSON.stringify(updated));
  };

  // Permission helpers
  const can = (permission) => {
    if (!user) return false;
    const map = {
      editJobs:    ['owner','admin'],
      editTasks:   ['owner','admin','crew'],
      seePOs:      ['owner','admin','driver'],
      seePaint:    ['owner','admin','painter','driver'],
      manageUsers: ['owner','admin'],
      editUsers:   ['owner'],
    };
    return (map[permission] || []).includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, can, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
