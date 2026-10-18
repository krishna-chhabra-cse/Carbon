import type React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, clamp, fit, lum, ramp, safeHex, useScene } from "../engine/common";
import type { SceneProps, StyleModule } from "../engine/types";
import { mono, sans } from "../theme";

// Swiss Poster: international-style kinetic typography. A strict 12-column
// grid, giant grotesk words rising out of masks on the beat, three ground
// colours (black, paper, the product's accent) and a hard cut every two to
// four beats. Nothing glows, nothing floats: type and colour do the work.

const BLACK = "#0e0e0e";
const PAPER = "#efeee9";
const GRID_X = (col: number) => 80 + col * 146.67; // 12 columns across 1760 px

const inkOn = (bg: string) => (lum(bg) > 0.4 ? BLACK : "#ffffff");

// Characters rise out of a mask one after another.
const Rise: React.FC<{ text: string; at: number; step?: number; size: number; color: string; weight?: number; tracking?: string; style?: React.CSSProperties }> = ({ text, at, step = 2, size, color, weight = 900, tracking = "-0.055em", style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ overflow: "hidden", lineHeight: 0.92, paddingBottom: size * 0.06, fontFamily: sans, fontWeight: weight, fontSize: size, letterSpacing: tracking, color, whiteSpace: "pre", ...style }}>
      {[...text].map((ch, i) => {
        const k = spring({ frame: frame - at - i * step, fps, config: { damping: 18, stiffness: 260, mass: 0.6 } });
        return (
          <span key={i} style={{ display: "inline-block", translate: `0px ${interpolate(k, [0, 1], [105, 0])}%` }}>
            {ch === " " ? " " : ch}
          </span>
        );
      })}
    </div>
  );
};

const Meta: React.FC<{ children: React.ReactNode; color: string; style?: React.CSSProperties }> = ({ children, color, style }) => (
  <div style={{ position: "absolute", fontFamily: mono, fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase", color, ...style }}>{children}</div>
);

const Index: React.FC<{ index: number; total: number; color: string }> = ({ index, total, color }) => (
  <Meta color={color} style={{ left: 80, top: 60 }}>
    {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
  </Meta>
);

// Split a phrase into lines of at most `max` characters.
const lines = (text: string, max: number) => {
  const out: string[] = [];
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && `${last} ${w}`.length <= max) out[out.length - 1] = `${last} ${w}`;
    else out.push(w);
  }
  return out;
};

const beatsOf = (sb: SceneProps["sb"]) => {
  const b = (sb.beats ?? []).filter(Boolean);
  return b.length ? b : (sb.features ?? []).slice(0, 3);
};

// ── Scenes ──────────────────────────────────────────────────────────────
const Name: React.FC<SceneProps> = ({ sb, accent, index, total }) => {
  const { frame } = useScene();
  const t = sb.title.title;
  const size = fit(t, 420, 1760, 0.56);
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <Index index={index} total={total} color="#ffffff" />
      <Meta color="#ffffff" style={{ right: 80, top: 60 }}>
        {sb.meta?.domain || sb.outro.url}
      </Meta>
      <div style={{ position: "absolute", left: 70, bottom: 170 }}>
        <Rise text={t} at={4} size={size} color="#ffffff" />
      </div>
      <div style={{ position: "absolute", left: 80, bottom: 120, height: 22, width: 1760 * ramp(frame, 44, 14), background: accent }} />
    </AbsoluteFill>
  );
};

