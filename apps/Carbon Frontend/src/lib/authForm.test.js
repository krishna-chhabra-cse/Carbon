// Run with `npm test` in apps/Carbon Frontend (node --test, no extra deps).
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthForm, checkNewPassword, friendlyAuthError, readAuthRedirectError, safeNext, signUpOutcome } from './authForm.js';

test('checkAuthForm: sign-up needs a valid email, 8+ chars and matching passwords', () => {
  assert.match(checkAuthForm('signup', { email: 'nope', password: 'longenough', confirm: 'longenough' }), /valid email/);
  assert.match(checkAuthForm('signup', { email: 'a@b.co', password: 'short', confirm: 'short' }), /at least 8/);
  assert.match(checkAuthForm('signup', { email: 'a@b.co', password: 'longenough', confirm: 'longenougH' }), /don’t match/);
  assert.equal(checkAuthForm('signup', { email: ' a@b.co ', password: 'longenough', confirm: 'longenough' }), null);
});

test('checkAuthForm: sign-in only needs a password; forgot only an email', () => {
  assert.match(checkAuthForm('signin', { email: 'a@b.co' }), /password/);
  assert.equal(checkAuthForm('signin', { email: 'a@b.co', password: 'x' }), null);
  assert.equal(checkAuthForm('forgot', { email: 'a@b.co' }), null);
  assert.match(checkAuthForm('forgot', { email: '' }), /valid email/);
});

test('checkNewPassword', () => {
  assert.match(checkNewPassword('short', 'short'), /at least 8/);
  assert.match(checkNewPassword('longenough', 'different1'), /don’t match/);
  assert.equal(checkNewPassword('longenough', 'longenough'), null);
});

test('friendlyAuthError maps Supabase errors by code and by message', () => {
  assert.equal(friendlyAuthError({ code: 'invalid_credentials' }), 'Wrong email or password.');
  assert.equal(friendlyAuthError({ message: 'Invalid login credentials' }), 'Wrong email or password.');
  assert.match(friendlyAuthError({ message: 'Email not confirmed' }), /Confirm your email/);
  assert.match(friendlyAuthError({ code: 'user_already_exists', message: 'User already registered' }), /already an account/);
  assert.match(friendlyAuthError({ code: 'weak_password' }), /too easy/);
  assert.match(friendlyAuthError({ message: 'For security purposes, you can only request this after 42 seconds.' }), /Too many tries/);
  assert.match(friendlyAuthError({ message: 'Unsupported provider: provider is not enabled' }), /isn’t switched on/);
  assert.match(friendlyAuthError(new TypeError('Failed to fetch')), /Couldn’t reach/);
  assert.equal(friendlyAuthError({ message: 'Something odd' }), 'Something odd');
  assert.equal(friendlyAuthError(null), 'Something went wrong. Try again.');
});

test('readAuthRedirectError reads errors Supabase puts in the URL', () => {
  assert.match(readAuthRedirectError('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', ''), /expired/);
  assert.match(readAuthRedirectError('', '?error=access_denied&error_description=provider+is+not+enabled'), /isn’t switched on/);
  assert.equal(readAuthRedirectError('#access_token=abc&type=recovery', ''), null);
  assert.equal(readAuthRedirectError('', ''), null);
});

test('safeNext only allows same-site paths', () => {
  assert.equal(safeNext('/create?url=x'), '/create?url=x');
  assert.equal(safeNext('//evil.com'), '/create');
  assert.equal(safeNext('/\\evil.com'), '/create');
  assert.equal(safeNext('https://evil.com'), '/create');
  assert.equal(safeNext(null, '/dashboard'), '/dashboard');
});

test('signUpOutcome tells signed-in, confirm-email and existing accounts apart', () => {
  assert.equal(signUpOutcome({ session: { access_token: 't' }, user: { identities: [{}] } }), 'signed-in');
  assert.equal(signUpOutcome({ session: null, user: { identities: [{ provider: 'email' }] } }), 'confirm-email');
  assert.equal(signUpOutcome({ session: null, user: { identities: [] } }), 'exists');
  assert.equal(signUpOutcome({}), 'confirm-email');
});
