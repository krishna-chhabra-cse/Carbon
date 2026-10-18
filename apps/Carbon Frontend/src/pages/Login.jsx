import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import { authEnabled, devLoginAvailable, useAuth } from '../lib/auth';
import { checkAuthForm, friendlyAuthError, MIN_PASSWORD, readAuthRedirectError, safeNext } from '../lib/authForm';

const GithubIcon = () => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

// Which sign-in options are switched on in Supabase (public settings
// endpoint), so we never send anyone to a "provider is not enabled" page.
function useProviders() {
  const [p, setP] = useState({ google: true, github: false, signupOpen: true, loaded: false });
  useEffect(() => {
    const url = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((s) => setP({ google: Boolean(s.external?.google), github: Boolean(s.external?.github), signupOpen: !s.disable_signup, loaded: true }))
      .catch(() => setP((x) => ({ ...x, loaded: true })));
  }, []);
  return p;
}

function PasswordInput({ value, onChange, placeholder, autoComplete, label }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input className="cx-input" style={{ paddingRight: 48 }} type={show ? 'text' : 'password'} required placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} autoComplete={autoComplete} />
      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5" style={{ color: 'var(--cx-dim)' }} onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

const TITLES = {
  signin: ['Sign in to make videos.', 'New here? Create a free account below: 2 videos every day, no credit card.'],
  signup: ['Make your first launch video.', 'Create a free account: 2 videos every day, no credit card.'],
  forgot: ['Reset your password.', 'Enter your account’s email and we’ll send you a link to choose a new password.'],
};