const Word: React.FC<SceneProps> = ({ sb, accent, index, total, params }) => {
  const i = Number(params.i ?? 0);
  const words = beatsOf(sb);
  const text = words[i % Math.max(1, words.length)] || sb.title.title;
  const bg = [accent, PAPER, BLACK][i % 3];
  const ink = inkOn(bg);
  const ls = lines(text, i === 1 ? 9 : 14);
  const size = Math.min(fit(ls.reduce((a, l) => (l.length > a.length ? l : a), ""), 330, 1760, 0.56), 900 / Math.max(1, ls.length));
  const place: React.CSSProperties[] = [
    { left: 70, bottom: 90 },
    { left: 0, right: 0, top: 540 - (ls.length * size * 0.95) / 2, display: "flex", flexDirection: "column", alignItems: "center" },
    { right: 80, top: 150, display: "flex", flexDirection: "column", alignItems: "flex-end" },
  ];
  return (
    <AbsoluteFill style={{ background: bg }}>
      <Index index={index} total={total} color={ink} />
      <div style={{ position: "absolute", ...place[i % 3] }}>
        {ls.map((l, j) => (
          <Rise key={j} text={l} at={2 + j * 6} step={1} size={size} color={ink} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Tagline: React.FC<SceneProps> = ({ sb, accent, index, total }) => {
  const { frame } = useScene();
  const ls = lines(sb.title.caption || sb.title.title, 18);
  const size = Math.min(fit(ls.reduce((a, l) => (l.length > a.length ? l : a), ""), 170, 1200, 0.55), 760 / Math.max(1, ls.length));
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Index index={index} total={total} color={BLACK} />
      <div style={{ position: "absolute", left: 70, top: 200 }}>
        {ls.map((l, j) => (
          <Rise key={j} text={l} at={4 + j * BEAT} step={1} size={size} color={j === ls.length - 1 ? accent : BLACK} />
        ))}
      </div>
      <div style={{ position: "absolute", left: GRID_X(9), top: 200, width: 3, height: 680 * ramp(frame, 0, 20), background: BLACK }} />
      <Meta color={BLACK} style={{ left: GRID_X(9) + 30, top: 200, lineHeight: 1.7, opacity: ramp(frame, 20, 10) }}>
        {sb.title.tag}
        <br />
        {sb.meta?.domain || sb.outro.url}
      </Meta>
    </AbsoluteFill>
  );
};

const List: React.FC<SceneProps> = ({ sb, accent, index, total }) => {
  const { frame } = useScene();
  const items = (sb.features ?? []).slice(0, 6);
  const per = BEAT * 1.5;
  const active = Math.min(items.length - 1, Math.floor(Math.max(0, frame - 6) / per));
  const size = Math.min(96, 760 / Math.max(1, items.length));
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <Index index={index} total={total} color="#ffffff" />
      <Meta color="#ffffff" style={{ left: GRID_X(0), top: 140, opacity: 0.6 }}>
        {sb.tree.heading}
      </Meta>
      <div style={{ position: "absolute", left: GRID_X(0), top: 200, display: "flex", flexDirection: "column", gap: size * 0.12 }}>
        {items.map((f, i) =>
          frame >= 6 + i * per ? (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 30 }}>
              <span style={{ fontFamily: mono, fontSize: size * 0.32, color: i === active ? accent : "rgba(255,255,255,0.4)" }}>{String(i + 1).padStart(2, "0")}</span>
              <Rise text={f} at={6 + i * per} step={1} size={fit(f, size, 1150, 0.56)} color={i === active ? accent : "rgba(255,255,255,0.42)"} />
            </div>
          ) : null,
        )}
      </div>
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: 40,
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 520,
          lineHeight: 0.8,
          letterSpacing: "-0.06em",
          color: "transparent",
          WebkitTextStroke: `3px ${accent}`,
        }}
      >
        {String(Math.max(1, active + 1)).padStart(2, "0")}
      </div>
    </AbsoluteFill>
  );
};

