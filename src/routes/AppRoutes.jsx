import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import Layout from '../components/Layout';
import LoginPage from '../pages/Login';
import SignupPage from '../pages/Signup';
import Dashboard from '../pages/Dashboard';
import ProfilePage from '../pages/Profile';
import AuthSuccess from '../pages/AuthSuccess';
import PublicHome from '../pages/PublicHome'
import NotificationPage from '../pages/Notification';
// import HousesPage from '../pages/HousesPage';
// import NoticesPage from '../pages/NoticesPage';
// import SettingsPage from '../pages/SettingsPage';


// Protected route wrapper
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (roles.length > 0 && user?.role?.slug && !roles.includes(user.role.slug)) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

// Public route wrapper
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<PublicHome />} /> {/* This Should be public, and should not redirect */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        } />
        <Route path="/auth/success" element={<AuthSuccess />} />
        
        {/* Protected Routes 78with Layout */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="notification" element={<NotificationPage />} />
          {/* House Owner & Web Owner Routes */}
          {/* <Route path="houses" element={
            <ProtectedRoute roles={['web_owner', 'house_owner']}>
              <HousesPage />
            </ProtectedRoute>
          } /> */}
          
          {/* Staff & Above Routes */}
          {/* <Route path="notices" element={
            <ProtectedRoute roles={['web_owner', 'staff', 'house_owner']}>
              <NoticesPage />
            </ProtectedRoute>
          } /> */}
          
          {/* Web Owner Only Routes */}
          {/* <Route path="settings" element={
            <ProtectedRoute roles={['web_owner']}>
              <SettingsPage />
            </ProtectedRoute>
          } /> */}
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<div>404 - Page Not Found</div>} />
      </Routes>
    
  );
};

export default AppRoutes;