import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import '../../site.css';

// Making videos needs an account: signed-out visitors are sent to /login and
// come back to the page they wanted (including ?url=…) after signing in.
export default function RequireAuth({ children }) {
  const { ready, signedIn } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="cx flex items-center justify-center gap-3" style={{ color: 'var(--cx-muted)' }}>
        <Loader2 size={18} className="animate-spin" /> Checking your account…
      </div>
    );
  }
  if (!signedIn) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}
