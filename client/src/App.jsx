import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import TwoFactorPrompt from './pages/auth/TwoFactorPrompt';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile.jsx';
import Overview from './pages/Overview';
import Resources from './pages/Resources';
import Bookings from './pages/Bookings';
import BookingDetails from './pages/BookingDetails';
import AdminResources from './pages/admin/AdminResources';
import AuditLogs from './pages/admin/AuditLogs';
import NotFound from './pages/NotFound';
import ServerError from './pages/ServerError';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <SocketProvider>
      <Router>
        <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1B2559',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600',
            border: '1px solid #E9EDF7',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }
        }}
      />
      <Routes>
        <Route path="/500" element={<ServerError />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route 
          path="/forgot-password" 
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } 
        />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login/2fa" element={<TwoFactorPrompt />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        >
          <Route index element={<Overview />} />
          <Route path="resources" element={<Resources />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/:id" element={<BookingDetails />} />
          <Route 
            path="manage-resources" 
            element={
              <AdminRoute>
                <AdminResources />
              </AdminRoute>
            } 
          />
          <Route 
            path="audit-logs" 
            element={
              <AdminRoute>
                <AuditLogs />
              </AdminRoute>
            } 
          />
          <Route 
            path="analytics" 
            element={
              <AdminRoute>
                <Analytics />
              </AdminRoute>
            } 
          />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/" 
          element={<AuthRedirect />} 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
    </SocketProvider>
  );
}

// Bug 6: Root Redirect logic
const AuthRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
};

export default App;
