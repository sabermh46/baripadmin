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


// ============ PROTECTED ROUTES IMPORTS ============
// House Management
// import HousesPage from '../pages/houses/HousesPage';
// import HouseDetailPage from '../pages/houses/HouseDetailPage';
// import CreateHousePage from '../pages/houses/CreateHousePage';

// // Flat Management (for house owners)
// import FlatsPage from '../pages/flats/FlatsPage';
// import FlatDetailPage from '../pages/flats/FlatDetailPage';

// // Renter Management
// import RentersPage from '../pages/renters/RentersPage';
// import RenterDetailPage from '../pages/renters/RenterDetailPage';
// import CreateRenterPage from '../pages/renters/CreateRenterPage';

// // User Management & Administration
// import UsersPage from '../pages/admin/UsersPage';
// import CreateUserPage from '../pages/admin/CreateUserPage';
// import UserDetailPage from '../pages/admin/UserDetailPage';
// import TokensPage from '../pages/admin/TokensPage';
// import GenerateTokenPage from '../pages/admin/GenerateTokenPage';

// // System Settings
// import SystemSettingsPage from '../pages/admin/SystemSettingsPage';
// import RoleLimitsPage from '../pages/admin/RoleLimitsPage';

// // Notices & Communications
// import NoticesPage from '../pages/notices/NoticesPage';
// import CreateNoticePage from '../pages/notices/CreateNoticePage';
// import NoticeDetailPage from '../pages/notices/NoticeDetailPage';

// // Maintenance & Issues
// import MaintenancePage from '../pages/maintenance/MaintenancePage';
// import CreateMaintenancePage from '../pages/maintenance/CreateMaintenancePage';
// import MaintenanceDetailPage from '../pages/maintenance/MaintenanceDetailPage';

// // Payments & Billing
// import PaymentsPage from '../pages/payments/PaymentsPage';
// import PaymentDetailPage from '../pages/payments/PaymentDetailPage';
// import CreatePaymentPage from '../pages/payments/CreatePaymentPage';
// import InvoicesPage from '../pages/payments/InvoicesPage';

// // Reports & Analytics
// import ReportsPage from '../pages/reports/ReportsPage';
// import HouseReportsPage from '../pages/reports/HouseReportsPage';
// import FinancialReportsPage from '../pages/reports/FinancialReportsPage';

// // Profile & Account
// import MyAccountPage from '../pages/profile/MyAccountPage';
// import SecurityPage from '../pages/profile/SecurityPage';
// import ActivityLogPage from '../pages/profile/ActivityLogPage';

// // Special Pages
// import LoginAsPage from '../pages/special/LoginAsPage';
// import SwitchAccountPage from '../pages/special/SwitchAccountPage';
// import ImpersonationLogsPage from '../pages/special/ImpersonationLogsPage';

// // Dashboard Variations
// import HouseOwnerDashboard from '../pages/dashboard/HouseOwnerDashboard';
// import CaretakerDashboard from '../pages/dashboard/CaretakerDashboard';
// import StaffDashboard from '../pages/dashboard/StaffDashboard';
// import WebOwnerDashboard from '../pages/dashboard/WebOwnerDashboard';
// import FlatRenterDashboard from '../pages/dashboard/FlatRenterDashboard';

// // Utility Pages
// import AccessDeniedPage from '../pages/utility/AccessDeniedPage';
// import ComingSoonPage from '../pages/utility/ComingSoonPage';
// import UnderMaintenancePage from '../pages/utility/UnderMaintenancePage';


// Protected route wrapper
const ProtectedRoute = ({ children, roles = [], permissions = [] }) => {
  const { isAuthenticated, user, isLoading, hasPermission } = useAuth();
  console.log(user);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Check role-based access
  if (roles.length > 0 && user?.role?.slug && !roles.includes(user.role.slug)) {
    return <Navigate to="/access-denied" replace />;
  }
  
  // Check permission-based access
  if (permissions.length > 0) {
    const hasAllPermissions = permissions.every(permission => 
      hasPermission(permission)
    );
    if (!hasAllPermissions) {
      return <Navigate to="/access-denied" replace />;
    }
  }
  
  return <>{children}</>;
};

// Public route wrapper
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};


const DynamicDashboard = () => {
  const { user } = useAuth();
  
  switch (user?.role?.slug) {
    case 'web_owner':
      return <WebOwnerDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'house_owner':
      return <HouseOwnerDashboard />;
    case 'caretaker':
      return <CaretakerDashboard />;
    case 'flat_renter':
      return <FlatRenterDashboard />;
    default:
      return <Dashboard />;
  }
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
        
        {/* ============ 404 ROUTE ============ */}
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-8">Page Not Found</p>
              <a href="/" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                Go Home
              </a>
            </div>
          </div>
        } />
      </Routes>
    
  );
};

export default AppRoutes;