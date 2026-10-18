// Plain helpers for the sign-in forms (no React, no Supabase), so they can be
// unit-tested with `npm test` (node --test).

export const MIN_PASSWORD = 8;

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

// Returns an error message for the form, or null when it can be sent.
export function checkAuthForm(mode, { email = '', password = '', confirm = '' } = {}) {
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  if (mode === 'forgot') return null;
  if (!password) return 'Enter your password.';
  if (mode === 'signup') {
    if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
    if (password !== confirm) return 'The two passwords don’t match.';
  }
  return null;
}

export function checkNewPassword(password = '', confirm = '') {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters for your password.`;
  if (password !== confirm) return 'The two passwords don’t match.';
  return null;
}

// Supabase's error → something a first-time visitor understands.
// `code` is set by newer Supabase versions; older ones only have `message`.
export function friendlyAuthError(err) {
  const code = err?.code || '';
  const msg = String(err?.message || err || '');
  const has = (re) => re.test(msg);
  if (code === 'invalid_credentials' || has(/invalid login credentials/i)) return 'Wrong email or password.';
  if (code === 'email_not_confirmed' || has(/email not confirmed/i)) return 'Confirm your email first: open the link we sent you, then sign in.';
  if (code === 'user_already_exists' || code === 'email_exists' || has(/already registered|already exists/i)) return 'There’s already an account with this email. Sign in instead.';
  if (code === 'weak_password' || has(/password should|weak password/i)) return `That password is too easy to guess. Use at least ${MIN_PASSWORD} characters with a mix of letters and numbers.`;
  if (code === 'same_password' || has(/different from the old/i)) return 'Pick a password you haven’t used here before.';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || has(/rate limit|too many|security purposes/i)) return 'Too many tries. Wait a minute and try again.';
  if (code === 'signup_disabled' || has(/signups not allowed/i)) return 'New sign-ups are paused right now.';
  if (code === 'provider_disabled' || has(/provider is not enabled|unsupported provider/i)) return 'That sign-in option isn’t switched on yet. Use email and password instead.';
  if (code === 'otp_expired' || has(/expired|invalid.*(link|token)/i)) return 'That link has expired or was already used. Ask for a new one.';
  if (code === 'session_not_found' || has(/auth session missing/i)) return 'Your reset link has expired. Ask for a new one.';
  if (has(/failed to fetch|network/i)) return 'Couldn’t reach the sign-in service. Check your connection and try again.';
  return msg || 'Something went wrong. Try again.';
}

// After Supabase redirects back, errors arrive in the URL hash or query
// (e.g. #error=access_denied&error_code=otp_expired&error_description=...).
export function readAuthRedirectError(hash = '', search = '') {
  for (const raw of [hash.replace(/^#/, ''), search.replace(/^\?/, '')]) {
    const p = new URLSearchParams(raw);
    if (p.get('error') || p.get('error_code')) {
      return friendlyAuthError({ code: p.get('error_code') || '', message: p.get('error_description') || p.get('error') });
    }
  }
  return null;
}

// Only same-site paths are allowed as the place to go after signing in.
export function safeNext(next, fallback = '/create') {
  return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : fallback;
}

// signUp() returns a user without a session when the email must be confirmed
// first. With confirmation on, an existing email comes back with no identities.
export function signUpOutcome(data) {
  if (data?.session) return 'signed-in';
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return 'exists';
  return 'confirm-email';
}
