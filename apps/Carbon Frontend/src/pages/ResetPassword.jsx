import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import { authEnabled, useAuth } from '../lib/auth';
import { checkNewPassword, friendlyAuthError, MIN_PASSWORD, readAuthRedirectError } from '../lib/authForm';

// Where the "reset your password" email lands. Supabase signs the person in
// from the link (PASSWORD_RECOVERY); here they choose the new password.
export default function ResetPassword() {
  const { ready, hasSession, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(() => readAuthRedirectError(window.location.hash, window.location.search));
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const problem = checkNewPassword(password, confirm);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/create', { replace: true }), 1500);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (!authEnabled) {
    body = <div className="cx-card p-5 mt-8 text-sm" style={{ color: 'var(--cx-muted)' }}>Sign-in isn’t switched on for this site yet.</div>;
  } else if (!ready) {
    body = <div className="mt-8 flex items-center gap-2 text-sm" style={{ color: 'var(--cx-muted)' }}><Loader2 size={16} className="animate-spin" /> Checking your link…</div>;
  } else if (done) {
    body = (
      <div className="cx-card p-6 mt-8 flex items-start gap-3">
        <Check size={20} color="var(--cx-green)" className="mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">Password updated.</div>
          <div className="text-sm mt-1" style={{ color: 'var(--cx-muted)' }}>You’re signed in. Taking you to Create…</div>
        </div>
      </div>
    );
  } else if (!hasSession) {
    body = (
      <div className="cx-card p-6 mt-8 space-y-3">
        <div className="font-semibold">This reset link has expired or was already used.</div>
        <p className="text-sm" style={{ color: 'var(--cx-muted)' }}>{error && !/expired/.test(error) ? error : 'Reset links work once and only for a short while.'}</p>
        <Link to="/login?mode=forgot" className="cx-btn cx-btn-primary inline-flex">Send me a new link</Link>
      </div>
    );
  } else {
    body = (
      <form className="mt-8 space-y-3" onSubmit={submit} noValidate>
        <input className="cx-input" type="password" required placeholder={`New password (at least ${MIN_PASSWORD} characters)`} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="New password" autoComplete="new-password" />
        <input className="cx-input" type="password" required placeholder="Type it again" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Confirm new password" autoComplete="new-password" />
        <button className="cx-btn cx-btn-primary w-full" style={{ height: 50 }} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} Save new password
        </button>
        {error ? <div role="status" className="text-sm" style={{ color: 'var(--cx-red)' }}>{error}</div> : null}
      </form>
    );
  }

  return (
    <SiteShell title="Choose a new password">
      <section className="cx-wrap pt-16 md:pt-24 max-w-md">
        <div className="cx-label mb-3">Reset password</div>
        <h1 className="cx-h1 text-4xl md:text-5xl">Choose a new password.</h1>
        {body}
      </section>
    </SiteShell>
  );
}
