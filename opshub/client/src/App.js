import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import AdminShell from './pages/AdminShell';
import FieldShell from './pages/FieldShell';
import './App.css';

function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="screen-load">
        <div className="brand-icon"><i className="fa-solid fa-layer-group"></i></div>
        <div className="load-title">OpsHub</div>
        <div className="spin"></div>
      </div>
    );
  }

  if (!user) return <Login />;

  const adminRoles = ['owner', 'admin'];
  if (adminRoles.includes(user.role)) return <AdminShell />;
  return <FieldShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
