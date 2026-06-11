import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import { LoaderMinimal } from '../components/common/RouteLoader';

// Always loaded — part of the shell
import Layout from '../components/Layout';

// Lazy-loaded pages — each gets its own chunk, loaded only when visited
const LoginPage            = lazy(() => import('../pages/Login'));
const SignupPage           = lazy(() => import('../pages/Signup'));
const Dashboard            = lazy(() => import('../pages/Dashboard'));
const ProfilePage          = lazy(() => import('../pages/Profile'));
const AuthSuccess          = lazy(() => import('../pages/AuthSuccess'));
const PublicHome           = lazy(() => import('../pages/PublicHome'));
const NotificationPage     = lazy(() => import('../pages/Notification'));
const ComingSoonPage       = lazy(() => import('../pages/utility/ComingSoonPage'));
const AccessDeniedPage     = lazy(() => import('../pages/utility/AccessDeniedPage'));
const GenerateToken        = lazy(() => import('../pages/Admin/userBased/GenerateToken'));
const ViewAllStaff         = lazy(() => import('../pages/Admin/staff/ViewAllStaff'));
const AuditLogs            = lazy(() => import('../pages/Admin/audit/AuditLogs'));
const SystemSettings       = lazy(() => import('../pages/Admin/SystemSettings'));
const HouseOwnersPage      = lazy(() => import('../pages/Admin/HouseOwnersPage'));
const HouseOwnerDetailPage = lazy(() => import('../pages/Admin/HouseOwnerDetail'));
const HousesPage           = lazy(() => import('../pages/House'));
const CreateHouseForm      = lazy(() => import('../components/admin/house/CreateHouseForm'));
const HouseDetails         = lazy(() => import('../components/admin/house/HouseDetails'));
const HouseEditForm        = lazy(() => import('../components/admin/house/HouseEditForm'));
const FlatList             = lazy(() => import('../components/flats/FlatList'));
const FlatDetails          = lazy(() => import('../components/flats/FlatDetails'));
const RenterList           = lazy(() => import('../components/renters/RenterList'));
const CareTakerPage        = lazy(() => import('../pages/Caretaker'));
const CaretakerDetails     = lazy(() => import('../components/caretaker/CaretakerDetails'));
const ReportGenPage        = lazy(() => import('../pages/report/ReportGenPage').then(m => ({ default: m.ReportGenPage })));
const ForgotPassword       = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword        = lazy(() => import('../pages/auth/ResetPassword'));
const ChangePassword       = lazy(() => import('../pages/auth/ChangePassword'));
const HouseOwnerExpensesPage = lazy(() => import('../pages/Expenses'));
const AppFeePage           = lazy(() => import('../pages/AppFee/AppFeePage'));
const LoansPage            = lazy(() => import('../pages/Loans'));
const LandingPageEditor    = lazy(() => import('../pages/Admin/LandingPageEditor'));



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
  
  if (isLoading) {
    return (
      <LoaderMinimal />
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
    return <LoaderMinimal />;
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

// Defined outside the component so the reference is stable across renders.
const ALL_ROLES = ['web_owner', 'house_owner', 'staff', 'caretaker'];

// Lightweight role check for routes that are already inside the Layout route.
// Auth + isLoading are guaranteed by the parent ProtectedRoute — no need to
// re-check them on every navigation and risk an Outlet flash.
const RoleGuard = ({ children, roles = [] }) => {
  const { user } = useAuth();
  if (roles.length > 0 && user?.role?.slug && !roles.includes(user.role.slug)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoaderMinimal />}>
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
        <Route path='/test' element={
          <PublicRoute>
            <testComp/>
          </PublicRoute>
        } />

        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } />
        <Route path="/reset-password" element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        } />
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        } />

        <Route path='/test2' element={
          <PublicRoute>
            <testComp2/>
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
          <Route path="access-denied" element={<AccessDeniedPage />} />
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

            <Route path="/houses" element={
              <RoleGuard roles={ALL_ROLES}>
                <HousesPage />
              </RoleGuard>
            } />
            <Route path="/houses/:id" element={
              <RoleGuard roles={ALL_ROLES}>
                <HouseDetails />
              </RoleGuard>
            } />
            <Route path="/houses/:id/edit" element={
              <RoleGuard roles={ALL_ROLES}>
                <HouseEditForm />
              </RoleGuard>
            } />
            <Route path="/houses/:houseId/flats" element={
              <RoleGuard roles={ALL_ROLES}>
                <FlatList />
              </RoleGuard>
            } />
            <Route path="/renters" element={
              <RoleGuard roles={ALL_ROLES}>
                <RenterList />
              </RoleGuard>
            } />
            <Route path="/flats/:id" element={
              <RoleGuard roles={ALL_ROLES}>
                <FlatDetails />
              </RoleGuard>
            } />
            <Route path="/houses/create" element={
              <RoleGuard roles={['web_owner', 'staff']}>
                <CreateHouseForm />
              </RoleGuard>
            } />

            <Route path="/caretakers" element={
              <RoleGuard roles={['web_owner', 'staff', 'house_owner']}>
                <CareTakerPage />
              </RoleGuard>
            } />
            <Route path="/notices" element={
              <RoleGuard roles={ALL_ROLES}>
                <ComingSoonPage />
              </RoleGuard>
            } />

            <Route path="/caretakers/:id/details" element={
              <RoleGuard roles={['web_owner', 'staff', 'house_owner']}>
                <CaretakerDetails />
              </RoleGuard>
            } />

            {/* ===== STAFF-SPECIFIC ROUTES ===== */}
            <Route path="staff/audit-logs" element={
              <RoleGuard roles={['web_owner']}>
                <AuditLogs />
              </RoleGuard>
            } />
            <Route path="staff/user-approvals" element={
              <RoleGuard roles={['staff', 'web_owner']}>
                <ComingSoonPage />
              </RoleGuard>
            } />

            {/* ===== ADMIN-SPECIFIC ROUTES ===== */}
            <Route path="admin/settings" element={
              <RoleGuard roles={['web_owner']}>
                <SystemSettings />
              </RoleGuard>
            } />
            <Route path="admin/generate-token" element={
              <RoleGuard roles={['web_owner', 'staff']}>
                <GenerateToken />
              </RoleGuard>
            } />

            <Route path="admin/staff" element={
              <RoleGuard roles={['web_owner']}>
                <ViewAllStaff />
              </RoleGuard>
            } />
            <Route path="admin/house-owners" element={
              <RoleGuard roles={['web_owner']}>
                <HouseOwnersPage />
              </RoleGuard>
            } />
            <Route path="admin/house-owners/:ownerId" element={
              <RoleGuard roles={['web_owner']}>
                <HouseOwnerDetailPage />
              </RoleGuard>
            } />
            <Route path="/reports" element={
              <RoleGuard roles={ALL_ROLES}>
                <ReportGenPage />
              </RoleGuard>
            } />
            <Route path="/expenses" element={
              <RoleGuard roles={ALL_ROLES}>
                <HouseOwnerExpensesPage />
              </RoleGuard>
            } />
            <Route path="/app-fee" element={
              <RoleGuard roles={ALL_ROLES}>
                <AppFeePage />
              </RoleGuard>
            } />
            <Route path="/loans" element={
              <RoleGuard roles={ALL_ROLES}>
                <LoansPage />
              </RoleGuard>
            } />
            <Route path="admin/landing-editor" element={
              <RoleGuard roles={['web_owner', 'developer']}>
                <LandingPageEditor />
              </RoleGuard>
            } />
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
    </Suspense>
  );
};

export default AppRoutes;