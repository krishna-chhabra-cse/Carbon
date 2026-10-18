import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Check, Clapperboard, Film, GitBranch, Globe, Lightbulb, Loader2, MonitorPlay, Music, Palette, Type } from 'lucide-react';
import { SiteShell } from '../components/site/SiteShell';
import EarlyAccess from '../components/site/EarlyAccess';
import { StyleDetails, StyleGallery } from '../components/site/StyleGallery';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { findStyle, isDirected, MUSIC_NAMES, styleName, useStyles } from '../lib/styles';

export function useMe() {
  const { ready, signedIn } = useAuth();
  const [me, setMe] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | signed-out | error
  const reload = () => {
    setState((s) => (s === 'error' ? 'loading' : s));
    return api('/api/me')
      .then((d) => { setMe(d); setState('ok'); })
      .catch((e) => setState(e.status === 401 ? 'signed-out' : 'error'));
  };
  useEffect(() => {
    if (ready) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, signedIn]);
  return { me, state, reload };
}

export function QuotaBadge({ usage }) {
  if (!usage) return null;
  return (
    <div className="flex flex-wrap gap-3 text-sm cx-mono" style={{ color: 'var(--cx-muted)' }}>
      <span className="px-3 py-1.5 rounded-lg" style={{ background: 'var(--cx-panel-2)', border: '1px solid var(--cx-line)' }}>
        Free today: <b className="text-white">{usage.freeLeft}</b> / {usage.freePerDay}
      </span>
      {usage.credits > 0 ? (
        <span className="px-3 py-1.5 rounded-lg" style={{ background: 'var(--cx-panel-2)', border: '1px solid var(--cx-line)' }}>
          HD credits: <b style={{ color: 'var(--cx-ember)' }}>{usage.credits}</b>
        </span>
      ) : null}
    </div>
  );
}

