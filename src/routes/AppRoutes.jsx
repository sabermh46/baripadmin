import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks';
import { ContentLoader } from '../components/common/RouteLoader';

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



// Protected route wrapper
const ProtectedRoute = ({ children, roles = [], permissions = [] }) => {
  const { isAuthenticated, user, isLoading, hasPermission } = useAuth();
  
  if (isLoading) {
    return (
      <ContentLoader />
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
    return <ContentLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

/**
 * "/" is the marketing page for visitors and the dashboard for anyone signed in.
 *
 * It used to render PublicHome unconditionally, which meant a logged-in user who opened the
 * installed app, tapped the logo, or hit a bookmark landed on the sales page and had to
 * navigate to their own dashboard by hand. Offline that was worse: the landing page needs
 * the network, while the dashboard renders from the persisted cache.
 *
 * The auth check has to wait for isLoading, or a hard refresh would flash the landing page
 * before the session is restored and then jump.
 */
const HomeEntry = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <ContentLoader />;

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <PublicHome />;
};


// A `DynamicDashboard` used to sit here that switched on the user's role and returned
// WebOwnerDashboard / StaffDashboard / HouseOwnerDashboard / CaretakerDashboard /
// FlatRenterDashboard — none of which are imported (their imports are long commented out)
// and none of which exist as files. It was never referenced by any <Route>, so it only
// ever would have thrown "X is not defined" had anything rendered it. Removed.
// Role-specific dashboards are selected inside <Dashboard/> itself.

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
    <Suspense fallback={<ContentLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomeEntry />} />
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

        {/* /test and /test2 routes removed: they rendered <testComp/> and <testComp2/>,
            neither of which was imported or defined anywhere. Lowercase JSX names are
            treated as literal HTML tags, so they silently rendered empty unknown elements
            rather than erroring. */}
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
              <Link to="/" className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition">
                Go Home
              </Link>
            </div>
          </div>
        } />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;