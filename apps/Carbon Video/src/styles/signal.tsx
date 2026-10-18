import { noise3D } from "@remotion/noise";
import type React from "react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { clamp, fit, rand, readableOn, rgba, useScene } from "../engine/common";
import type { SceneProps, StyleModule } from "../engine/types";
import { mono, sans } from "../theme";

// Signal: a generative particle field. Thousands of particles drift through
// a noise flow field (computed from the film frame, so any frame renders the
// same way), then converge into the product name, into one constellation per
// feature, and finally collapse into the install line. Long exposure trails,
// a dark night palette and the product's accent as the signal colour.

const BG = "#05060b";
const INK = "#dfe6ff";
const N = 2600;

type Pt = [number, number];
type Targets = Pt[] | null;

const base = Array.from({ length: N }, (_, i) => [rand(`bx${i}`) * 2200 - 140, rand(`by${i}`) * 1280 - 100, rand(`d${i}`)] as const);

// Where particle i drifts at film frame t (pure function of t).
const flow = (i: number, t: number, amp = 260): Pt => {
  const [bx, by] = base[i];
  return [bx + noise3D("fx", bx * 0.0015, by * 0.0015, t * 0.004) * amp + t * 0.35, by + noise3D("fy", bx * 0.0015, by * 0.0015, t * 0.004) * amp];
};

// Points covering `text` set large and centred (sampled once per text).
const textTargets = (text: string, cx: number, cy: number, maxW: number): Pt[] => {
  const c = document.createElement("canvas");
  c.width = 1920;
  c.height = 600;
  const ctx = c.getContext("2d");
  if (!ctx) return [];
  const size = Math.min(320, maxW / Math.max(1, text.length * 0.62));
  ctx.font = `900 ${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 960, 300);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const pts: Pt[] = [];
  for (let y = 0; y < c.height; y += 4) for (let x = 0; x < c.width; x += 4) if (data[(y * c.width + x) * 4 + 3] > 128) pts.push([x - 960 + cx, y - 300 + cy]);
  return pts;
};

const pickTarget = (pts: Pt[], i: number): Pt => {
  if (!pts.length) return [960, 540];
  const p = pts[Math.floor(rand(`t${i}`) * pts.length)];
  return [p[0] + (rand(`jx${i}`) - 0.5) * 3, p[1] + (rand(`jy${i}`) - 0.5) * 3];
};

// The canvas: each particle sits between its flow position and its target by
// `k` (0 = free, 1 = on target), with a per-particle delay so shapes form organically.
const Field: React.FC<{ t: number; k: number; targets: Targets; accent: string; amp?: number; fade?: number }> = ({ t, k, targets, accent, amp = 260, fade = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 1920, 1080);
    ctx.lineCap = "round";
    for (let i = 0; i < N; i++) {
      const d = base[i][2];
      const ki = targets ? Easing.inOut(Easing.cubic)(Math.min(1, Math.max(0, k * 1.35 - d * 0.35))) : 0;
      const tgt = targets ? pickTarget(targets, i) : null;
      const at = (tt: number): Pt => {
        const [fx, fy] = flow(i, tt, amp);
        return tgt ? [fx + (tgt[0] - fx) * ki, fy + (tgt[1] - fy) * ki] : [fx, fy];
      };
      const [x, y] = at(t);
      const [px, py] = at(t - 3);
      const hot = d < 0.22;
      ctx.strokeStyle = hot ? rgba(accent, fade) : `rgba(223,230,255,${(0.4 + 0.6 * ki) * fade})`;
      ctx.lineWidth = (hot ? 3.2 : 2.4) + ki * 0.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x + 0.01, y);
      ctx.stroke();
    }
  }, [t, k, targets, accent, amp, fade]);
  return <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0 }} />;
};

const Glow: React.FC<{ accent: string; strength?: number }> = ({ accent, strength = 0.18 }) => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 55%, ${rgba(accent, strength)} 0%, transparent 60%)` }} />;

const Kicker: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ position: "absolute", fontFamily: mono, fontSize: 22, letterSpacing: "0.32em", textTransform: "uppercase", color: rgba(INK, 0.6), ...style }}>{children}</div>
);

const ease = (frame: number, a: number, b: number) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

// ── Scenes ──────────────────────────────────────────────────────────────
const FieldScene: React.FC<SceneProps> = ({ sb, accent, start }) => {
  const { frame } = useScene();
  return (
    <AbsoluteFill>
      <Glow accent={accent} strength={0.1 * ease(frame, 0, 60)} />
      <Field t={start + frame} k={0} targets={null} accent={accent} fade={ease(frame, 0, 40)} />
      <Kicker style={{ left: 0, right: 0, top: 500, textAlign: "center", opacity: ease(frame, 30, 60) * (1 - ease(frame, 95, 115)) }}>incoming signal · {sb.meta?.domain || sb.outro.url}</Kicker>
    </AbsoluteFill>
  );
};

const NameScene: React.FC<SceneProps> = ({ sb, accent, start }) => {
  const { frame, duration } = useScene();
  const name = sb.title.title;
  const targets = useMemo(() => textTargets(name, 960, 470, 1700), [name]);
  const k = ease(frame, 6, 100) * (1 - ease(frame, duration - 34, duration - 4));
  return (
    <AbsoluteFill>
      <Glow accent={accent} strength={0.16} />
      <Field t={start + frame} k={k} targets={targets} accent={accent} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 720, textAlign: "center", fontFamily: sans, fontWeight: 300, fontSize: 40, letterSpacing: `${0.2 + 0.4 * (1 - ease(frame, 90, 150))}em`, color: INK, opacity: ease(frame, 90, 130) * (1 - ease(frame, duration - 30, duration - 10)) }}>
        {sb.title.caption}
      </div>
    </AbsoluteFill>
  );
};

