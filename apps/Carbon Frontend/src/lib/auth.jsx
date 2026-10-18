// Sign-in with Supabase Auth: email + password (with email confirmation and
// password reset), Google and GitHub. Set VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY. Making a video always requires signing in; roast
// and samples don't.
//
// Local dev: /login also shows "Continue as local dev user", which only works
// against a backend on this machine running with AUTH_DEV_BYPASS=true.
import { createClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { safeNext, signUpOutcome } from './authForm';

const URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const supabase = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export const authEnabled = Boolean(supabase);
export const devLoginAvailable = Boolean(import.meta.env.DEV);

const DEV_KEY = 'carbon_dev_login';
const readDevLogin = () => {
  try {
    return devLoginAvailable && localStorage.getItem(DEV_KEY) === '1';
  } catch {
    return false;
  }
};
const writeDevLogin = (on) => {
  try {
    if (on) localStorage.setItem(DEV_KEY, '1');
    else localStorage.removeItem(DEV_KEY);
  } catch {
    /* storage blocked: dev login just won't persist */
  }
};

export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

// Extra headers for API calls (the dev sign-in marker, when used).
export const authHeaders = () => (readDevLogin() ? { 'X-Carbon-Dev-Login': '1' } : {});

const AuthContext = createContext(null);
const notConfigured = () => new Error('Sign-in isn’t set up on this site yet.');
// Where Supabase sends people back to (must be in Supabase's Redirect URLs).
const backTo = (path) => `${window.location.origin}${path}`;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [devUser, setDevUser] = useState(readDevLogin);
  const [ready, setReady] = useState(!supabase);
  // True after the user opened a password-reset link (Supabase signs them in
  // for that one purpose and fires PASSWORD_RECOVERY).
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signInWith = useCallback(async (provider, next) => {
    if (!supabase) throw notConfigured();
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: backTo(safeNext(next)) } });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabase) throw notConfigured();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }, []);

  // → 'signed-in' | 'confirm-email' | 'exists'
  const signUp = useCallback(async (email, password, next) => {
    if (!supabase) throw notConfigured();
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: backTo(safeNext(next)) } });
    if (error) throw error;
    return signUpOutcome(data);
  }, []);

  const resendConfirmation = useCallback(async (email, next) => {
    if (!supabase) throw notConfigured();
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: backTo(safeNext(next)) } });
    if (error) throw error;
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    if (!supabase) throw notConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: backTo('/reset-password') });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password) => {
    if (!supabase) throw notConfigured();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecovering(false);
  }, []);

  const signInAsDev = useCallback(() => {
    if (!devLoginAvailable) throw new Error('Dev sign-in is only available locally.');
    writeDevLogin(true);
    setDevUser(true);
  }, []);

  const signOut = useCallback(async () => {
    writeDevLogin(false);
    setDevUser(false);
    if (!supabase) return;
    const token = await getAccessToken();
    // Tell the backend to drop its cached copy of this session (best effort).
    if (token) {
      const { API_URL } = await import('./api');
      fetch(`${API_URL}/api/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    const { error } = await supabase.auth.signOut();
    // A session that is already gone on Supabase's side still has to leave this browser.
    if (error) await supabase.auth.signOut({ scope: 'local' });
    setSession(null);
  }, []);

  const value = useMemo(() => {
    const u = session?.user;
    const meta = u?.user_metadata || {};
    const user = u
      ? { id: u.id, email: u.email, name: meta.full_name || meta.name || meta.user_name || u.email, avatarUrl: meta.avatar_url || meta.picture || null }
      : devUser
        ? { id: 'dev-user', email: 'dev@localhost', name: 'Local dev', avatarUrl: null }
        : null;
    return {
      ready,
      signedIn: Boolean(user),
      user,
      recovering,
      hasSession: Boolean(session),
      signInWith,
      signInWithPassword,
      signUp,
      resendConfirmation,
      sendPasswordReset,
      updatePassword,
      signInAsDev,
      signOut,
    };
  }, [ready, session, devUser, recovering, signInWith, signInWithPassword, signUp, resendConfirmation, sendPasswordReset, updatePassword, signInAsDev, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
