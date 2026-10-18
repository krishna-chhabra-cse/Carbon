import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import { api } from '../lib/api';
import EarlyAccess from '../components/site/EarlyAccess';
import { QuotaBadge, useMe } from './Create';

const statusColor = { done: 'var(--cx-green)', error: 'var(--cx-red)', queued: 'var(--cx-amber)', running: 'var(--cx-amber)', expired: 'var(--cx-dim)' };

export default function Dashboard() {
  const { me, state, reload } = useMe();
  const [videos, setVideos] = useState(null);
  useEffect(() => {
    if (state === 'ok') api('/api/videos').then((d) => setVideos(d.videos)).catch(() => setVideos([]));
  }, [state]);
  return (
    <SiteShell title="My videos">
      <section className="cx-wrap pt-12 md:pt-16">
        {state === 'loading' ? (
          <div className="flex items-center gap-3" style={{ color: 'var(--cx-muted)' }}><Loader2 className="animate-spin" size={18} /> Loading…</div>
        ) : state === 'signed-out' ? (
          <div className="cx-card p-8 max-w-lg">
            <div className="text-xl font-semibold">Sign in to see your videos</div>
            <Link to={`/login?next=${encodeURIComponent('/dashboard')}`} className="cx-btn cx-btn-primary mt-6">Sign in <ArrowRight size={16} /></Link>
          </div>
        ) : state === 'error' ? (
          <div className="cx-card p-6">
            <div style={{ color: 'var(--cx-red)' }}>Carbon’s server isn’t responding right now. Try again in a minute.</div>
            <button type="button" className="cx-btn cx-btn-ghost mt-4" onClick={reload}>Try again</button>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="cx-label mb-2">Hi {me.user.name?.split(' ')[0] || 'there'}</div>
                <h1 className="cx-h1 text-4xl md:text-5xl">My videos</h1>
                <div className="mt-4"><QuotaBadge usage={me.usage} /></div>
              </div>
              <Link to="/create" className="cx-btn cx-btn-primary"><Plus size={16} /> New video</Link>
            </div>

            <div className="mt-8 max-w-xl">
              <EarlyAccess compact title="Want more than 2 videos a day?" note="Join early access and be first to get:" source="dashboard" />
            </div>

            <div className="mt-10">
              {videos === null ? (
                <div style={{ color: 'var(--cx-muted)' }}>Loading videos…</div>
              ) : videos.length === 0 ? (
                <div className="cx-card p-8 text-center" style={{ color: 'var(--cx-muted)' }}>
                  No videos yet. <Link to="/create" style={{ color: 'var(--cx-ember)' }}>Make your first one →</Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {videos.map((v) => (
                    <Link key={v.id} to={`/v/${v.id}`} className="cx-card p-5 block hover:border-white/30 transition">
                      <div className="flex items-center justify-between text-xs cx-mono">
                        <span style={{ color: statusColor[v.status] }}>● {v.status === 'running' ? v.step : v.status}</span>
                        <span style={{ color: 'var(--cx-dim)' }}>{v.resolution}</span>
                      </div>
                      <div className="mt-3 font-semibold text-lg truncate">{v.title || v.url.replace(/^https?:\/\/(www\.)?/, '')}</div>
                      <div className="mt-1 text-xs cx-mono truncate" style={{ color: 'var(--cx-dim)' }}>{new Date(`${v.createdAt.replace(' ', 'T')}Z`).toLocaleString()}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}
