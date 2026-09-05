import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../hooks';
import { ContentLoader } from '../components/common/RouteLoader';

// Always loaded — part of the shell
import Layout from '../components/Layout';

// Lazy-loaded pages — each gets its own chunk, loaded only when visited
const LoginPage            = lazy(() => import('../pages/Login'));
const SignupPage           = lazy(() => import('../pages/Signup'));
const Dashboard            = lazy(() => import('../pages/Dashboard'));
// Eager on purpose — it IS the fallback while the lazy chunk above downloads, so it
// cannot live inside that chunk.
import DashboardSkeleton from '../components/houseowner/DashboardSkeleton';
const ProfilePage          = lazy(() => import('../pages/Profile'));
const AuthSuccess          = lazy(() => import('../pages/AuthSuccess'));
const PublicHome           = lazy(() => import('../pages/PublicHome'));
const NotificationPage     = lazy(() => import('../pages/Notification'));
const ComingSoonPage       = lazy(() => import('../pages/utility/ComingSoonPage'));
const AccessDeniedPage     = lazy(() => import('../pages/utility/AccessDeniedPage'));
const GenerateToken        = lazy(() => import('../pages/Admin/userBased/GenerateToken'));
const ViewAllStaff         = lazy(() => import('../pages/Admin/staff/ViewAllStaff'));
const UserApprovals        = lazy(() => import('../pages/Admin/UserApprovals'));
const NotificationSettings = lazy(() => import('../pages/Admin/NotificationSettings'));
const StaffDetail          = lazy(() => import('../pages/Admin/staff/StaffDetail'));
const AuditLogs            = lazy(() => import('../pages/Admin/audit/AuditLogs'));
const SystemSettings       = lazy(() => import('../pages/Admin/SystemSettings'));
const HouseOwnersPage      = lazy(() => import('../pages/Admin/HouseOwnersPage'));
const ArchivedHouses       = lazy(() => import('../components/admin/house/ArchivedHouses'));
const HouseOwnerDetailPage = lazy(() => import('../pages/Admin/HouseOwnerDetail'));
const HousesPage           = lazy(() => import('../pages/House'));
const CreateHouseForm      = lazy(() => import('../components/admin/house/CreateHouseForm'));
const HouseDetails         = lazy(() => import('../components/admin/house/HouseDetails'));
const HouseEditForm        = lazy(() => import('../components/admin/house/HouseEditForm'));
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
const EmailTemplates       = lazy(() => import('../pages/Admin/EmailTemplates'));
const SmsAllowances        = lazy(() => import('../pages/Admin/SmsAllowances'));



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
// `developer` belongs here. Leaving it out denied the developer account every page that
// uses ALL_ROLES — while SideNav happily rendered all of those links for it, so the whole
// app was a set of dead links for the highest-ranked role in the system.
const ALL_ROLES = ['developer', 'web_owner', 'house_owner', 'staff', 'caretaker'];

