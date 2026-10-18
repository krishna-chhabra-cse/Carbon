// Roast My Codebase: free, no signup. A score out of 10 backed by real
// metrics (god files, circular deps, test ratio, security findings), the
// worst offender, evidence-backed "crimes", fixes, and a shareable link.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, Copy, Flame, GitBranch, Loader2, ShieldAlert, Wrench } from 'lucide-react';
import { SiteShell } from './site/SiteShell';
import { api, warmUp } from '../lib/api';

const STEPS = ['Cloning the repo', 'Measuring every file', 'Mapping imports for circular deps', 'Counting tests', 'Scanning for leaked secrets', 'Warming up the grill'];
const PRIORITY_COLOR = { CRITICAL: 'var(--cx-red)', HIGH: 'var(--cx-ember)', MEDIUM: 'var(--cx-amber)', LOW: 'var(--cx-muted)' };

const scoreColor = (s) => (s >= 80 ? 'var(--cx-green)' : s >= 55 ? 'var(--cx-amber)' : 'var(--cx-red)');

function Stat({ label, value, bad }) {
  return (
    <div className="cx-card p-4">
      <div className="cx-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cx-dim)' }}>{label}</div>
      <div className="mt-2 text-3xl font-extrabold tabular-nums" style={{ color: bad ? 'var(--cx-ember)' : 'var(--cx-text)' }}>{value}</div>
    </div>
  );
}

function RoastForm({ initial = '', onSubmit, busy }) {
  const [url, setUrl] = useState(initial);
  return (
    <form className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl" onSubmit={(e) => { e.preventDefault(); onSubmit(url.trim()); }}>
      <div className="relative flex-1">
        <GitBranch size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--cx-dim)' }} />
        <input className="cx-input cx-mono" style={{ paddingLeft: 46 }} placeholder="https://github.com/owner/repo" value={url} onChange={(e) => setUrl(e.target.value)} required aria-label="GitHub repo URL" />
      </div>
      <button className="cx-btn cx-btn-primary" style={{ height: 52 }} disabled={busy || !url.trim()}>
        {busy ? <Loader2 size={17} className="animate-spin" /> : <Flame size={17} />} Roast it
      </button>
    </form>
  );
}