const TaglineScene: React.FC<SceneProps> = ({ sb, accent, start }) => {
  const { frame } = useScene();
  const words = (sb.beats?.length ? sb.beats : [sb.title.caption]).slice(0, 3);
  const per = 50;
  return (
    <AbsoluteFill>
      <Field t={start + frame} k={0} targets={null} accent={accent} amp={420} />
      {words.map((w, i) => {
        const a = 10 + i * per;
        const o = ease(frame, a, a + 14) * (1 - ease(frame, a + per - 10, a + per));
        return (
          <div key={i} style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", fontFamily: sans, fontWeight: 800, fontSize: fit(w, 140, 1600, 0.6), letterSpacing: "-0.03em", color: i === 1 ? accent : "#ffffff", opacity: o, filter: `blur(${(1 - o) * 12}px)`, textShadow: `0 0 40px ${rgba(accent, 0.6)}` }}>
            {w}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const ConstellationScene: React.FC<SceneProps> = ({ sb, accent, start }) => {
  const { frame, duration } = useScene();
  const feats = (sb.features ?? []).slice(0, 5);
  const nodes = feats.map((_, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, feats.length)) * Math.PI * 2;
    return [960 + Math.cos(a) * 520, 540 + Math.sin(a) * 300] as Pt;
  });
  const targets = useMemo(() => {
    const pts: Pt[] = [];
    nodes.forEach(([x, y], n) => {
      for (let j = 0; j < 160; j++) {
        const r = Math.sqrt(rand(`r${n}-${j}`)) * 70;
        const a = rand(`a${n}-${j}`) * Math.PI * 2;
        pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
      }
    });
    return pts;
    // nodes derive from the feature list only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feats.join("|")]);
  const k = ease(frame, 10, 90) * (1 - ease(frame, duration - 34, duration - 4));
  const lines = ease(frame, 70, 120) * (1 - ease(frame, duration - 40, duration - 20));
  return (
    <AbsoluteFill>
      <Glow accent={accent} strength={0.12} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {nodes.map(([x, y], i) => {
          const [nx, ny] = nodes[(i + 1) % nodes.length];
          return nodes.length > 1 ? <line key={i} x1={x} y1={y} x2={x + (nx - x) * lines} y2={y + (ny - y) * lines} stroke={rgba(accent, 0.5)} strokeWidth={1.5} /> : null;
        })}
      </svg>
      <Field t={start + frame} k={k} targets={targets} accent={accent} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 510, textAlign: "center", fontFamily: mono, fontSize: 24, letterSpacing: "0.3em", textTransform: "uppercase", color: rgba(INK, 0.7), opacity: lines }}>{sb.tree.heading}</div>
      {feats.map((f, i) => (
        <div key={f} style={{ position: "absolute", left: nodes[i][0] - 300, width: 600, top: nodes[i][1] + 86, textAlign: "center", fontFamily: sans, fontWeight: 600, fontSize: fit(f, 40, 560, 0.55), color: "#ffffff", opacity: ease(frame, 60 + i * 10, 84 + i * 10) * (1 - ease(frame, duration - 30, duration - 10)) }}>
          {f}
        </div>
      ))}
    </AbsoluteFill>
  );
};

const CollapseScene: React.FC<SceneProps> = ({ sb, accent, start }) => {
  const { frame } = useScene();
  const isRepo = sb.meta?.type !== "site";
  const cmd = isRepo ? sb.outro.command : sb.outro.url;
  const targets = useMemo(() => Array.from({ length: 400 }, (_, j) => [380 + (j / 400) * 1160, 600 + (rand(`ly${j}`) - 0.5) * 6] as Pt), []);
  const k = ease(frame, 4, 70);
  const shown = cmd.slice(0, Math.max(0, Math.floor((frame - 70) * 1.3)));
  return (
    <AbsoluteFill>
      <Glow accent={accent} strength={0.2} />
      <Field t={start + frame} k={k} targets={targets} accent={accent} fade={1 - 0.5 * ease(frame, 80, 130)} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: sans, fontWeight: 800, fontSize: fit(sb.title.title, 160, 1600, 0.6), letterSpacing: "-0.03em", color: "#ffffff", opacity: ease(frame, 60, 100) }}>{sb.title.title}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 630, textAlign: "center", fontFamily: mono, fontSize: fit(cmd, 46, 1300, 0.6), color: INK }}>
        {isRepo ? <span style={{ color: accent }}>$ </span> : null}
        {shown}
      </div>
      {isRepo ? <Kicker style={{ left: 0, right: 0, top: 760, textAlign: "center", opacity: ease(frame, 120, 150) }}>{sb.outro.url}</Kicker> : null}
    </AbsoluteFill>
  );
};

export const signal: StyleModule = {
  bg: BG,
  accent: (sb) => readableOn(sb.accent, true),
  watermark: { color: INK, background: BG, font: mono },
  scenes: {
    "signal.field": FieldScene,
    "signal.name": NameScene,
    "signal.tagline": TaglineScene,
    "signal.constellation": ConstellationScene,
    "signal.collapse": CollapseScene,
  },
};