// Lightweight role check for routes that are already inside the Layout route.
// Auth + isLoading are guaranteed by the parent ProtectedRoute — no need to
// re-check them on every navigation and risk an Outlet flash.
const RoleGuard = ({ children, roles = [], permissions = [] }) => {
  const { user, hasPermission } = useAuth();

  if (roles.length > 0 && user?.role?.slug && !roles.includes(user.role.slug)) {
    return <Navigate to="/access-denied" replace />;
  }

  // Lets a route mirror the permission its API already enforces, instead of approximating
  // it with a role list that drifts. hasPermission() short-circuits true for web_owner and
  // developer, so this only ever narrows things for staff.
  if (permissions.length > 0 && !permissions.every((p) => hasPermission(p))) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

/**
 * /houses/:id/flats -> /houses/:id
 *
 * The separate flats route meant seeing a house and seeing its flats were two navigations
 * for one question. `replace` keeps it out of history, so Back does not bounce.
 */
const FlatsRedirect = () => {
  const { houseId } = useParams();
  return <Navigate to={`/houses/${houseId}`} replace />;
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
          {/* Its own Suspense, with a skeleton instead of Layout's generic spinner.
              Dashboard is lazy, so on a cold load the chunk downloads BEFORE any component
              of ours renders — and until that finishes the only thing on screen is the
              fallback. Leaving it as ContentLoader meant a spinner was guaranteed to be the
              first thing you saw, whatever the page itself did afterwards. */}
          <Route
            path="dashboard"
            element={
              <Suspense fallback={<DashboardSkeleton />}>
                <Dashboard />
              </Suspense>
            }
          />
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
            {/* Flats are part of the house page now, not a page of their own. Kept as a
                redirect so existing links, bookmarks and the sidebar's toMatch entry still
                land somewhere sensible instead of 404ing. */}
            <Route path="/houses/:houseId/flats" element={<FlatsRedirect />} />
            {/* GET /renters requires renters.view of staff and caretakers. The route
                allowed every role through, so anyone without it reached the page and met a
                403 toast over an empty table instead of a boundary. */}
            <Route path="/renters" element={
              <RoleGuard roles={ALL_ROLES} permissions={['renters.view']}>
                <RenterList />
              </RoleGuard>
            } />
            <Route path="/flats/:id" element={
              <RoleGuard roles={ALL_ROLES}>
                <FlatDetails />
              </RoleGuard>
            } />
            <Route path="/houses/create" element={
              <RoleGuard roles={['developer', 'web_owner', 'staff']}>
                <CreateHouseForm />
              </RoleGuard>
            } />

            {/* 'caretaker' was missing from both of these, so a caretaker clicking their
                own area landed on Access Denied — while the API had been scoped to serve
                them their own record. The page decides what to render for them. */}
            <Route path="/caretakers" element={
              <RoleGuard roles={['developer', 'web_owner', 'staff', 'house_owner', 'caretaker']}>
                <CareTakerPage />
              </RoleGuard>
            } />
            <Route path="/notices" element={
              <RoleGuard roles={ALL_ROLES}>
                <ComingSoonPage />
              </RoleGuard>
            } />

            <Route path="/caretakers/:id/details" element={
              <RoleGuard roles={['developer', 'web_owner', 'staff', 'house_owner', 'caretaker']}>
                <CaretakerDetails />
              </RoleGuard>
            } />

            {/* ===== STAFF-SPECIFIC ROUTES ===== */}
            <Route path="staff/audit-logs" element={
              <RoleGuard roles={['developer', 'web_owner']}>
                <AuditLogs />
              </RoleGuard>
            } />
            {/* Was a ComingSoonPage. The owner-facing half of this did not exist either,
                so a house owner's only route to a caretaker was a button that 403'd. */}
            <Route path="staff/user-approvals" element={
              <RoleGuard roles={['developer', 'staff', 'web_owner']}>
                <UserApprovals />
              </RoleGuard>
            } />

            {/* ===== ADMIN-SPECIFIC ROUTES ===== */}
            {/* web_owner + developer only: this decides whether whole roles can be
                contacted, and holds SMS gateway credentials. */}
            <Route path="admin/notification-settings" element={
              <RoleGuard roles={['developer', 'web_owner']}>
                <NotificationSettings />
              </RoleGuard>
            } />
            <Route path="admin/settings" element={
              <RoleGuard roles={['developer', 'web_owner']}>
                <SystemSettings />
              </RoleGuard>
            } />
            <Route path="admin/generate-token" element={
              <RoleGuard roles={['developer', 'web_owner', 'staff']}>
                <GenerateToken />
              </RoleGuard>
            } />

            <Route path="admin/staff" element={
              <RoleGuard roles={['developer', 'web_owner']}>
                <ViewAllStaff />
              </RoleGuard>
            } />
            {/* Same guard as the list: everything behind /admin/permissions is
                role:web_owner on the server, so this cannot be opened to staff here
                without the API being opened first. */}
            <Route path="admin/staff/:staffId" element={
              <RoleGuard roles={['developer', 'web_owner']}>
                <StaffDetail />
              </RoleGuard>
            } />
            {/* Staff belong here, but on users.view — the endpoint returns a directory of
                people with their contact details, which houses.view has no business
                granting. The permission prop mirrors what that endpoint enforces. */}
            {/* Archived houses are web_owner-only, exactly as the endpoint behind them is. */}
            <Route path="houses/archived" element={
              <RoleGuard roles={['developer', 'web_owner']}>
                <ArchivedHouses />
              </RoleGuard>
            } />
            <Route path="admin/house-owners" element={
              <RoleGuard roles={['developer', 'web_owner', 'staff']} permissions={['users.view']}>
                <HouseOwnersPage />
              </RoleGuard>
            } />
            <Route path="admin/house-owners/:ownerId" element={
              <RoleGuard roles={['developer', 'web_owner', 'staff']} permissions={['users.view']}>
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
            <Route path="admin/email-templates" element={
              <RoleGuard roles={['web_owner', 'developer']}>
                <EmailTemplates />
              </RoleGuard>
            } />
            <Route path="admin/sms-allowance" element={
              <RoleGuard roles={['web_owner', 'developer', 'staff']}>
                <SmsAllowances />
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