const Figure: React.FC<SceneProps> = ({ sb, accent, index, total }) => {
  const { frame } = useScene();
  const stat = sb.slot2.kind === "stat" ? sb.slot2 : null;
  if (stat) {
    const ink = inkOn(accent);
    const v = Math.round(stat.value * interpolate(frame, [4, 40], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 4 }));
    const text = `${v}${stat.suffix}`;
    return (
      <AbsoluteFill style={{ background: accent }}>
        <Index index={index} total={total} color={ink} />
        <div style={{ position: "absolute", left: 60, top: 150, fontFamily: sans, fontWeight: 900, fontSize: fit(`${stat.value}${stat.suffix}`, 560, 1780, 0.6), lineHeight: 0.86, letterSpacing: "-0.07em", color: ink, fontVariantNumeric: "tabular-nums" }}>
          {text}
        </div>
        <div style={{ position: "absolute", left: 80, bottom: 110 }}>
          <Rise text={stat.unit} at={30} step={1} size={fit(stat.unit, 90, 1700, 0.55)} color={ink} weight={800} />
        </div>
        <Meta color={ink} style={{ right: 80, top: 60 }}>
          {stat.note}
        </Meta>
      </AbsoluteFill>
    );
  }
  const shot = sb.slot2.kind === "shot" ? sb.slot2 : null;
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      {shot ? (
        <AbsoluteFill style={{ scale: String(interpolate(frame, [0, 120], [1.08, 1], clamp)) }}>
          <Img src={shot.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", filter: "grayscale(1) contrast(1.25)" }} />
          <AbsoluteFill style={{ background: accent, mixBlendMode: "multiply" }} />
        </AbsoluteFill>
      ) : null}
      <Index index={index} total={total} color="#ffffff" />
      <div style={{ position: "absolute", left: 80, bottom: 90, background: BLACK, padding: "18px 26px 8px" }}>
        <Rise text={shot?.heading || sb.title.caption} at={10} step={1} size={fit(shot?.heading || sb.title.caption, 96, 1500, 0.55)} color="#ffffff" weight={800} />
      </div>
    </AbsoluteFill>
  );
};

const Command: React.FC<SceneProps> = ({ sb, accent, index, total }) => {
  const { frame } = useScene();
  const isRepo = sb.meta?.type !== "site";
  const cmd = isRepo ? sb.outro.command : sb.outro.url;
  const shown = cmd.slice(0, Math.max(0, Math.floor((frame - 12) * 1.3)));
  const cursorOn = Math.floor(frame / (BEAT / 2)) % 2 === 0;
  const size = fit(cmd, 80, 1500, 0.6);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Index index={index} total={total} color={BLACK} />
      <div style={{ position: "absolute", left: 70, top: 260 }}>
        <Rise text={isRepo ? "Get it." : "See it."} at={0} size={200} color={BLACK} />
      </div>
      <div style={{ position: "absolute", left: 80, top: 560, right: 80, height: 200, background: BLACK, display: "flex", alignItems: "center", padding: "0 50px", clipPath: `inset(0 ${(1 - ramp(frame, -2, 8)) * 100}% 0 0)` }}>
        <span style={{ fontFamily: mono, fontSize: size, color: accent, marginRight: 26 }}>{isRepo ? "$" : "→"}</span>
        <span style={{ fontFamily: mono, fontSize: size, color: "#ffffff", whiteSpace: "pre" }}>{shown}</span>
        <span style={{ width: size * 0.55, height: size * 1.05, background: cursorOn ? accent : "transparent", marginLeft: 6 }} />
      </div>
    </AbsoluteFill>
  );
};

const End: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const t = sb.title.title;
  const pulse = Math.exp(-((frame % BEAT) / BEAT) * 5);
  return (
    <AbsoluteFill style={{ background: BLACK }}>
      {Array.from({ length: 13 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: GRID_X(i), top: 0, width: 1, height: 1080 * ramp(frame, i, 18), background: "rgba(255,255,255,0.14)" }} />
      ))}
      <div style={{ position: "absolute", left: 70, bottom: 100 }}>
        <Rise text={t} at={6} size={fit(t, 340, 1500, 0.56)} color="#ffffff" />
      </div>
      <div style={{ position: "absolute", right: 80, bottom: 120, width: 120, height: 120, background: accent, scale: String(1 + 0.12 * pulse) }} />
      <Meta color="#ffffff" style={{ right: 80, top: 60 }}>
        {sb.outro.url}
      </Meta>
      <Meta color={accent} style={{ left: 80, top: 60 }}>
        {sb.outro.headline}
      </Meta>
    </AbsoluteFill>
  );
};

export const poster: StyleModule = {
  bg: BLACK,
  // The accent becomes a full-screen ground, so keep the product's own colour.
  accent: (sb) => safeHex(sb.accent),
  watermark: { color: "#ffffff", background: BLACK, font: mono },
  scenes: {
    "poster.name": Name,
    "poster.word": Word,
    "poster.tagline": Tagline,
    "poster.list": List,
    "poster.figure": Figure,
    "poster.command": Command,
    "poster.end": End,
  },
};
