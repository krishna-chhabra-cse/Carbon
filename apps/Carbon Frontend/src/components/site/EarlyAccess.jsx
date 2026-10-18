import { useState } from 'react';
import { ArrowRight, Check, Clock, Loader2, Music, Shapes } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';

// What early access unlocks. Keep this honest: only list what we're building.
export const COMING_SOON = [
  { icon: Clock, text: 'Longer videos, up to 2 minutes' },
  { icon: Shapes, text: 'More video categories' },
  { icon: Music, text: 'More soundtracks' },
];

export function ComingSoonList({ className = '' }) {
  return (
    <ul className={`space-y-2 text-sm ${className}`} style={{ color: 'var(--cx-muted)' }}>
      {COMING_SOON.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2.5"><Icon size={15} color="var(--cx-ember)" className="shrink-0" /> {text}</li>
      ))}
    </ul>
  );
}

// Early-access form: collects an email and what the person would make.
// No prices are shown anywhere on the site.
export default function EarlyAccess({ title = 'Get early access', note, compact = false, defaultUrl = '', source = 'site', showComing = true }) {
  const { user } = useAuth() || {};
  const [email, setEmail] = useState(user?.email && user.email !== 'dev@localhost' ? user.email : '');
  const [wants, setWants] = useState('');
  const [url, setUrl] = useState(defaultUrl);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/early-access', { method: 'POST', auth: false, body: { email, wants, url, source } });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="cx-card p-6 flex items-start gap-3">
        <Check size={20} color="var(--cx-green)" className="mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">You're on the list.</div>
          <div className="text-sm mt-1" style={{ color: 'var(--cx-muted)' }}>We'll email you when longer videos, new categories and new soundtracks open up. Thanks for telling us what you'd make.</div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`cx-card ${compact ? 'p-5' : 'p-7'} space-y-3`}>
      <div className="font-semibold text-lg">{title}</div>
      {note ? <p className="text-sm" style={{ color: 'var(--cx-muted)' }}>{note}</p> : null}
      {showComing ? <ComingSoonList className="pb-1" /> : null}
      <input className="cx-input" type="email" required placeholder="Your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
      {!compact ? (
        <>
          <input className="cx-input cx-mono" placeholder="github.com/you/app or your-app.com (optional)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Repo or website" />
          <textarea
            className="cx-input"
            style={{ height: 'auto', minHeight: 80, padding: 14, resize: 'vertical' }}
            maxLength={500}
            placeholder="What would you make? e.g. a launch video for my CLI tool for next week's Product Hunt launch"
            value={wants}
            onChange={(e) => setWants(e.target.value)}
            aria-label="What would you make"
          />
        </>
      ) : null}
      {error ? <div className="text-sm" style={{ color: 'var(--cx-red)' }}>{error}</div> : null}
      <button className="cx-btn cx-btn-primary w-full" disabled={busy || !email}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : null} Request early access <ArrowRight size={16} />
      </button>
      <div className="text-xs" style={{ color: 'var(--cx-dim)' }}>Free to join. We only use your email to tell you when access opens.</div>
    </form>
  );
}
