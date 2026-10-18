// Video player for the site's demo: poster with a big play button, a DEMO
// badge, chapter markers on the timeline, chapter jump buttons, ±10s skip,
// speed, volume, picture-in-picture, fullscreen and keyboard shortcuts
// (space/k play, j/l ±10s, ←/→ ±5s, m mute, f fullscreen).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize, Minimize, Pause, PictureInPicture2, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react';

const fmt = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};
const SPEEDS = [1, 1.25, 1.5, 2];

function IconBtn({ label, onClick, children, active }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="flex items-center justify-center w-9 h-9 rounded-lg transition"
      style={{ color: active ? 'var(--cx-ember)' : '#fff', background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
      {children}
    </button>
  );
}

export default function DemoPlayer({ src, poster, chapters = [], badge = 'Demo', title }) {
  const wrap = useRef(null);
  const video = useRef(null);
  const hideTimer = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [full, setFull] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [hover, setHover] = useState(null); // { x, t } over the scrub bar

  const v = () => video.current;
  const total = duration || chapters.at(-1)?.end || 0;
  const activeIdx = chapters.reduce((acc, c, i) => (time >= c.t ? i : acc), 0);

  const play = useCallback(() => {
    setStarted(true);
    v()?.play().catch(() => {});
    // Focus the player so keyboard shortcuts work right away.
    wrap.current?.focus({ preventScroll: true });
  }, []);
  const toggle = useCallback(() => (v()?.paused ? play() : v()?.pause()), [play]);
  const seek = useCallback((t) => {
    if (!v()) return;
    v().currentTime = Math.max(0, Math.min(t, v().duration || t));
    setStarted(true);
  }, []);
  const skip = useCallback((d) => seek((v()?.currentTime || 0) + d), [seek]);
  const toggleFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrap.current?.requestFullscreen?.();
  }, []);

  // Auto-hide the controls while playing.
  const poke = useCallback(() => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowUi(false), 2500);
  }, []);

  useEffect(() => {
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const onKey = (e) => {
    const k = e.key.toLowerCase();
    const map = { ' ': toggle, k: toggle, j: () => skip(-10), l: () => skip(10), arrowleft: () => skip(-5), arrowright: () => skip(5), m: () => setMuted((x) => !x), f: toggleFull };
    if (map[k]) {
      e.preventDefault();
      map[k]();
      poke();
    }
  };

  useEffect(() => {
    if (v()) {
      v().muted = muted;
      v().volume = volume;
      v().playbackRate = speed;
    }
  }, [muted, volume, speed]);

  const barPos = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - r.left, r.width));
    return { x, t: (x / r.width) * total };
  };
  const chapterAt = (t) => chapters.reduce((acc, c) => (t >= c.t ? c : acc), chapters[0]);

  return (
    <div>
      <div
        ref={wrap}
        tabIndex={0}
        onKeyDown={onKey}
        onMouseMove={poke}
        onMouseLeave={() => playing && setShowUi(false)}
        className="relative overflow-hidden rounded-[14px] cx-glow outline-none"
        style={{ background: '#000', aspectRatio: full ? undefined : '16 / 9', height: full ? '100%' : undefined }}
        aria-label={title || 'Demo video'}
      >
        <video
          ref={video}
          src={src}
          poster={poster}
          preload="metadata"
          playsInline
          className="w-full h-full block"
          style={{ objectFit: 'contain' }}
          onClick={toggle}
          onPlay={() => { setPlaying(true); poke(); }}
          onPause={() => { setPlaying(false); setShowUi(true); }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onProgress={(e) => {
            const b = e.currentTarget.buffered;
            if (b.length) setBuffered(b.end(b.length - 1));
          }}
          onEnded={() => setShowUi(true)}
        />

        {/* DEMO badge: always visible so nobody mistakes this for their own output */}
        <div className="absolute top-3 left-3 cx-mono text-[11px] tracking-widest uppercase px-2 py-1 rounded" style={{ background: 'var(--cx-ember)', color: '#000' }}>
          {badge}
        </div>

        {/* Big play button before the first play */}
        {!started ? (
          <button type="button" onClick={play} aria-label="Play demo" className="absolute inset-0 flex items-center justify-center group" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55))' }}>
            <span className="flex items-center justify-center rounded-full transition group-hover:scale-110" style={{ width: 92, height: 92, background: 'var(--cx-ember)', boxShadow: '0 0 0 10px rgba(255,91,31,0.25), 0 0 60px rgba(255,91,31,0.6)' }}>
              <Play size={38} fill="#000" color="#000" style={{ marginLeft: 5 }} />
            </span>
            <span className="absolute bottom-4 right-4 cx-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.85)' }}>
              ▶ {fmt(total)} · {chapters.length} chapters
            </span>
          </button>
        ) : null}

        {/* Controls */}
        {started ? (
          <div className="absolute left-0 right-0 bottom-0 px-3 pb-2 pt-10 transition-opacity duration-300"
            style={{ opacity: showUi || !playing ? 1 : 0, background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.85))' }}>
            {/* scrub bar with chapter ticks */}
            <div
              className="relative h-5 flex items-center cursor-pointer group"
              onMouseMove={(e) => setHover(barPos(e))}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => seek(barPos(e).t)}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(total)}
              aria-valuenow={Math.round(time)}
            >
              <div className="absolute left-0 right-0 h-1 group-hover:h-1.5 rounded-full transition-all" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${total ? (buffered / total) * 100 : 0}%`, background: 'rgba(255,255,255,0.25)' }} />
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${total ? (time / total) * 100 : 0}%`, background: 'var(--cx-ember)' }} />
                {chapters.slice(1).map((c) => (
                  <div key={c.t} className="absolute top-0 bottom-0 w-[3px]" style={{ left: `${(c.t / (total || 1)) * 100}%`, background: 'rgba(0,0,0,0.9)' }} />
                ))}
              </div>
              <div className="absolute w-3 h-3 rounded-full -translate-x-1/2" style={{ left: `${total ? (time / total) * 100 : 0}%`, background: '#fff', boxShadow: '0 0 10px rgba(255,91,31,0.8)' }} />
              {hover ? (
                <div className="absolute bottom-6 -translate-x-1/2 px-2 py-1 rounded cx-mono text-xs whitespace-nowrap pointer-events-none" style={{ left: hover.x, background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {fmt(hover.t)} · {chapterAt(hover.t)?.label}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-1 mt-1">
              <IconBtn label={playing ? 'Pause (k)' : 'Play (k)'} onClick={toggle}>{playing ? <Pause size={19} fill="#fff" /> : <Play size={19} fill="#fff" />}</IconBtn>
              <IconBtn label="Back 10 seconds (j)" onClick={() => skip(-10)}><RotateCcw size={17} /></IconBtn>
              <IconBtn label="Forward 10 seconds (l)" onClick={() => skip(10)}><RotateCw size={17} /></IconBtn>
              <IconBtn label={muted ? 'Unmute (m)' : 'Mute (m)'} onClick={() => setMuted((x) => !x)}>{muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</IconBtn>
              <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} aria-label="Volume"
                onChange={(e) => { setVolume(Number(e.target.value)); setMuted(Number(e.target.value) === 0); }}
                className="hidden sm:block w-20 accent-[#ff5b1f]" style={{ height: 4, padding: 0, background: 'none', border: 'none', boxShadow: 'none' }} />
              <span className="cx-mono text-xs ml-2 text-white/80 tabular-nums">{fmt(time)} / {fmt(total)}</span>
              <span className="hidden md:inline cx-mono text-xs ml-3 truncate" style={{ color: 'var(--cx-amber)' }}>{chapters[activeIdx]?.label}</span>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} title="Playback speed"
                  className="cx-mono text-xs px-2 h-8 rounded-lg text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>{speed}×</button>
                {document.pictureInPictureEnabled ? (
                  <IconBtn label="Picture in picture" onClick={() => (document.pictureInPictureElement ? document.exitPictureInPicture() : v()?.requestPictureInPicture?.())}><PictureInPicture2 size={17} /></IconBtn>
                ) : null}
                <IconBtn label={full ? 'Exit fullscreen (f)' : 'Fullscreen (f)'} onClick={toggleFull}>{full ? <Minimize size={17} /> : <Maximize size={17} />}</IconBtn>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Chapter buttons */}
      {chapters.length ? (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 cx-scroll" role="list" aria-label="Chapters">
          {chapters.map((c, i) => (
            <button key={c.t} type="button" role="listitem" onClick={() => { seek(c.t); play(); }}
              className="shrink-0 text-left px-3 py-2 rounded-lg transition"
              style={{
                background: started && i === activeIdx ? 'rgba(255,91,31,0.14)' : 'var(--cx-panel)',
                border: `1px solid ${started && i === activeIdx ? 'rgba(255,91,31,0.6)' : 'var(--cx-line)'}`,
              }}>
              <span className="block cx-mono text-[11px]" style={{ color: 'var(--cx-dim)' }}>{fmt(c.t)}</span>
              <span className="block text-sm font-semibold whitespace-nowrap">{c.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
