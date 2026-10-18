// "Go deeper" (/app?repo=...): the repo analyzer. Reads a public GitHub repo
// through the backend (/api/analyze → Agent Service) and shows its
// architecture, API endpoints and business logic. Free, no sign-in.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, GitBranch, Loader2, Search } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import CodebaseStudio from '../components/CodebaseStudio';
import { API_URL } from '../lib/api';

const SAMPLES = [
  { name: 'expressjs/express', url: 'https://github.com/expressjs/express', tag: 'Backend' },
  { name: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi', tag: 'Python' },
  { name: 'sindresorhus/ky', url: 'https://github.com/sindresorhus/ky', tag: 'Library' },
];

const STEP_TEXT = {
  cloning: 'Downloading the repository…',
  reading_files: 'Reading project files…',
  analyzing: 'AI is reading your code…',
};

export default function GoDeeper() {
  const [params, setParams] = useSearchParams();
  const [repoUrl, setRepoUrl] = useState(params.get('repo') || '');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const started = useRef(null);

  const analyze = async (target, attempt = 0) => {
    const repo = target.trim();
    if (!repo) return;
    setLoading(true);
    setError('');
    setResult(null);
    setStatus(attempt ? `The analysis service is waking up (try ${attempt + 1} of 4)…` : 'Starting…');
    try {
      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repo }),
      });
      // Free hosts sleep when idle: retry a few times while it wakes up.
      if ((res.status === 502 || res.status === 503) && attempt < 3) {
        await new Promise((r) => setTimeout(r, 6000));
        return analyze(repo, attempt + 1);
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || (res.status === 429 ? 'Too many analyses from your network. Wait a few minutes.' : 'Could not reach Carbon. Try again in a minute.'));
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let data;
          try {
            data = JSON.parse(line);
          } catch {
            continue;
          }
          if (data.status === 'error') throw new Error(data.message || 'The analysis failed. Try another repo.');
          if (STEP_TEXT[data.status]) setStatus(STEP_TEXT[data.status]);
          if (data.status === 'node_finished') setStatus('Putting the pieces together…');
          if (data.status === 'complete') {
            finished = true;
            setResult(data);
          }
        }
      }
      if (!finished) throw new Error('The analysis stopped before it finished. Try again, or try a smaller repo.');
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Could not reach Carbon. Check your connection and try again.' : err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ?repo= links (from a finished video, or shared) start right away, once.
  useEffect(() => {
    const repo = (params.get('repo') || '').trim();
    if (repo && started.current !== repo) {
      started.current = repo;
      setRepoUrl(repo);
      analyze(repo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const submit = (e) => {
    e.preventDefault();
    const repo = repoUrl.trim();
    if (!repo) return;
    started.current = repo;
    setParams({ repo }, { replace: true });
    analyze(repo);
  };

  return (
    <SiteShell title={result?.workspace_name ? `Go deeper: ${result.workspace_name}` : 'Go deeper into a repo'}>
      <div className="carbon-root">
        <section className="cx-wrap pt-12 md:pt-16 pb-6 max-w-3xl">
          <div className="cx-label mb-3">Go deeper · free, no sign-up</div>
          <h1 className="cx-h1 text-4xl md:text-6xl">See how a repo fits together.</h1>
          <p className="mt-4 text-lg" style={{ color: 'var(--cx-muted)' }}>
            Paste a public GitHub repo. Carbon reads the code and shows its architecture, API endpoints and business logic in plain English. Big repos take a minute or two.
          </p>
          <form onSubmit={submit} className="mt-8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <GitBranch size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--cx-dim)' }} />
              <input
                className="cx-input cx-mono"
                style={{ paddingLeft: 46 }}
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={loading}
                aria-label="GitHub repo URL"
              />
            </div>
            <button className="cx-btn cx-btn-primary" style={{ height: 52 }} disabled={loading || !repoUrl.trim()}>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />} {loading ? 'Analyzing…' : 'Analyze'}
            </button>
          </form>
          {!loading && !result ? (
            <div className="mt-4 text-sm flex flex-wrap gap-x-4 gap-y-2" style={{ color: 'var(--cx-dim)' }}>
              Try:
              {SAMPLES.map((s) => (
                <button key={s.name} type="button" className="underline cx-mono" onClick={() => setRepoUrl(s.url)}>{s.name}</button>
              ))}
            </div>
          ) : null}
        </section>

        <div className="app-container">
          {loading ? <LoadingSkeleton message={status} /> : null}
          {error ? (
            <div className="cx-wrap max-w-3xl">
              <div className="cx-card p-5 flex items-start gap-3" style={{ borderColor: 'rgba(255,90,90,0.35)' }}>
                <AlertCircle size={20} color="var(--cx-red)" className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold">That didn’t work</div>
                  <div className="text-sm mt-1" style={{ color: 'var(--cx-muted)' }}>{error}</div>
                  <button type="button" className="cx-btn cx-btn-ghost mt-4" style={{ height: 38 }} onClick={() => analyze(repoUrl)}>Try again</button>
                </div>
              </div>
            </div>
          ) : null}
          {result?.architecture ? <CodebaseStudio result={result} /> : null}
          {result && !result.architecture ? (
            <div className="cx-wrap max-w-3xl cx-card p-5 text-sm" style={{ color: 'var(--cx-muted)' }}>
              Carbon couldn’t work out this repo’s architecture. Try another repo.
            </div>
          ) : null}
        </div>
      </div>
    </SiteShell>
  );
}
