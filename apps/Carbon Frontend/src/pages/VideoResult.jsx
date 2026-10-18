import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Check, Copy, Download, Loader2, Music, Network, Palette, Plus, Presentation } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import { api, fileUrl } from '../lib/api';
import { formatName } from './Create';
import { findStyle, isDirected, MUSIC_NAMES, styleName, supportsInput, useStyles } from '../lib/styles';

const STEPS = [
  { key: 'queued', label: 'In the queue' },
  { key: 'reading', label: 'Reading the repo / site' },
  { key: 'storyboard', label: 'Writing the storyboard' },
  { key: 'rendering', label: 'Rendering frames' },
  { key: 'deck', label: 'Building the deck' },
  { key: 'done', label: 'Ready' },
];

export default function VideoResult() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const { styles } = useStyles();

  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    let misses = 0;
    const poll = async () => {
      try {
        const j = await api(`/api/videos/${id}`, { auth: false });
        if (!alive) return;
        misses = 0;
        setOffline(false);
        setJob(j);
        if (j.status === 'queued' || j.status === 'running') timer.current = setTimeout(poll, 2000);
      } catch (e) {
        if (!alive) return;
        // Only a real 404 means "not found"; a dropped connection or a server
        // restart keeps polling (slower) so the page never gets stuck.
        if (e.status === 404) return setError(e);
        misses += 1;
        setOffline(true);
        timer.current = setTimeout(poll, Math.min(15000, 2000 * 2 ** Math.min(misses, 3)));
      }
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, [id]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', window.location.href);
    }
  };

  const stepIdx = job ? Math.max(0, STEPS.findIndex((s) => s.key === (job.status === 'queued' ? 'queued' : job.step))) : 0;
  const repoUrl = job?.type === 'repo' ? job.url : null;

  return (
    <SiteShell title={job?.title ? `${job.title} launch video` : 'Launch video'}>
      <section className="cx-wrap pt-12 md:pt-16">
        {error ? (
          <div className="cx-card p-8 max-w-xl">
            <div className="text-xl font-semibold">Video not found</div>
            <p className="mt-2" style={{ color: 'var(--cx-muted)' }}>This link doesn’t point to a video. It may have been mistyped.</p>
            <Link to="/create" className="cx-btn cx-btn-primary mt-6">Make a new one</Link>
          </div>
        ) : !job ? (
          <div className="flex items-center gap-3" style={{ color: 'var(--cx-muted)' }}><Loader2 className="animate-spin" size={18} /> {offline ? 'Can’t reach Carbon right now. Retrying…' : 'Loading…'}</div>
        ) : job.status === 'done' ? (
          <>
            <div className="cx-label mb-2">Your launch video</div>
            <h1 className="cx-h1 text-4xl md:text-6xl break-words">{job.title}</h1>
            <div className="mt-2 cx-mono text-sm break-all" style={{ color: 'var(--cx-dim)' }}>{job.url}</div>
            <div className="grid lg:grid-cols-3 gap-8 mt-8">
              <div className="lg:col-span-2">
                <video className="cx-video cx-glow" src={fileUrl(job.videoUrl)} controls autoPlay muted playsInline />
                <div className="mt-3 cx-mono text-xs" style={{ color: 'var(--cx-dim)' }}>
                  MP4 · {job.resolution} · 0:{job.length === 15 ? '15' : '30'} · {job.format ? `${formatName(job.format).toUpperCase()} · ` : ''}{styleName(styles, job.style || 'hud').toUpperCase()} style{job.watermark ? ' · free (watermarked)' : ' · HD'}
                </div>
                <div className="cx-card p-4 mt-4 text-sm">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <span className="flex items-center gap-2"><Palette size={15} color="var(--cx-ember)" /> {styleName(styles, job.style)} style</span>
                    <span className="flex items-center gap-2"><Music size={15} color="var(--cx-ember)" /> {MUSIC_NAMES[job.music || findStyle(styles, job.style)?.music] || job.music} soundtrack</span>
                    <span className="cx-mono text-xs self-center" style={{ color: 'var(--cx-dim)' }}>
                      {job.styleSource === 'llm' ? 'PICKED BY CARBON’S AI DIRECTOR' : job.styleSource === 'brief' ? 'PICKED FROM YOUR ANSWERS' : job.styleSource === 'user' ? 'YOUR PICK' : 'AUTO'}
                    </span>
                  </div>
                  {job.styleReason ? <p className="mt-2" style={{ color: 'var(--cx-muted)' }}>“{job.styleReason}”</p> : null}
                  {job.brief ? (
                    <p className="mt-2 text-xs cx-mono" style={{ color: 'var(--cx-dim)' }}>
                      {[job.brief.audience && `FOR ${job.brief.audience}`, job.brief.feelings?.length && job.brief.feelings.join(' + '), job.brief.focus && `SHOWING ${job.brief.focus}`, job.brief.platform && `ON ${job.brief.platform}`].filter(Boolean).join(' · ').toUpperCase()}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-3">
                <a className="cx-btn cx-btn-primary w-full" href={`${fileUrl(job.videoUrl)}?download=1`}><Download size={16} /> Download video</a>
                <a className="cx-btn cx-btn-ghost w-full" href={`${fileUrl(job.deckUrl)}?download=1`}><Presentation size={16} /> Download pitch deck (.pptx)</a>
                <button className="cx-btn cx-btn-ghost w-full" onClick={share}>{copied ? <><Check size={16} /> Link copied, post it</> : <><Copy size={16} /> Copy share link</>}</button>
                {repoUrl ? (
                  <Link className="cx-btn cx-btn-ghost w-full" to={`/app?repo=${encodeURIComponent(repoUrl)}`}><Network size={16} /> Go deeper into this repo</Link>
                ) : null}
                <div className="cx-card p-3">
                  <div className="text-xs cx-mono mb-2" style={{ color: 'var(--cx-dim)' }}>TRY ANOTHER STYLE</div>
                  {/* Directed styles first (each tells a different story); the brief is kept when it's still fresh. */}
                  <div className="grid grid-cols-3 gap-2">
                    {[...styles]
                      .filter((s) => s.id !== job.style && supportsInput(s, job.type))
                      .sort((a, b) => (isDirected(b) ? 1 : 0) - (isDirected(a) ? 1 : 0))
                      .slice(0, 9)
                      .map((s) => (
                        <Link key={s.id} to={`/create?url=${encodeURIComponent(job.url)}${job.briefId ? `&brief=${job.briefId}` : ''}&style=${s.id}`} className="block rounded-lg overflow-hidden" style={{ border: '1px solid var(--cx-line)' }} title={`Remake as ${s.name}: ${s.tagline}`}>
                          <img src={s.preview?.poster} alt={`${s.name} style`} loading="lazy" className="w-full aspect-video object-cover" />
                          <div className="text-[11px] cx-mono text-center py-1 truncate px-1">{s.name.toUpperCase()}</div>
                        </Link>
                      ))}
                  </div>
                  <Link to={`/create?url=${encodeURIComponent(job.url)}${job.briefId ? `&brief=${job.briefId}` : ''}&style=${job.style}`} className="block text-xs underline mt-2" style={{ color: 'var(--cx-dim)' }}>
                    Browse all {styles.length} styles →
                  </Link>
                </div>
                <Link className="cx-btn cx-btn-ghost w-full" to="/create"><Plus size={16} /> Make another</Link>
                {job.watermark ? (
                  <div className="cx-card p-4 text-sm mt-4" style={{ color: 'var(--cx-muted)' }}>
                    Want longer videos (up to 2 minutes), more video categories and more soundtracks? <Link to="/#early-access" style={{ color: 'var(--cx-ember)' }} className="font-semibold">Join early access →</Link>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : job.status === 'error' ? (
          <div className="cx-card p-8 max-w-xl">
            <div className="flex items-center gap-3 text-xl font-semibold"><AlertTriangle color="var(--cx-red)" /> That one didn’t work</div>
            <p className="mt-3" style={{ color: 'var(--cx-muted)' }}>{job.error || 'Something went wrong while making your video.'}</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--cx-dim)' }}>Failed videos don’t count toward your free limit{job.tier === 'paid' ? ', and your HD credit was refunded' : ''}.</p>
            <Link to={`/create?url=${encodeURIComponent(job.url)}`} className="cx-btn cx-btn-primary mt-6">Try again</Link>
          </div>
        ) : (
          <div className="max-w-2xl">
            <div className="cx-label mb-2">Making your launch video</div>
            <h1 className="cx-h1 text-4xl md:text-5xl break-all">{job.url.replace(/^https?:\/\/(www\.)?/, '')}</h1>
            <div className="cx-progress mt-8"><div style={{ width: `${Math.max(4, Math.round(job.progress * 100))}%` }} /></div>
            <div className="mt-2 cx-mono text-sm flex justify-between" style={{ color: 'var(--cx-dim)' }}>
              <span>{job.status === 'queued' ? `Position ${job.queuePosition} in queue` : STEPS[stepIdx]?.label}</span>
              <span>{Math.round(job.progress * 100)}%</span>
            </div>
            <ol className="mt-8 space-y-3">
              {STEPS.slice(1, 5).map((s, i) => {
                const idx = i + 1;
                const done = stepIdx > idx;
                const active = stepIdx === idx;
                return (
                  <li key={s.key} className="flex items-center gap-3" style={{ color: done ? 'var(--cx-text)' : active ? 'var(--cx-ember)' : 'var(--cx-dim)' }}>
                    {done ? <Check size={18} color="var(--cx-green)" /> : active ? <Loader2 size={18} className="animate-spin" /> : <span className="w-[18px] h-[18px] rounded-full border" style={{ borderColor: 'var(--cx-line-2)' }} />}
                    {s.label}
                  </li>
                );
              })}
            </ol>
            {offline ? <p className="mt-6 text-sm" style={{ color: 'var(--cx-amber)' }}>Lost the connection to Carbon. Your video keeps rendering; this page retries on its own.</p> : null}
            <p className="mt-8 text-sm" style={{ color: 'var(--cx-dim)' }}>Usually 1–3 minutes. You can leave this page; your video will be in <Link to="/dashboard" className="underline">My videos</Link>.</p>
          </div>
        )}
      </section>
    </SiteShell>
  );
}