const resetTime = (usage) => {
  if (!usage?.freeResetsAt) return null;
  const at = new Date(usage.freeResetsAt);
  const sameDay = at.toDateString() === new Date().toDateString();
  return `${sameDay ? 'today' : 'tomorrow'} at ${at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

// Shown when today's free videos are used up: when the next one unlocks,
// plus the early-access form. No prices.
export function LimitReached({ usage, url = '' }) {
  const when = resetTime(usage);
  return (
    <div className="space-y-4">
      <div className="cx-card p-5" style={{ borderColor: 'rgba(255,91,31,0.35)' }}>
        <div className="font-semibold text-lg">You’ve made today’s {usage?.freePerDay || 2} free videos. Nice work!</div>
        <p className="text-sm mt-1" style={{ color: 'var(--cx-muted)' }}>
          {when ? `Your next free video unlocks ${when}. ` : 'A new free video unlocks 24 hours after your first one. '}
          Your finished videos are in <Link to="/dashboard" className="underline">My videos</Link>.
        </p>
      </div>
      <EarlyAccess compact title="Want more? Join early access" note="Be first to get:" defaultUrl={url} source="limit" />
    </div>
  );
}

// Video types (ids match the backend's FORMATS). `only` limits a type to repos or sites.
// They apply to the classic looks; directed styles tell their own story.
export const FORMAT_OPTIONS = [
  { id: 'launch', name: 'Launch film', note: 'Name, proof, product, features, call to action', icon: Clapperboard },
  { id: 'explainer', name: 'Explainer', note: 'The problem, the answer, 3 steps, proof', icon: Lightbulb },
  { id: 'kinetic', name: 'Kinetic type', note: 'Big words slamming on every beat', icon: Type },
  { id: 'numbers', name: 'By the numbers', note: 'Led by your real GitHub stats', icon: BarChart3, only: 'repo' },
  { id: 'showcase', name: 'Showcase', note: 'Your own pages, shown three ways', icon: MonitorPlay, only: 'site' },
];
export const formatName = (id) => FORMAT_OPTIONS.find((f) => f.id === id)?.name || id;

// Video type cards + the 30 s / 15 s toggle. `recommended` marks the AI's pick.
// A directed style (`ownStory`) has no video type: say so instead of offering one.
function FormatPicker({ value, onChange, length, onLength, type, recommended, reason, ownStory = null, lengths = [30, 15] }) {
  const options = FORMAT_OPTIONS.filter((f) => !f.only || f.only === type);
  const current = value === 'auto' ? recommended : value;
  return (
    <div className="space-y-4">
      {ownStory ? (
        <div className="cx-card p-4 text-sm flex items-start gap-3" style={{ color: 'var(--cx-muted)' }}>
          <Film size={16} color="var(--cx-ember)" className="mt-0.5 shrink-0" />
          <span><b style={{ color: 'var(--cx-text)' }}>{ownStory}</b> tells its own story with its own scenes and pacing, so there’s no video type to pick.</span>
        </div>
      ) : (
      <div>
        <div className="text-sm font-semibold mb-2">Video type</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="radiogroup" aria-label="Video type">
          {options.map((f) => {
            const on = current === f.id;
            const Icon = f.icon;
            return (
              <button key={f.id} type="button" role="radio" aria-checked={on} aria-label={`${f.name}: ${f.note}`} onClick={() => onChange(f.id === recommended ? 'auto' : f.id)}
                className="text-left rounded-xl px-3.5 py-3 transition"
                style={{ border: `1.5px solid ${on ? 'var(--cx-ember)' : 'var(--cx-line)'}`, background: on ? 'rgba(255,91,31,0.08)' : 'var(--cx-panel)' }}>
                <div className="flex items-center gap-2 text-sm font-semibold"><Icon size={15} color={on ? 'var(--cx-ember)' : 'currentColor'} /> {f.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--cx-dim)' }}>{f.note}</div>
                {f.id === recommended ? <div className="cx-mono text-[10px] mt-1.5" style={{ color: 'var(--cx-ember)' }}>✦ RECOMMENDED</div> : null}
              </button>
            );
          })}
        </div>
        {value === 'auto' && reason ? <p className="text-sm mt-2" style={{ color: 'var(--cx-muted)' }}>“{reason}”</p> : null}
      </div>
      )}
      <div>
        <div className="text-sm font-semibold mb-2">Length</div>
        <div className="inline-flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--cx-line)' }} role="radiogroup" aria-label="Length">
          {[[30, '30 s', 'full film'], [15, '15 s', 'social cut']].filter(([n]) => lengths.includes(n)).map(([n, label, note]) => (
            <button key={n} type="button" role="radio" aria-checked={length === n} onClick={() => onLength(n)} className="px-4 py-2 text-sm"
              style={{ background: length === n ? 'var(--cx-ember)' : 'var(--cx-panel)', color: length === n ? '#0a0a0a' : 'var(--cx-text)', fontWeight: length === n ? 600 : 400 }}>
              {label} <span style={{ opacity: 0.7 }}>· {note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// One brief question: option cards; `max` > 1 allows several picks.
function Question({ n, q, value, onChange }) {
  const picked = Array.isArray(value) ? value : value ? [value] : [];
  const toggle = (id) => {
    if (q.max === 1) return onChange(picked[0] === id ? null : id);
    if (picked.includes(id)) return onChange(picked.filter((x) => x !== id));
    onChange([...picked, id].slice(-q.max));
  };
  return (
    <fieldset>
      <legend className="flex items-baseline gap-3 mb-3">
        <span className="cx-mono text-xs" style={{ color: 'var(--cx-ember)' }}>0{n}</span>
        <span className="text-lg font-semibold">{q.question}</span>
        {q.max > 1 ? <span className="text-xs" style={{ color: 'var(--cx-dim)' }}>pick up to {q.max}</span> : null}
      </legend>
      <div className="grid sm:grid-cols-2 gap-2.5" role={q.max === 1 ? 'radiogroup' : 'group'} aria-label={q.question}>
        {q.options.map((o) => {
          const on = picked.includes(o.id);
          return (
            <button key={o.id} type="button" role={q.max === 1 ? 'radio' : 'checkbox'} aria-checked={on} aria-label={o.hint ? `${o.label}: ${o.hint}` : o.label} onClick={() => toggle(o.id)}
              className="text-left rounded-xl px-4 py-3 transition"
              style={{ border: `1.5px solid ${on ? 'var(--cx-ember)' : 'var(--cx-line)'}`, background: on ? 'rgba(255,91,31,0.08)' : 'var(--cx-panel)' }}>
              <div className="text-sm font-semibold flex items-center gap-2">{on ? <Check size={14} color="var(--cx-ember)" /> : null}{o.label}</div>
              {o.hint ? <div className="text-xs mt-0.5" style={{ color: 'var(--cx-dim)' }}>{o.hint}</div> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function Create() {
  const [params] = useSearchParams();
  const [url, setUrl] = useState(params.get('url') || '');
  const { styles } = useStyles();
  const nameOf = (id) => styleName(styles, id);
  const presetStyle = /^[a-z]+$/.test(params.get('style') || '') && params.get('style') !== 'auto' ? params.get('style') : null;
  const resumeBrief = params.get('brief');
  // url → reading → questions → thinking → look   (or "manual": pick a style yourself)
  const [step, setStep] = useState(resumeBrief ? 'reading' : presetStyle ? 'manual' : 'url');
  const [style, setStyle] = useState(presetStyle || 'auto');
  const [format, setFormat] = useState('launch'); // 'auto' = the recommended type
  const [length, setLength] = useState(30);
  const [brief, setBrief] = useState(null);
  const [answers, setAnswers] = useState({});
  const [note, setNote] = useState('');
  const [look, setLook] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { me, state, reload } = useMe();
  const navigate = useNavigate();
  const isRepo = /github\.com\//i.test(url);
  const usage = me?.usage;
  const outOfFree = usage && usage.credits === 0 && usage.freeLeft === 0;
  const answered = brief ? brief.questions.filter((q) => (Array.isArray(answers[q.id]) ? answers[q.id].length : answers[q.id])).length : 0;
  const inputType = brief ? brief.product.type : url.trim() ? (isRepo ? 'repo' : 'site') : null;
  // The style that will actually be used (the recommendation when on Auto).
  const effective = findStyle(styles, style === 'auto' && look ? look.style : style);
  const ownStory = isDirected(effective) ? effective.name : null;
  const lengths = effective?.lengths || [30, 15];

  // A link from a finished video ("try another style") reopens its brief, so
  // the answers and the captured site are kept.
  useEffect(() => {
    if (!resumeBrief || state !== 'ok') return;
    api(`/api/briefs/${encodeURIComponent(resumeBrief)}`)
      .then((b) => {
        setBrief(b);
        setUrl(b.url || '');
        setAnswers(b.answers || {});
        setNote(b.brief?.note || '');
        if (b.look) {
          setLook(b.look);
          setFormat('auto');
          setStep('look');
        } else setStep('questions');
      })
      .catch(() => setStep(presetStyle ? 'manual' : 'url'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeBrief, state]);

  // A 15 s pick that the chosen style doesn't offer falls back to 30 s, visibly.
  useEffect(() => {
    if (!lengths.includes(length)) setLength(lengths[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effective?.id]);

  const fail = (err, back) => {
    setError(err);
    setBusy(false);
    if (back) setStep(back);
  };

  const startBrief = async (e) => {
    e.preventDefault();
    setError(null);
    setStep('reading');
    try {
      const b = await api('/api/briefs', { method: 'POST', body: { url } });
      setBrief(b);
      setAnswers({});
      setLook(null);
      setStep('questions');
    } catch (err) {
      fail(err, 'url');
    }
  };

  const getLook = async () => {
    setError(null);
    setStep('thinking');
    try {
      const r = await api(`/api/briefs/${brief.id}/look`, { method: 'POST', body: { answers, note } });
      setLook(r.look);
      setStyle('auto');
      setFormat('auto');
      setStep('look');
    } catch (err) {
      fail(err, err.code === 'NO_BRIEF' ? 'url' : 'questions');
    }
  };

  const generate = async (e) => {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Directed styles have no video type: send 'auto' so nothing is silently dropped.
      const fmt = ownStory ? 'auto' : format;
      const body = brief && step !== 'manual' ? { briefId: brief.id, style, format: fmt, length } : { url, style, format: ownStory ? 'auto' : fmt === 'auto' ? 'launch' : fmt, length };
      const { id } = await api('/api/videos', { method: 'POST', body });
      navigate(`/v/${id}`);
    } catch (err) {
      fail(err);
    }
  };

  const limitHit = error && (error.code === 'FREE_LIMIT' || error.code === 'FREE_IP_LIMIT');
  const errorBox = !error ? null : limitHit ? (
    error.code === 'FREE_LIMIT' ? <LimitReached usage={error.body?.usage || usage} url={url} /> : (
      <div className="space-y-4">
        <div className="cx-card p-4 text-sm" style={{ color: 'var(--cx-muted)' }}>{error.message}</div>
        <EarlyAccess compact title="Want more? Join early access" note="Be first to get:" defaultUrl={url} source="limit" />
      </div>
    )
  ) : (
    <div className="cx-card p-4 text-sm" style={{ color: 'var(--cx-red)', borderColor: 'rgba(255,90,90,0.35)' }}>
      {error.message}
    </div>
  );

  const generateRow = (
    <>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <button className="cx-btn cx-btn-primary" type="button" onClick={generate} disabled={busy || outOfFree || (step === 'manual' && !url.trim())} style={{ height: 50 }}>
          {busy ? <><Loader2 size={17} className="animate-spin" /> Starting…</> : <>Generate video + deck <ArrowRight size={17} /></>}
        </button>
        <span className="text-sm" style={{ color: 'var(--cx-dim)' }}>
          Free: 720p with a small watermark.
        </span>
      </div>
    </>
  );
  // Kept outside <form>s: it contains the early-access form (no nested forms).
  const limitBlock = outOfFree && !limitHit ? <LimitReached usage={usage} url={url} /> : null;

  const urlInput = (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--cx-dim)' }}>{isRepo ? <GitBranch size={18} /> : <Globe size={18} />}</div>
      <input
        className="cx-input cx-mono"
        style={{ paddingLeft: 46 }}
        placeholder="https://github.com/owner/repo  or  https://your-app.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        autoFocus
        required
        aria-label="GitHub repo or website URL"
      />
    </div>
  );

  let body;
  if (step === 'url' || step === 'reading') {
    body = (
      <div className="mt-10 space-y-5">
      <QuotaBadge usage={usage} />
      {limitBlock}
      <form onSubmit={startBrief} className="space-y-5">
        {urlInput}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <button className="cx-btn cx-btn-primary" type="submit" disabled={step === 'reading' || !url.trim() || outOfFree} style={{ height: 50 }}>
            {step === 'reading' ? <><Loader2 size={17} className="animate-spin" /> {isRepo ? 'Reading the repo…' : 'Capturing the site (about 20 s)…'}</> : <>Next: 4 quick questions <ArrowRight size={17} /></>}
          </button>
          <button type="button" className="text-sm underline" style={{ color: 'var(--cx-dim)' }} onClick={() => { setError(null); setStep('manual'); }} disabled={step === 'reading' || outOfFree}>
            Skip, I’ll pick a style myself
          </button>
        </div>
        <div className="text-sm pt-2" style={{ color: 'var(--cx-dim)' }}>
          Try: <button type="button" className="underline cx-mono" onClick={() => setUrl('https://github.com/fastify/fastify')}>github.com/fastify/fastify</button>{' '}
          or <button type="button" className="underline cx-mono" onClick={() => setUrl('https://vite.dev')}>vite.dev</button>
        </div>
      </form>
      {errorBox}
      </div>
    );
  } else if (step === 'manual') {
    body = (
      <div className="mt-10 space-y-5">
      <form onSubmit={generate} className="space-y-5">
        <QuotaBadge usage={usage} />
        {urlInput}
        <StyleGallery styles={styles} value={style} onChange={setStyle} type={inputType} autoNote="Carbon picks a look that fits your project" />
        <FormatPicker value={format} onChange={setFormat} length={length} onLength={setLength} type={isRepo ? 'repo' : 'site'} recommended={null} ownStory={ownStory} lengths={lengths} />
        {generateRow}
      </form>
      {limitBlock}
      {errorBox}
      <button type="button" className="text-sm underline" style={{ color: 'var(--cx-dim)' }} onClick={() => { setStyle('auto'); setStep('url'); }}>
        ← Answer 4 quick questions instead, and let Carbon pick the look
      </button>
      </div>
    );
  } else if (step === 'questions' || step === 'thinking') {
    body = (
      <div className="mt-10 space-y-8">
        <div className="cx-card p-5 flex items-start gap-4">
          <div className="mt-1" style={{ color: 'var(--cx-ember)' }}>{brief.product.type === 'repo' ? <GitBranch size={20} /> : <Globe size={20} />}</div>
          <div className="min-w-0">
            <div className="text-lg font-semibold">{brief.product.name}</div>
            <div className="cx-mono text-xs break-all" style={{ color: 'var(--cx-dim)' }}>{brief.product.displayUrl}</div>
            {brief.product.description ? <p className="text-sm mt-2" style={{ color: 'var(--cx-muted)' }}>{brief.product.description}</p> : null}
          </div>
        </div>
        {brief.questions.map((q, i) => (
          <Question key={q.id} n={i + 1} q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />
        ))}
        <div>
          <label className="text-sm font-semibold" htmlFor="brief-note">Anything else? <span style={{ color: 'var(--cx-dim)', fontWeight: 400 }}>(optional)</span></label>
          <input id="brief-note" className="cx-input mt-2" maxLength={140} placeholder="e.g. mention it’s free and open source" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <button className="cx-btn cx-btn-primary" type="button" onClick={getLook} disabled={step === 'thinking'} style={{ height: 50 }}>
            {step === 'thinking' ? <><Loader2 size={17} className="animate-spin" /> Picking your look…</> : <>{answered ? 'Show me my look' : 'Let Carbon decide'} <ArrowRight size={17} /></>}
          </button>
          <span className="text-sm" style={{ color: 'var(--cx-dim)' }}>{answered}/{brief.questions.length} answered{answered ? '' : ', or skip them all'}</span>
        </div>
        {errorBox}
        <button type="button" className="text-sm underline" style={{ color: 'var(--cx-dim)' }} onClick={() => setStep('url')}>← Use a different link</button>
      </div>
    );
  } else {
    const rec = look.style;
    const chosen = style === 'auto' ? rec : style;
    const chosenStyle = findStyle(styles, chosen);
    const music = style === 'auto' ? look.music : chosenStyle?.music || chosen;
    body = (
      <div className="mt-10 space-y-6">
        <div className="cx-card p-6">
          <div className="cx-label mb-2">{style === 'auto' ? (look.source === 'llm' ? 'Your look · picked by Carbon’s AI' : 'Your look · from your answers') : 'Your pick'}</div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-2xl font-semibold"><Palette size={20} color="var(--cx-ember)" /> {nameOf(chosen)}</div>
            <div className="flex items-center gap-2" style={{ color: 'var(--cx-muted)' }}><Music size={16} color="var(--cx-ember)" /> {MUSIC_NAMES[music] || music} soundtrack</div>
          </div>
          {style === 'auto' && look.reason ? <p className="mt-3" style={{ color: 'var(--cx-muted)' }}>“{look.reason}”</p> : null}
          {style === 'auto' && look.alternative ? (
            <button type="button" className="text-sm underline mt-3" style={{ color: 'var(--cx-dim)' }} onClick={() => setStyle(look.alternative)}>
              Also a good fit: {nameOf(look.alternative)}
            </button>
          ) : style !== 'auto' ? (
            <button type="button" className="text-sm underline mt-3" style={{ color: 'var(--cx-dim)' }} onClick={() => setStyle('auto')}>
              Back to the recommendation: {nameOf(rec)}
            </button>
          ) : null}
        </div>
        {chosenStyle ? <StyleDetails s={chosenStyle} type={brief.product.type} /> : null}
        <FormatPicker value={format} onChange={setFormat} length={length} onLength={setLength} type={brief.product.type} recommended={look.format || 'launch'} reason={look.formatReason} ownStory={ownStory} lengths={lengths} />
        {generateRow}
        {limitBlock}
        {errorBox}
        <details className="cx-card p-5" open={Boolean(resumeBrief && presetStyle)}>
          <summary className="cursor-pointer text-sm font-semibold">Browse all {styles.length} styles</summary>
          <div className="mt-4">
            <StyleGallery styles={styles} value={style} onChange={setStyle} type={brief.product.type} recommended={rec} autoLabel={`Recommended: ${nameOf(rec)}`} autoNote="Picked from your answers" />
          </div>
        </details>
        <button type="button" className="text-sm underline" style={{ color: 'var(--cx-dim)' }} onClick={() => setStep('questions')}>← Change my answers</button>
      </div>
    );
  }

  return (
    <SiteShell title="Make a launch video">
      <section className="cx-wrap pt-14 md:pt-20 max-w-3xl pb-20">
        <div className="cx-label mb-3">New launch video</div>
        <h1 className="cx-h1 text-4xl md:text-6xl">
          {step === 'questions' || step === 'thinking' ? 'A few quick questions.' : step === 'look' ? 'Here’s your look.' : 'Paste a repo or a website.'}
        </h1>
        <p className="mt-4 text-lg" style={{ color: 'var(--cx-muted)' }}>
          {step === 'questions' || step === 'thinking'
            ? 'Tell us who it’s for and how it should feel. Carbon picks the style, soundtrack and words to match.'
            : 'You’ll get a 30-second launch video and an editable pitch deck in a few minutes.'}
        </p>

        {state === 'loading' ? (
          <div className="mt-10 flex items-center gap-3" style={{ color: 'var(--cx-muted)' }}><Loader2 className="animate-spin" size={18} /> Checking your account…</div>
        ) : state === 'signed-out' ? (
          <div className="cx-card p-6 mt-10">
            <div className="text-lg font-semibold">Sign in to make videos</div>
            <p className="mt-1 text-sm" style={{ color: 'var(--cx-muted)' }}>Free accounts get 2 videos every day. It takes 10 seconds.</p>
            <Link to={`/login?next=${encodeURIComponent(`/create${url ? `?url=${encodeURIComponent(url)}` : ''}`)}`} className="cx-btn cx-btn-primary mt-5">
              Sign in to continue <ArrowRight size={16} />
            </Link>
          </div>
        ) : state === 'error' ? (
          <div className="cx-card p-6 mt-10">
            <div style={{ color: 'var(--cx-red)' }}>Carbon’s server isn’t responding right now. Please try again in a minute.</div>
            <button type="button" className="cx-btn cx-btn-ghost mt-4" onClick={reload}>Try again</button>
          </div>
        ) : (
          body
        )}
      </section>
    </SiteShell>
  );
}
