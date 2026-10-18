import type React from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame } from "remotion";
import { BEAT, clamp, fit, lum, mixHex, readableOn, rgba, useScene } from "../engine/common";
import type { SceneProps, StyleModule } from "../engine/types";
import { sans } from "../theme";

// Product Tour: a polished walkthrough of the live site. A browser window
// over a soft brand-tinted gradient, the URL typed in and the page loading,
// a cursor that glides on eased paths and clicks with a ripple, tooltip
// callouts, camera push-ins, and a real scroll from the hero to the next
// captured section. Websites only: it needs the product's own pages.

const BASE = "#f3f4f7";
const INK = "#0f1115";
const MUTED = "#5b6270";
const SMOOTH = Easing.bezier(0.45, 0, 0.2, 1);

const Background: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const a = mixHex(accent, 255, 0.55);
  const b = mixHex(accent, 255, 0.78);
  const x = 30 + Math.sin(frame / 90) * 10;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}% 20%, ${a} 0%, transparent 45%), radial-gradient(circle at ${100 - x}% 90%, ${b} 0%, transparent 50%), ${BASE}` }} />;
};

// Interpolate a point along keyframes [{f, x, y}] with an ease between each.
const along = (frame: number, keys: { f: number; x: number; y: number }[]) => {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i].f) {
      const t = SMOOTH((frame - keys[i - 1].f) / (keys[i].f - keys[i - 1].f));
      return { f: frame, x: keys[i - 1].x + (keys[i].x - keys[i - 1].x) * t, y: keys[i - 1].y + (keys[i].y - keys[i - 1].y) * t };
    }
  }
  return keys[keys.length - 1];
};

const Cursor: React.FC<{ x: number; y: number; clicks?: number[]; accent: string }> = ({ x, y, clicks = [], accent }) => {
  const frame = useCurrentFrame();
  const last = clicks.filter((c) => frame >= c).pop();
  const r = last !== undefined ? frame - last : 99;
  const press = r < 6 ? 0.85 : 1;
  return (
    <>
      {r < 24 ? <div style={{ position: "absolute", left: x - r * 3, top: y - r * 3, width: r * 6, height: r * 6, borderRadius: "50%", border: `3px solid ${accent}`, opacity: 1 - r / 24 }} /> : null}
      <svg width={44} height={52} viewBox="0 0 22 26" style={{ position: "absolute", left: x - 4, top: y - 2, scale: String(press), filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }}>
        <path d="M2 1 L2 20 L7 15.5 L10.5 23.5 L14 22 L10.6 14.2 L17 14.2 Z" fill={INK} stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </>
  );
};

// The browser window with the captured page inside. `scroll` 0 → hero at
// the top, 1 → the second captured section at the top.
const Browser: React.FC<{ sb: SceneProps["sb"]; accent: string; w: number; h: number; url: string; scroll?: number; load?: number; progress?: number }> = ({ sb, accent, w, h, url, scroll = 0, load = 1, progress = 1 }) => {
  const hero = sb.slot2.kind === "shot" ? sb.slot2.image : "";
  const section = sb.slot3.kind === "shot" ? sb.slot3.image : hero;
  return (
    <div style={{ width: w, height: h, borderRadius: 18, overflow: "hidden", background: "#ffffff", boxShadow: "0 40px 120px rgba(15,17,21,0.28), 0 0 0 1px rgba(15,17,21,0.08)" }}>
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 12, padding: "0 24px", background: "#f6f7f9", borderBottom: "1px solid #e4e6eb", position: "relative" }}>
        {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
          <span key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
        ))}
        <div style={{ marginLeft: 30, flex: 1, maxWidth: w * 0.55, height: 38, borderRadius: 19, background: "#ffffff", border: "1px solid #e4e6eb", display: "flex", alignItems: "center", padding: "0 20px", fontFamily: sans, fontSize: 22, color: MUTED }}>
          <span style={{ color: "#22a35a", marginRight: 10 }}>●</span>
          {url}
        </div>
        <div style={{ position: "absolute", left: 0, bottom: -1, height: 3, width: `${progress * 100}%`, background: accent, opacity: progress < 1 ? 1 : 0 }} />
      </div>
      <div style={{ position: "relative", height: h - 64, overflow: "hidden", clipPath: `inset(0 0 ${(1 - load) * 100}% 0)` }}>
        <div style={{ translate: `0px ${-scroll * 50}%` }}>
          <Img src={hero} style={{ width: "100%", display: "block" }} />
          <Img src={section} style={{ width: "100%", display: "block" }} />
        </div>
      </div>
    </div>
  );
};

const Tooltip: React.FC<{ x: number; y: number; text: string; at: number; accent: string }> = ({ x, y, text, at, accent }) => {
  const frame = useCurrentFrame();
  const k = spring({ frame: frame - at, fps: 30, config: { damping: 16, stiffness: 180 } });
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, scale: String(0.8 + 0.2 * k), opacity: k, transformOrigin: "left top", display: "flex", alignItems: "center", gap: 14, padding: "16px 24px", borderRadius: 14, background: "#ffffff", boxShadow: "0 18px 40px rgba(15,17,21,0.18)", fontFamily: sans, fontWeight: 600, fontSize: 30, color: INK, whiteSpace: "nowrap" }}>
      <span style={{ width: 14, height: 14, borderRadius: 7, background: accent }} />
      {text}
    </div>
  );
};

// ── Scenes ──────────────────────────────────────────────────────────────
const Open: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, fps } = useScene();
  const url = sb.meta?.domain || sb.outro.url;
  const pop = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const typedUrl = url.slice(0, Math.max(0, Math.floor((frame - 16) * 0.9)));
  const typedDone = 16 + url.length / 0.9;
  const progress = interpolate(frame, [typedDone, typedDone + 30], [0, 1], clamp);
  const load = interpolate(frame, [typedDone + 10, typedDone + 40], [0, 1], { ...clamp, easing: SMOOTH });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ scale: String(0.86 + 0.14 * pop), translate: `0px ${(1 - pop) * 120}px` }}>
        <Browser sb={sb} accent={accent} w={1500} h={880} url={typedUrl} load={load} progress={progress} />
      </div>
    </AbsoluteFill>
  );
};

const Hero: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const chips = (sb.slot2.kind === "shot" ? sb.slot2.chips : []).slice(0, 3);
  const W = 1500;
  const H = 880;
  const ox = 210;
  const oy = 100;
  const pts = [
    { f: 0, x: ox + W * 0.92, y: oy + H * 1.05 },
    { f: 40, x: ox + W * 0.28, y: oy + H * 0.36 },
    { f: 110, x: ox + W * 0.64, y: oy + H * 0.3 },
    { f: 180, x: ox + W * 0.42, y: oy + H * 0.64 },
  ];
  const c = along(frame, pts);
  const zoom = interpolate(frame, [90, 140, 220, 260], [1, 1.22, 1.22, 1], { ...clamp, easing: SMOOTH });
  const fx = (pts[2].x - 960) * (zoom - 1);
  const fy = (pts[2].y - 540) * (zoom - 1);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ scale: String(zoom), translate: `${-fx / zoom}px ${-fy / zoom}px` }}>
        <div style={{ position: "absolute", left: ox, top: oy }}>
          <Browser sb={sb} accent={accent} w={W} h={H} url={sb.meta?.domain || sb.outro.url} />
        </div>
        {chips.map((t, i) => (
          <Tooltip key={t} x={pts[i + 1].x + 34} y={pts[i + 1].y + 30} text={t} at={pts[i + 1].f + 4} accent={accent} />
        ))}
        <Cursor x={c.x} y={c.y} clicks={pts.slice(1).map((p) => p.f)} accent={accent} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Scroll: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const scroll = interpolate(frame, [20, 140], [0, 1], { ...clamp, easing: SMOOTH });
  const shot = sb.slot3.kind === "shot" ? sb.slot3 : null;
  const panel = spring({ frame: frame - 90, fps: 30, config: { damping: 18 } });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 100 }}>
        <Browser sb={sb} accent={accent} w={1180} h={880} url={sb.meta?.domain || sb.outro.url} scroll={scroll} />
      </div>
      <Cursor x={1080} y={560} accent={accent} />
      <div style={{ position: "absolute", left: 1370, top: 240, width: 450, opacity: panel, translate: `${(1 - panel) * 80}px 0px` }}>
        <div style={{ fontFamily: sans, fontSize: 22, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: accent }}>Keep scrolling</div>
        <div style={{ marginTop: 18, fontFamily: sans, fontWeight: 800, fontSize: fit(shot?.heading || "", 58, 900, 0.55), lineHeight: 1.1, color: INK, letterSpacing: "-0.02em" }}>{shot?.heading}</div>
        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 14 }}>
          {(shot?.chips ?? []).map((c, i) => (
            <div key={c} style={{ fontFamily: sans, fontSize: 28, color: MUTED, opacity: interpolate(frame, [110 + i * BEAT, 120 + i * BEAT], [0, 1], clamp) }}>
              <span style={{ color: accent }}>→ </span>
              {c}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Features: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const items = (sb.features ?? []).slice(0, 5);
  const shrink = interpolate(frame, [0, 24], [1, 0.62], { ...clamp, easing: SMOOTH });
  const onAccent = lum(accent) > 0.45 ? INK : "#ffffff";
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 120, top: 100, scale: String(shrink), transformOrigin: "left top" }}>
        <Browser sb={sb} accent={accent} w={1180} h={880} url={sb.meta?.domain || sb.outro.url} scroll={1} />
      </div>
      <div style={{ position: "absolute", left: 960, top: 160, fontFamily: sans, fontWeight: 800, fontSize: 64, color: INK, letterSpacing: "-0.02em" }}>{sb.tree.heading}</div>
      {items.map((it, i) => {
        const at = 16 + i * BEAT;
        const k = spring({ frame: frame - at, fps: 30, config: { damping: 14, stiffness: 200 } });
        return (
          <div key={it} style={{ position: "absolute", left: 960, top: 300 + i * 120, display: "flex", alignItems: "center", gap: 26, opacity: frame >= at ? 1 : 0.25 }}>
            <span style={{ width: 54, height: 54, borderRadius: 27, background: frame >= at ? accent : "#dde0e6", color: onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 800, fontSize: 30, scale: String(0.6 + 0.4 * k) }}>✓</span>
            <span style={{ fontFamily: sans, fontWeight: 600, fontSize: fit(it, 46, 760, 0.55), color: INK }}>{it}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Cta: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame, fps } = useScene();
  const domain = sb.meta?.domain || sb.outro.url;
  const label = `Visit ${domain}`;
  const btnW = Math.min(1300, 220 + label.length * 30);
  const clickAt = 62;
  const press = frame >= clickAt && frame < clickAt + 6 ? 0.95 : 1;
  const c = along(frame, [
    { f: 0, x: 1500, y: 980 },
    { f: 54, x: 960 + btnW * 0.2, y: 560 },
  ]);
  const inK = spring({ frame, fps, config: { damping: 18 } });
  const onAccent = lum(accent) > 0.45 ? INK : "#ffffff";
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", fontFamily: sans, fontWeight: 900, fontSize: fit(sb.title.title, 150, 1600, 0.6), letterSpacing: "-0.04em", color: INK, opacity: inK }}>{sb.title.title}</div>
      <div style={{ position: "absolute", left: 960 - btnW / 2, top: 490, width: btnW, height: 130, borderRadius: 65, background: accent, color: onAccent, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: sans, fontWeight: 700, fontSize: fit(label, 52, btnW - 100, 0.55), scale: String(press * (0.9 + 0.1 * inK)), boxShadow: `0 24px 60px ${rgba(accent, 0.45)}` }}>{label}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", fontFamily: sans, fontSize: 36, color: MUTED, opacity: interpolate(frame, [clickAt, clickAt + 14], [0, 1], clamp) }}>{sb.outro.headline}</div>
      <Cursor x={c.x} y={c.y} clicks={[clickAt]} accent={readableOn(accent, false)} />
    </AbsoluteFill>
  );
};

export const tour: StyleModule = {
  bg: BASE,
  accent: (sb) => readableOn(sb.accent, false),
  Background: ({ accent }) => <Background accent={accent} />,
  watermark: { color: INK, background: "#ffffff", font: sans, low: true },
  scenes: {
    "tour.open": Open,
    "tour.hero": Hero,
    "tour.scroll": Scroll,
    "tour.features": Features,
    "tour.cta": Cta,
  },
};