export default function RoastPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const prefill = params.get('url') || '';
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { warmUp(); }, []);

  useEffect(() => {
    if (!id) { setData(null); return; }
    setLoading(true);
    api(`/api/roast/${id}`, { auth: false })
      .then(setData)
      .catch(() => setError('That roast could not be found.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!loading) return undefined;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 2500);
    return () => clearInterval(t);
  }, [loading]);

  const roast = async (repoUrl) => {
    if (!/github\.com\/[^/]+\/[^/]+/i.test(repoUrl)) { setError('Paste a GitHub repo URL like https://github.com/owner/repo'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api('/api/roast', { method: 'POST', auth: false, body: { repo_url: repoUrl } });
      navigate(`/roast/${res.id}`);
    } catch (err) {
      setError(err.message || 'The roast failed. Try again in a minute.');
      setLoading(false);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading ──
  if (loading && !data) {
    return (
      <SiteShell title="Roasting…">
        <section className="cx-wrap pt-24 max-w-xl">
          <Flame size={40} color="var(--cx-ember)" className="animate-pulse" />
          <h1 className="cx-h1 text-4xl mt-6">Roasting your codebase…</h1>
          <ol className="mt-8 space-y-3 cx-mono text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3" style={{ color: i < step ? 'var(--cx-text)' : i === step ? 'var(--cx-ember)' : 'var(--cx-dim)' }}>
                {i < step ? <Check size={16} color="var(--cx-green)" /> : i === step ? <Loader2 size={16} className="animate-spin" /> : <span className="w-4" />} {s}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-sm" style={{ color: 'var(--cx-dim)' }}>Most take under a minute. The first one after a quiet period can take up to two.</p>
        </section>
      </SiteShell>
    );
  }

  // ── Result ──
  if (data?.roast) {
    const r = data.roast;
    const s = r.stats || {};
    const score10 = (Number(r.overall_score || 0) / 10).toFixed(1);
    const tweet = `${r.share_text || `My repo got roasted by Carbon: ${score10}/10 🔥`}\n\n${shareUrl}`;
    return (
      <SiteShell title={`Roast of ${data.repo_name}`}>
        <section className="cx-wrap pt-12 md:pt-16">
          <div className="cx-label mb-3">My repo got roasted · {data.repo_name}</div>
          <div className="grid lg:grid-cols-3 gap-6 items-start">
            <div className="cx-card p-7 lg:col-span-2 relative overflow-hidden">
              <div className="absolute inset-0 cx-lattice opacity-40 pointer-events-none" />
              <div className="relative">
                <div className="flex items-end gap-4 flex-wrap">
                  <div className="cx-h1 text-7xl md:text-8xl tabular-nums" style={{ color: scoreColor(r.overall_score) }}>{score10}</div>
                  <div className="pb-3 cx-mono" style={{ color: 'var(--cx-dim)' }}>/ 10 · grade {String(r.grade || '').replace(/_/g, ' ')}</div>
                </div>
                <h1 className="cx-h2 text-2xl md:text-4xl mt-4">{r.title}</h1>
                <p className="mt-4 text-lg leading-relaxed" style={{ color: 'var(--cx-muted)' }}>“{r.roast}”</p>
              </div>
            </div>
            <div className="cx-card p-6 flex flex-col gap-3">
              <div className="font-semibold">Share the damage</div>
              <button className="cx-btn cx-btn-primary w-full" onClick={copy}>{copied ? <><Check size={16} /> Link copied · post it</> : <><Copy size={16} /> Copy link</>}</button>
              <a className="cx-btn cx-btn-ghost w-full" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`} target="_blank" rel="noreferrer">Post on X</a>
              <a className="cx-btn cx-btn-ghost w-full" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">Share on LinkedIn</a>
              <div className="mt-2 pt-4 border-t text-sm" style={{ borderColor: 'var(--cx-line)', color: 'var(--cx-muted)' }}>
                Roasted enough? Show it off instead.
                <Link to={`/create?url=${encodeURIComponent(data.repo_url || '')}`} className="cx-btn cx-btn-ghost w-full mt-3">Make a launch video <ArrowRight size={16} /></Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <Stat label="god files" value={s.god_files_count ?? 0} bad={s.god_files_count > 0} />
            <Stat label="circular deps" value={s.circular_deps_count ?? 0} bad={s.circular_deps_count > 0} />
            <Stat label="test ratio" value={s.test_ratio || '0%'} bad={parseFloat(s.test_ratio) < 20} />
            <Stat label="security" value={s.security_issues ?? 0} bad={s.security_issues > 0} />
            <Stat label="files" value={(s.total_files ?? 0).toLocaleString()} />
            <Stat label="lines" value={(s.total_loc ?? 0).toLocaleString()} />
          </div>

          {r.worst_offender?.file ? (
            <div className="cx-card p-6 mt-6" style={{ borderColor: 'rgba(255,91,31,0.35)' }}>
              <div className="cx-label">Worst offender</div>
              <div className="cx-mono text-lg mt-2 break-all">{r.worst_offender.file}</div>
              <div className="mt-1" style={{ color: 'var(--cx-muted)' }}>{r.worst_offender.reason} <span className="cx-mono text-sm" style={{ color: 'var(--cx-ember)' }}>· {r.worst_offender.metric}</span></div>
            </div>
          ) : null}

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="flex items-center gap-2 font-semibold mb-3"><ShieldAlert size={18} color="var(--cx-ember)" /> The crimes</div>
              <div className="space-y-3">
                {(r.top_crimes || []).map((c, i) => (
                  <div key={i} className="cx-card p-5">
                    <div className="font-semibold">{c.crime || c.title}</div>
                    {c.file ? <div className="cx-mono text-xs mt-1 break-all" style={{ color: 'var(--cx-dim)' }}>{c.file}</div> : null}
                    {c.evidence ? <div className="cx-mono text-xs mt-2 p-2 rounded" style={{ background: 'var(--cx-panel-2)', color: 'var(--cx-muted)' }}>{c.evidence}</div> : null}
                    {c.roast ? <p className="mt-3 text-sm italic" style={{ color: 'var(--cx-muted)' }}>“{c.roast}”</p> : null}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 font-semibold mb-3"><Wrench size={18} color="var(--cx-green)" /> How to fix it</div>
              <div className="space-y-3">
                {(r.fixes || []).map((f, i) => (
                  <div key={i} className="cx-card p-5">
                    <div className="flex items-center gap-2">
                      {f.priority ? <span className="cx-mono text-xs px-2 py-0.5 rounded" style={{ color: PRIORITY_COLOR[f.priority] || 'var(--cx-muted)', border: '1px solid currentColor' }}>{f.priority}</span> : null}
                      <span className="font-semibold">{f.title}</span>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: 'var(--cx-muted)' }}>{f.action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="cx-card p-6 mt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div><div className="font-semibold">Roast another repo</div><div className="text-sm" style={{ color: 'var(--cx-muted)' }}>Free, no signup.</div></div>
            <RoastForm onSubmit={roast} busy={loading} />
          </div>
          {error ? <div className="mt-3 text-sm" style={{ color: 'var(--cx-red)' }}>{error}</div> : null}
        </section>
      </SiteShell>
    );
  }

  // ── Input ──
  return (
    <SiteShell title="Roast my codebase">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 cx-lattice opacity-50 pointer-events-none" />
        <div className="cx-wrap relative pt-16 md:pt-24 pb-8">
          <div className="cx-label mb-4">/ Free · no signup /</div>
          <h1 className="cx-h1 text-5xl md:text-8xl">Roast my<br /><span style={{ color: 'var(--cx-ember)' }}>codebase.</span></h1>
          <p className="mt-6 text-lg max-w-2xl" style={{ color: 'var(--cx-muted)' }}>
            Think your code is clean? Carbon measures every file and tells you exactly how bad it is: a score out of 10, backed by real numbers. Then it tells you how to fix it.
          </p>
          <div className="mt-8"><RoastForm initial={prefill} onSubmit={roast} busy={loading} /></div>
          {error ? <div className="mt-3 text-sm" style={{ color: 'var(--cx-red)' }}>{error}</div> : null}
          <div className="mt-10 grid sm:grid-cols-3 gap-3 max-w-3xl">
            {[['god files', 'files over 1,000 lines or 50 functions'], ['circular deps', 'import cycles between modules'], ['test ratio', 'test files vs source files']].map(([t, b]) => (
              <div key={t} className="cx-card p-4">
                <div className="cx-mono text-sm" style={{ color: 'var(--cx-ember)' }}>{t}</div>
                <div className="text-sm mt-1" style={{ color: 'var(--cx-muted)' }}>{b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
