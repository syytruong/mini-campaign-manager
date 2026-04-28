import { Navigate, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '../store/authStore';

interface Props {
  children: React.ReactNode;
}

export function RequireAuth({ children }: Props) {
  const isAuthed = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthed) {
    // Preserve where the user was trying to go so we can return after login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