export default function Login() {
  const [params, setParams] = useSearchParams();
  const next = safeNext(params.get('next'));
  const { signedIn, signInWith, signInWithPassword, signUp, resendConfirmation, sendPasswordReset, signInAsDev } = useAuth();
  const providers = useProviders();
  const mode = ['signup', 'forgot'].includes(params.get('mode')) ? params.get('mode') : 'signin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(() => {
    const err = readAuthRedirectError(window.location.hash, window.location.search);
    return err ? { ok: false, text: err } : null;
  });
  // Shown after sign-up when Supabase wants the email confirmed first.
  const [sentTo, setSentTo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (signedIn) navigate(next, { replace: true });
  }, [signedIn, next, navigate]);

  const setMode = (m) => {
    const p = new URLSearchParams(params);
    if (m === 'signin') p.delete('mode');
    else p.set('mode', m);
    setParams(p, { replace: true });
    setMsg(null);
    setSentTo(null);
    setPassword('');
    setConfirm('');
  };

  const run = async (key, fn) => {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ ok: false, text: friendlyAuthError(e), unconfirmed: e?.code === 'email_not_confirmed' || /not confirmed/i.test(e?.message || '') });
    } finally {
      setBusy(null);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const problem = checkAuthForm(mode, { email, password, confirm });
    if (problem) return setMsg({ ok: false, text: problem });
    if (mode === 'signin') return run('email', () => signInWithPassword(email, password));
    if (mode === 'forgot') {
      return run('email', async () => {
        await sendPasswordReset(email);
        setMsg({ ok: true, text: `If there’s an account for ${email.trim()}, a reset link is on its way. Check your inbox (and spam).` });
      });
    }
    return run('email', async () => {
      const outcome = await signUp(email, password, next);
      if (outcome === 'exists') {
        setMsg({ ok: false, text: 'There’s already an account with this email. Sign in instead, or reset your password.' });
      } else if (outcome === 'confirm-email') {
        setSentTo(email.trim());
      }
      // 'signed-in': the effect above moves on.
    });
  };

  const resend = () =>
    run('resend', async () => {
      await resendConfirmation(sentTo || email, next);
      setMsg({ ok: true, text: 'Sent again. It can take a minute to arrive.' });
    });

  const [title, sub] = TITLES[mode];
  const oauth = authEnabled && mode !== 'forgot' && (providers.google || providers.github);

  return (
    <SiteShell title={mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Reset password' : 'Sign in'}>
      <section className="cx-wrap pt-16 md:pt-24 max-w-md">
        <div className="cx-label mb-3">{mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Forgot password' : 'Sign in'}</div>
        <h1 className="cx-h1 text-4xl md:text-5xl">{title}</h1>
        <p className="mt-3" style={{ color: 'var(--cx-muted)' }}>{sub}</p>

        {!authEnabled ? (
          <div className="cx-card p-5 mt-8 text-sm" style={{ color: 'var(--cx-muted)' }}>
            Sign-in isn’t switched on for this site yet. Please check back soon.
          </div>
        ) : sentTo ? (
          <div className="cx-card p-6 mt-8 space-y-3">
            <div className="flex items-start gap-3">
              <Mail size={20} color="var(--cx-ember)" className="mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Confirm your email</div>
                <p className="text-sm mt-1" style={{ color: 'var(--cx-muted)' }}>
                  We sent a link to <b style={{ color: 'var(--cx-text)' }}>{sentTo}</b>. Open it to finish creating your account; you’ll come straight back here, signed in.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <button type="button" className="underline" style={{ color: 'var(--cx-muted)' }} onClick={resend} disabled={!!busy}>
                {busy === 'resend' ? 'Sending…' : 'Didn’t get it? Send again'}
              </button>
              <button type="button" className="underline" style={{ color: 'var(--cx-muted)' }} onClick={() => setMode('signin')}>I’ve confirmed, sign in</button>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {oauth ? (
              <>
                {providers.google ? (
                  <button className="cx-btn cx-btn-ghost w-full" style={{ height: 50 }} disabled={!!busy} onClick={() => run('google', () => signInWith('google', next))}>
                    {busy === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />} Continue with Google
                  </button>
                ) : null}
                {providers.github ? (
                  <button className="cx-btn cx-btn-ghost w-full" style={{ height: 50 }} disabled={!!busy} onClick={() => run('github', () => signInWith('github', next))}>
                    {busy === 'github' ? <Loader2 size={16} className="animate-spin" /> : <GithubIcon />} Continue with GitHub
                  </button>
                ) : null}
                <div className="flex items-center gap-3 py-2 text-xs cx-mono" style={{ color: 'var(--cx-dim)' }}>
                  <div className="flex-1 h-px" style={{ background: 'var(--cx-line)' }} /> OR WITH EMAIL <div className="flex-1 h-px" style={{ background: 'var(--cx-line)' }} />
                </div>
              </>
            ) : null}
            <form className="space-y-3" onSubmit={submit} noValidate>
              <input className="cx-input" type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
              {mode !== 'forgot' ? (
                <PasswordInput value={password} onChange={setPassword} label="Password" placeholder={mode === 'signup' ? `Password (at least ${MIN_PASSWORD} characters)` : 'Password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              ) : null}
              {mode === 'signup' ? <PasswordInput value={confirm} onChange={setConfirm} label="Confirm password" placeholder="Type the password again" autoComplete="new-password" /> : null}
              {mode === 'signin' ? (
                <div className="text-right -mt-1">
                  <button type="button" className="text-xs underline" style={{ color: 'var(--cx-dim)' }} onClick={() => setMode('forgot')}>Forgot password?</button>
                </div>
              ) : null}
              <button className="cx-btn cx-btn-primary w-full" style={{ height: 50 }} disabled={!!busy}>
                {busy === 'email' ? <Loader2 size={16} className="animate-spin" /> : null}
                {mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Email me a reset link' : 'Sign in'}
              </button>
            </form>
            <div className="text-sm pt-2" style={{ color: 'var(--cx-muted)' }}>
              {mode === 'signin' ? (
                providers.signupOpen ? <>New here? <button type="button" className="underline font-semibold" style={{ color: 'var(--cx-text)' }} onClick={() => setMode('signup')}>Create a free account</button></> : null
              ) : (
                <>Have an account? <button type="button" className="underline font-semibold" style={{ color: 'var(--cx-text)' }} onClick={() => setMode('signin')}>Sign in</button></>
              )}
            </div>
          </div>
        )}

        {msg ? (
          <div role="status" className="mt-4 text-sm flex items-start gap-2" style={{ color: msg.ok ? 'var(--cx-green)' : 'var(--cx-red)' }}>
            {msg.ok ? <Check size={16} className="mt-0.5 shrink-0" /> : null}
            <span>
              {msg.text}
              {msg.unconfirmed && email ? <> <button type="button" className="underline" onClick={() => { setSentTo(email.trim()); setMsg(null); }}>Resend the link</button></> : null}
            </span>
          </div>
        ) : null}

        {devLoginAvailable ? (
          <div className="mt-10 pt-6 border-t space-y-2" style={{ borderColor: 'var(--cx-line)' }}>
            <button className="cx-btn cx-btn-ghost w-full" style={{ height: 44 }} onClick={() => signInAsDev()}>
              Continue as local dev user
            </button>
            <p className="text-xs" style={{ color: 'var(--cx-dim)' }}>
              Local development only (needs AUTH_DEV_BYPASS=true in the backend’s .env). Never shown on the live site.
            </p>
          </div>
        ) : null}
        <p className="text-xs mt-8" style={{ color: 'var(--cx-dim)' }}>
          Just want a quick score? <Link to="/roast" className="underline">Roast your codebase</Link> without an account.
        </p>
      </section>
    </SiteShell>
  );
}
