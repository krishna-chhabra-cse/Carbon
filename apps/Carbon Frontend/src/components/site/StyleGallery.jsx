import { useMemo, useState } from 'react';
import { Box, Check, Clapperboard, Film, Palette, Search, Sparkles } from 'lucide-react';
import { inputNeed, isDirected, supportsInput } from '../../lib/styles';

// The style gallery: browse by category, search, preview a style's real
// rendered clip on hover (one clip plays at a time), pick one. Styles that
// can't be made from the current link are shown but disabled, with the reason.

const SAMPLE_NOTE = 'Previews are rendered by Carbon from a sample project; your video uses your own repo or site.';

function Card({ s, on, ok, recommended, hovered, onHover, onPick }) {
  const clip = s.preview?.clip;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-disabled={!ok}
      aria-label={`${s.name}: ${s.tagline}${ok ? '' : ` (${inputNeed(s)})`}`}
      onClick={() => ok && onPick(s.id)}
      onMouseEnter={() => onHover(s.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(s.id)}
      onBlur={() => onHover(null)}
      className="text-left rounded-xl overflow-hidden transition flex flex-col items-stretch"
      style={{
        border: `1.5px solid ${on ? 'var(--cx-ember)' : 'var(--cx-line)'}`,
        background: 'var(--cx-panel)',
        boxShadow: on ? '0 0 0 3px rgba(255,91,31,0.18)' : 'none',
        opacity: ok ? 1 : 0.5,
        cursor: ok ? 'pointer' : 'not-allowed',
      }}
    >
      <div className="relative aspect-video w-full overflow-hidden" style={{ background: 'var(--cx-panel-2)' }}>
        {s.preview?.poster ? <img src={s.preview.poster} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" /> : null}
        {/* Only the hovered card loads and plays its clip. */}
        {hovered && clip && ok ? <video src={clip} poster={s.preview.poster} muted autoPlay loop playsInline preload="none" className="absolute inset-0 w-full h-full object-cover" /> : null}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <span className="cx-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.65)', color: '#fff' }}>{s.category.toUpperCase()}</span>
          {recommended ? <span className="cx-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--cx-ember)', color: '#0a0a0a' }}>✦ FOR YOU</span> : null}
        </div>
        {on ? <span className="absolute right-2 top-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--cx-ember)' }}><Check size={14} color="#0a0a0a" /></span> : null}
        {!ok ? <span className="absolute inset-x-0 bottom-0 text-[11px] cx-mono text-center py-1" style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}>{inputNeed(s).toUpperCase()}</span> : null}
      </div>
      <div className="px-3 py-2.5">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          {s.name}
          {s.requires?.includes('webgl') ? <Box size={13} aria-label="3D" color="var(--cx-dim)" /> : null}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--cx-dim)' }}>{s.tagline}</div>
      </div>
    </button>
  );
}

export function StyleGallery({ styles, value, onChange, type = null, recommended = null, allowAuto = true, autoLabel = 'Auto', autoNote = 'Carbon picks the look from your project' }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [hover, setHover] = useState(null);

  const categories = useMemo(() => {
    const cats = [...new Set(styles.map((s) => s.category))];
    return ['All', ...cats.filter((c) => c !== 'Classic').sort(), ...(cats.includes('Classic') ? ['Classic'] : [])];
  }, [styles]);

  const q = query.trim().toLowerCase();
  const shown = styles.filter((s) => {
    if (category !== 'All' && s.category !== category) return false;
    if (!q) return true;
    return [s.name, s.tagline, s.description, s.category, ...(s.bestFor || [])].join(' ').toLowerCase().includes(q);
  });
  // Styles that tell their own story first, then the classic looks.
  shown.sort((a, b) => (isDirected(b) ? 1 : 0) - (isDirected(a) ? 1 : 0) || (b.id === recommended) - (a.id === recommended));
  const selected = styles.find((s) => s.id === value) || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="text-sm font-semibold flex items-center gap-2"><Palette size={15} color="var(--cx-ember)" /> Style <span className="font-normal" style={{ color: 'var(--cx-dim)' }}>· {styles.length} options</span></div>
        <label className="relative block sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cx-dim)' }} />
          <input className="cx-input" style={{ paddingLeft: 34, height: 38, fontSize: 14 }} placeholder="Search styles (e.g. 3D, data, retro)" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search styles" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Style categories">
        {categories.map((c) => (
          <button key={c} type="button" role="tab" aria-selected={category === c} onClick={() => setCategory(c)} className="text-xs px-3 py-1.5 rounded-full"
            style={{ border: `1px solid ${category === c ? 'var(--cx-ember)' : 'var(--cx-line)'}`, background: category === c ? 'rgba(255,91,31,0.1)' : 'transparent', color: category === c ? 'var(--cx-ember)' : 'var(--cx-muted)' }}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3" role="radiogroup" aria-label="Video style">
        {allowAuto && category === 'All' && !q ? (
          <button type="button" role="radio" aria-checked={value === 'auto'} onClick={() => onChange('auto')} className="text-left rounded-xl overflow-hidden transition flex flex-col items-stretch"
            style={{ border: `1.5px solid ${value === 'auto' ? 'var(--cx-ember)' : 'var(--cx-line)'}`, background: 'var(--cx-panel)', boxShadow: value === 'auto' ? '0 0 0 3px rgba(255,91,31,0.18)' : 'none' }}>
            <div className="aspect-video w-full flex items-center justify-center cx-lattice"><Sparkles size={28} color="var(--cx-ember)" /></div>
            <div className="px-3 py-2.5">
              <div className="text-sm font-semibold">{autoLabel}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--cx-dim)' }}>{autoNote}</div>
            </div>
          </button>
        ) : null}
        {shown.map((s) => (
          <Card key={s.id} s={s} on={value === s.id} ok={supportsInput(s, type)} recommended={s.id === recommended} hovered={hover === s.id} onHover={setHover} onPick={onChange} />
        ))}
      </div>
      {!shown.length ? <p className="text-sm" style={{ color: 'var(--cx-dim)' }}>No styles match “{query}”.</p> : null}
      {selected ? <StyleDetails s={selected} type={type} /> : null}
    </div>
  );
}

// The picked style, larger: its own clip and what makes it different.
export function StyleDetails({ s, type }) {
  const ok = supportsInput(s, type);
  return (
    <div className="cx-card overflow-hidden grid md:grid-cols-5">
      <div className="md:col-span-3 relative aspect-video" style={{ background: 'var(--cx-panel-2)' }}>
        {s.preview?.clip ? (
          <video key={s.id} src={s.preview.clip} poster={s.preview.poster} muted autoPlay loop playsInline controls preload="metadata" className="absolute inset-0 w-full h-full object-cover" />
        ) : s.preview?.poster ? (
          <img src={s.preview.poster} alt={`${s.name} style preview`} className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
      </div>
      <div className="md:col-span-2 p-5 text-sm space-y-3">
        <div>
          <div className="cx-label mb-1">{s.category}</div>
          <div className="text-xl font-semibold">{s.name}</div>
        </div>
        <p style={{ color: 'var(--cx-muted)' }}>{s.description}</p>
        <div className="flex flex-wrap gap-1.5 text-[11px] cx-mono">
          <span className="px-2 py-0.5 rounded" style={{ border: '1px solid var(--cx-line)' }}>{isDirected(s) ? <><Film size={11} className="inline mr-1" />OWN STORY</> : <><Clapperboard size={11} className="inline mr-1" />CLASSIC FILM</>}</span>
          <span className="px-2 py-0.5 rounded" style={{ border: '1px solid var(--cx-line)' }}>{s.inputs.length === 2 ? 'REPOS + SITES' : s.inputs[0] === 'repo' ? 'REPOS ONLY' : 'WEBSITES ONLY'}</span>
          <span className="px-2 py-0.5 rounded" style={{ border: '1px solid var(--cx-line)' }}>{s.lengths.map((l) => `${l}s`).join(' · ')}</span>
          {s.requires?.includes('webgl') ? <span className="px-2 py-0.5 rounded" style={{ border: '1px solid var(--cx-line)' }}>3D</span> : null}
        </div>
        {s.motion ? <p><b>Motion.</b> <span style={{ color: 'var(--cx-muted)' }}>{s.motion}</span></p> : null}
        {s.bestFor?.length ? <p><b>Best for.</b> <span style={{ color: 'var(--cx-muted)' }}>{s.bestFor.join(', ')}</span></p> : null}
        {!ok ? <p style={{ color: 'var(--cx-red)' }}>{inputNeed(s)}, so it can’t be made from this link.</p> : null}
        {isDirected(s) ? <p className="text-xs" style={{ color: 'var(--cx-dim)' }}>{SAMPLE_NOTE}</p> : null}
      </div>
    </div>
  );
}
