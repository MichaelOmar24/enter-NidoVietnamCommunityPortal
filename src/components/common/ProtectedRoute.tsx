import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  embassyOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false, embassyOnly = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isEmbassyStaff } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-hero">
        <div className="flex flex-col items-center gap-4">
          <img
            src="https://cdn.enter.pro/resources/uid_100149613/84eb6f6a-107f-47.png"
            alt="NIDO Vietnam"
            className="h-16 animate-pulse"
          />
          <p className="text-primary-foreground/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (embassyOnly && !isEmbassyStaff && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
