import { Layout } from './components/Layout/Layout';
import { Canvas } from './components/Canvas/Canvas';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { UsersManagement } from './pages/Admin/UsersManagement';
import { FlowsManagement } from './pages/Admin/FlowsManagement';
import { MyWorkflow } from './pages/Tenant/MyWorkflow';
import { ResetPassword } from './pages/ResetPassword';
import { ForgotPassword } from './pages/ForgotPassword';
import { PendingAssignment } from './pages/PendingAssignment';
import { OwnerDashboard } from './pages/Tenant/OwnerDashboard';
import { OwnerUsersManagement } from './pages/Tenant/OwnerUsersManagement';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, profile, loading, needsPasswordReset } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-500">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">Loading application...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // FORCE RESET logic
  if (needsPasswordReset && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  // PENDING ASSIGNMENT logic
  // If user is logged in, not an admin, and has no tenant_id, force them to pending page
  if (profile && profile.role !== 'admin' && !profile.tenant_id && location.pathname !== '/pending-assignment') {
    return <Navigate to="/pending-assignment" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect if role not allowed
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const HomeRedirect = () => {
  const { profile, loading } = useAuth();

  if (loading) return null;

  // Redirect based on role
  if (profile?.role === 'admin') {
    return <Navigate to="/admin/flows" replace />;
  }

  if (['tenant', 'Owner', 'Analyst', 'Reviewer', 'Viewer'].includes(profile?.role || '')) {
    // If tenant role but no ID (new social signups usually)
    if (!profile.tenant_id) {
      return <Navigate to="/pending-assignment" replace />;
    }

    // Redirect Owner to Dashboard, others to Workflow
    if (profile.role === 'Owner') {
      return <Navigate to="/dashboard" replace />;
    }

    return <Navigate to="/my-workflow" replace />;
  }

  // Default fallback (e.g. for 'owner' or 'member' if still in DB)
  return <Layout><Canvas /></Layout>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/pending-assignment" element={<PendingAssignment />} />
          <Route
            path="/reset-password"
            element={
              <ProtectedRoute>
                <ResetPassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomeRedirect />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <UsersManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/flows"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <FlowsManagement />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Tenant Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['Owner']}>
                <Layout>
                  <OwnerDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/users"
            element={
              <ProtectedRoute allowedRoles={['Owner']}>
                <Layout>
                  <OwnerUsersManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-workflow"
            element={
              <ProtectedRoute allowedRoles={['tenant', 'Owner', 'Analyst', 'Reviewer', 'Viewer']}>
                <Layout>
                  <MyWorkflow />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
