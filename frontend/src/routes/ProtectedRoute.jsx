import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Loader } from '../components/common/UI';

export default function ProtectedRoute({ children, requireSuperAdmin = false, allowedRoles, loginPath = '/admin/login' }) {
  const { admin, loading, isSuperAdmin } = useAdminAuth();

  if (loading) return <Loader label="Checking session…" />;
  if (!admin) return <Navigate to={loginPath} replace />;
  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    return <Navigate to="/admin" replace />;
  }
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="card p-6 text-sm text-slate-600">
        This action requires super admin privileges.
      </div>
    );
  }
  return children;
}
