import type React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT, fit, lum, rand, readableOn, rgba, stepped, useScene } from "../engine/common";
import { dmSerif, typewriter } from "../engine/fonts";
import type { SceneProps, StyleModule } from "../engine/types";
import { mono, sans } from "../theme";

// Editorial Collage: a printed magazine assembled by hand. Animation runs "on
// twos" (12 fps) like stop-motion, every element is a torn paper cut-out that
// lands with a little overshoot and keeps a slight hand-placed jitter, held
// down with tape or pins. Real screenshots and code are printed onto paper
// with a halftone; headlines are set in a display serif and ransom-note letters.

const PAPER = "#ebe3d3";
const INK = "#1b1a17";
const RED = "#c8402e";
const HIGHLIGHT = "#ffe24a";

const grain = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.05  0 0 0 0.18 0"/></filter><rect width="300" height="300" filter="url(#n)"/></svg>',
)}")`;
const halftone = (color: string) => `radial-gradient(circle, ${color} 1.3px, transparent 1.8px)`;

// Torn-paper outline as a clip-path polygon (seeded, so it never flickers).
const torn = (seed: string, jag = 1.6) => {
  const pts: string[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) pts.push(`${(i / steps) * 100}% ${rand(`${seed}t${i}`) * jag}%`);
  for (let i = 1; i <= steps; i++) pts.push(`${100 - rand(`${seed}r${i}`) * jag * 0.6}% ${(i / steps) * 100}%`);
  for (let i = steps - 1; i >= 0; i--) pts.push(`${(i / steps) * 100}% ${100 - rand(`${seed}b${i}`) * jag}%`);
  for (let i = steps - 1; i >= 1; i--) pts.push(`${rand(`${seed}l${i}`) * jag * 0.6}% ${(i / steps) * 100}%`);
  return `polygon(${pts.join(",")})`;
};

// A paper element placed by hand: slides in on twos, overshoots, settles,
// then keeps a faint jitter as if re-shot every few frames.
const Cutout: React.FC<{
  id: string;
  at: number;
  x: number;
  y: number;
  w: number;
  h?: number;
  rot?: number;
  from?: [number, number];
  tape?: boolean;
  tornEdge?: boolean;
  bg?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ id, at, x, y, w, h, rot = 0, from = [0, 260], tape, tornEdge = true, bg = "#f7f3ea", children, style }) => {
  const frame = stepped(useCurrentFrame(), 2);
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const k = spring({ frame: frame - at, fps, config: { damping: 11, stiffness: 120, mass: 0.8 } });
  const jitter = (rand(`${id}:${Math.floor(frame / 4)}`) - 0.5) * 0.5;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        translate: `${interpolate(k, [0, 1], [from[0], 0])}px ${interpolate(k, [0, 1], [from[1], 0])}px`,
        rotate: `${rot + interpolate(k, [0, 1], [rot > 0 ? 9 : -9, 0]) + jitter}deg`,
        filter: "drop-shadow(0 10px 14px rgba(40,30,15,0.28))",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", background: bg, clipPath: tornEdge ? torn(id) : undefined, overflow: "hidden" }}>{children}</div>
      {tape ? (
        <>
          <div style={{ position: "absolute", left: -30, top: -18, width: 130, height: 38, background: "rgba(236,226,190,0.78)", rotate: "-24deg", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
          <div style={{ position: "absolute", right: -30, top: -14, width: 120, height: 36, background: "rgba(236,226,190,0.78)", rotate: "18deg" }} />
        </>
      ) : null}
    </div>
  );
};

// Ransom-note letters: each one cut from a different page.
const Ransom: React.FC<{ text: string; at: number; size: number; accent: string; seed: string }> = ({ text, at, size, accent, seed }) => {
  const frame = stepped(useCurrentFrame(), 2);
  const faces = [dmSerif, typewriter, sans, mono];
  const grounds = [PAPER, INK, accent, "#ffffff", HIGHLIGHT];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: size * 0.08, alignItems: "center" }}>
      {[...text].map((ch, i) => {
        if (ch === " ") return <span key={i} style={{ width: size * 0.35 }} />;
        const r = rand(`${seed}${i}`);
        const bg = grounds[Math.floor(r * grounds.length)];
        const show = frame >= at + i * 2;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: show ? 1 : 0,
              fontFamily: faces[Math.floor(rand(`${seed}f${i}`) * faces.length)],
              fontWeight: 800,
              fontSize: size * (0.82 + rand(`${seed}s${i}`) * 0.3),
              lineHeight: 1,
              padding: `${size * 0.06}px ${size * 0.1}px`,
              background: bg,
              color: bg === INK || bg === accent ? "#ffffff" : INK,
              rotate: `${(r - 0.5) * 12}deg`,
              boxShadow: "0 3px 6px rgba(0,0,0,0.25)",
              textTransform: r > 0.5 ? "uppercase" : "none",
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

const Highlight: React.FC<{ children: React.ReactNode; at: number }> = ({ children, at }) => {
  const frame = stepped(useCurrentFrame(), 2);
  const k = interpolate(frame, [at, at + 14], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <span style={{ backgroundImage: `linear-gradient(transparent 55%, ${HIGHLIGHT} 55%, ${HIGHLIGHT} 92%, transparent 92%)`, backgroundSize: `${k}% 100%`, backgroundRepeat: "no-repeat" }}>{children}</span>;
};

// Only what the facts say: a licence makes it open source; a site is live (we captured it).
const stickerText = (sb: SceneProps["sb"]) => (sb.meta?.type === "site" ? "Live now" : sb.meta?.license ? `${sb.meta.license} licensed` : "Public repo");

const typed = (text: string, frame: number, at: number, cps = 1.2) => text.slice(0, Math.max(0, Math.floor((stepped(frame, 2) - at) * cps)));

// A real screenshot (site) or the real snippet (repo), printed on paper.
const Printed: React.FC<{ sb: SceneProps["sb"]; which: 2 | 3; size?: number }> = ({ sb, which, size = 26 }) => {
  const slot = which === 2 ? sb.slot2 : sb.slot3;
  if (slot.kind === "shot") {
    return (
      <>
        <Img src={slot.image} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", filter: "contrast(1.08) saturate(0.82) sepia(0.12)" }} />
        <AbsoluteFill style={{ backgroundImage: halftone(rgba(INK, 0.35)), backgroundSize: "7px 7px", mixBlendMode: "multiply", opacity: 0.45 }} />
      </>
    );
  }
  const code = sb.slot3.kind === "code" ? sb.slot3 : null;
  const text = code?.code || sb.outro.command;
  const lines = text.split("\n");
  const longest = lines.reduce((a, l) => (l.length > a.length ? l : a), "");
  // Short snippets are printed big, like a headline clipping.
  const big = Math.min(size * 2.4, fit(longest, size * 2.4, 820, 0.6), 420 / (lines.length * 1.5));
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "34px 44px", fontFamily: typewriter, fontSize: Math.max(size, big), lineHeight: 1.5, color: INK, whiteSpace: "pre" }}>
      <div style={{ fontFamily: mono, fontSize: 16, letterSpacing: "0.2em", textTransform: "uppercase", color: RED, marginBottom: 16 }}>{code?.filename || "readme"}</div>
      {text}
    </div>
  );
};

const Background: React.FC = () => (
  <AbsoluteFill style={{ background: PAPER }}>
    <AbsoluteFill style={{ backgroundImage: grain, opacity: 0.9 }} />
  </AbsoluteFill>
);

// ── Scenes ──────────────────────────────────────────────────────────────
const Cover: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const t = sb.title;
  const beats = (sb.beats ?? []).slice(0, 3);
  const mast = fit(t.title.toUpperCase(), 250, 1720, 0.62);
  return (
    <AbsoluteFill>
      <Cutout id="mast" at={0} x={90} y={40} w={1740} tornEdge={false} bg="transparent" from={[0, -200]} style={{ filter: "none" }}>
        <div style={{ fontFamily: dmSerif, fontSize: mast, lineHeight: 0.95, color: INK, letterSpacing: "-0.01em" }}>{t.title.toUpperCase()}</div>
      </Cutout>
      <div style={{ position: "absolute", left: 90, right: 90, top: 70 + mast, borderTop: `6px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, height: 10, opacity: frame >= 8 ? 1 : 0 }} />
      <div style={{ position: "absolute", left: 90, top: 100 + mast, fontFamily: typewriter, fontSize: 26, color: INK, letterSpacing: "0.04em" }}>
        {typed(`Issue 01 · ${sb.meta?.domain || sb.outro.url} · ${t.tag}`, frame, 10, 2.4)}
      </div>
      <Cutout id="cover-img" at={16} x={90} y={250 + mast} w={1000} h={Math.max(380, 900 - mast - 260)} rot={-2.2} tape from={[-300, 200]}>
        <Printed sb={sb} which={sb.slot2.kind === "shot" ? 2 : 3} size={30} />
      </Cutout>
      {beats.map((b, i) => (
        <Cutout key={i} id={`line${i}`} at={36 + i * BEAT} x={1180} y={260 + mast + i * 160} w={660} rot={i % 2 ? 1.6 : -1.2} from={[300, 0]}>
          <div style={{ padding: "18px 26px", fontFamily: dmSerif, fontSize: fit(b, 64, 600, 0.5), lineHeight: 1.05, color: INK }}>{i === 0 ? <Highlight at={50}>{b}</Highlight> : b}</div>
        </Cutout>
      ))}
      <Cutout id="sticker" at={70} x={880} y={170 + mast} w={230} h={230} rot={12} tornEdge={false} bg={accent} from={[0, -300]} style={{ borderRadius: "50%" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: sans, fontWeight: 900, fontSize: 38, lineHeight: 1, color: lum(accent) > 0.4 ? INK : "#ffffff", textTransform: "uppercase", padding: 20 }}>
          {stickerText(sb)}
        </div>
      </Cutout>
    </AbsoluteFill>
  );
};

const Spread: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const quote = sb.title.caption || sb.explainer?.answer || "";
  const feats = (sb.features ?? []).slice(0, 3);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, transparent 47%, rgba(60,40,10,0.14) 50%, transparent 53%)" }} />
      <div style={{ position: "absolute", left: 110, top: 120, fontFamily: typewriter, fontSize: 26, color: RED, letterSpacing: "0.06em" }}>{typed("In this issue —", frame, 0, 2)}</div>
      <div style={{ position: "absolute", left: 90, top: 150, fontFamily: dmSerif, fontSize: 260, lineHeight: 1, color: accent, opacity: frame >= 6 ? 1 : 0 }}>“</div>
      <Cutout id="quote" at={8} x={110} y={330} w={760} tornEdge={false} bg="transparent" from={[0, 120]} style={{ filter: "none" }}>
        <div style={{ fontFamily: dmSerif, fontSize: fit(quote, 92, 760 * 2.6, 0.48), lineHeight: 1.08, color: INK }}>{quote}</div>
      </Cutout>
      <div style={{ position: "absolute", left: 110, top: 880, fontFamily: typewriter, fontSize: 24, color: INK, opacity: frame >= 40 ? 1 : 0 }}>— {sb.title.title}, in one line</div>
      <Cutout id="spread-img" at={20} x={1010} y={110} w={820} h={500} rot={2.4} tape from={[400, -100]}>
        <Printed sb={sb} which={3} size={24} />
      </Cutout>
      {feats.map((f, i) => (
        <Cutout key={f} id={`label${i}`} at={60 + i * BEAT} x={1040 + (i % 2) * 120} y={680 + i * 96} w={Math.min(700, 120 + f.length * 26)} rot={(i - 1) * 2.5} tornEdge={false} bg={INK} from={[500, 0]}>
          <div style={{ padding: "14px 26px", fontFamily: mono, fontWeight: 500, fontSize: 34, letterSpacing: "0.12em", textTransform: "uppercase", color: "#f5f1e6", whiteSpace: "nowrap" }}>{f}</div>
        </Cutout>
      ))}
    </AbsoluteFill>
  );
};

const Quote: React.FC<SceneProps> = ({ sb, accent }) => {
  const problem = sb.explainer?.problem || "";
  // A clipped answer reads badly as a pull quote: use the tagline instead.
  const answer = sb.explainer?.answer && !sb.explainer.answer.endsWith("…") ? sb.explainer.answer : sb.title.caption;
  return (
    <AbsoluteFill>
      {problem ? (
        <Cutout id="problem" at={2} x={160} y={170} w={1600} tornEdge={false} bg="transparent" from={[0, -80]} style={{ filter: "none" }}>
          <div style={{ fontFamily: typewriter, fontSize: fit(problem, 50, 1600, 0.55), color: rgba(INK, 0.7), textDecoration: `line-through ${RED} 4px` }}>{problem}</div>
        </Cutout>
      ) : null}
      <Cutout id="answer" at={24} x={160} y={340} w={1600} rot={-1} bg="#fbf8f0" from={[0, 300]}>
        <div style={{ padding: "54px 70px", fontFamily: dmSerif, fontSize: fit(answer, 120, 1460 * 1.9, 0.5), lineHeight: 1.08, color: INK }}>
          <Highlight at={44}>{answer}</Highlight>
        </div>
      </Cutout>
      <Cutout id="pin" at={60} x={1660} y={300} w={70} h={70} tornEdge={false} bg={accent} from={[0, -200]} style={{ borderRadius: "50%" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.7), ${accent} 45%)` }} />
      </Cutout>
    </AbsoluteFill>
  );
};

const Board: React.FC<SceneProps> = ({ sb, accent }) => {
  const feats = (sb.features ?? []).slice(0, 6);
  const pins = [accent, RED, "#2f6db5", "#f0b52b"];
  return (
    <AbsoluteFill style={{ background: "#c49a6c" }}>
      <AbsoluteFill style={{ backgroundImage: grain, opacity: 1, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ backgroundImage: halftone("rgba(80,50,20,0.25)"), backgroundSize: "5px 5px" }} />
      <div style={{ position: "absolute", left: 110, top: 80 }}>
        <Ransom text={sb.tree.heading.replace(/\.$/, "")} at={0} size={86} accent={accent} seed="board" />
      </div>
      {feats.map((f, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return (
          <Cutout key={f} id={`clip${i}`} at={20 + i * BEAT} x={130 + col * 570 + (row ? 60 : 0)} y={330 + row * 300 + rand(`y${i}`) * 40} w={500} rot={(rand(`r${i}`) - 0.5) * 9} from={[0, -400]}>
            <div style={{ padding: "40px 38px 34px", fontFamily: typewriter, fontSize: fit(f, 46, 430, 0.56), lineHeight: 1.2, color: INK }}>
              <div style={{ fontFamily: mono, fontSize: 18, color: RED, letterSpacing: "0.2em", marginBottom: 10 }}>№ {String(i + 1).padStart(2, "0")}</div>
              {f}
            </div>
            <div style={{ position: "absolute", left: "50%", top: 8, width: 30, height: 30, marginLeft: -15, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75), ${pins[i % pins.length]} 50%)`, boxShadow: "0 3px 4px rgba(0,0,0,0.35)" }} />
          </Cutout>
        );
      })}
    </AbsoluteFill>
  );
};

const Back: React.FC<SceneProps> = ({ sb, accent }) => {
  const { frame } = useScene();
  const isRepo = sb.meta?.type !== "site";
  const cmd = isRepo ? sb.outro.command : sb.outro.url;
  const bars = Array.from({ length: 46 }, (_, i) => 2 + Math.floor(rand(`${sb.title.title}bar${i}`) * 4) * 2);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 150 }}>
        <Ransom text={sb.title.title} at={0} size={170} accent={accent} seed={sb.title.title} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 430, fontFamily: dmSerif, fontSize: 84, color: INK, opacity: frame >= 20 ? 1 : 0 }}>{sb.outro.headline}</div>
      <Cutout id="cmd" at={30} x={110} y={590} w={Math.min(1300, 200 + cmd.length * 30)} rot={-1.5} bg="#fbf8f0" from={[0, 200]}>
        <div style={{ padding: "26px 40px", fontFamily: typewriter, fontSize: fit(cmd, 48, 1200, 0.6), color: INK, whiteSpace: "nowrap" }}>
          {isRepo ? <span style={{ color: RED }}>$ </span> : null}
          {typed(cmd, frame, 34, 1.6)}
        </div>
      </Cutout>
      <Cutout id="barcode" at={44} x={1440} y={760} w={380} h={220} rot={0} tornEdge={false} bg="#ffffff" from={[300, 0]}>
        <div style={{ display: "flex", gap: 3, height: 140, padding: "26px 30px 6px" }}>
          {bars.map((w, i) => (
            <div key={i} style={{ width: w, background: i % 2 ? "transparent" : INK }} />
          ))}
        </div>
        <div style={{ textAlign: "center", fontFamily: mono, fontSize: 18, color: INK, letterSpacing: "0.12em" }}>{sb.outro.url}</div>
      </Cutout>
      <div style={{ position: "absolute", left: 1100, top: 300, padding: "14px 26px", border: `4px solid ${RED}`, color: RED, fontFamily: typewriter, fontSize: 44, rotate: "-9deg", opacity: frame >= 60 ? 0.85 : 0, textTransform: "uppercase" }}>{stickerText(sb)}</div>
    </AbsoluteFill>
  );
};

export const collage: StyleModule = {
  bg: PAPER,
  accent: (sb) => readableOn(sb.accent, false),
  Background: () => <Background />,
  watermark: { color: INK, background: "#f7f3ea", font: typewriter, low: true },
  scenes: {
    "collage.cover": Cover,
    "collage.spread": Spread,
    "collage.quote": Quote,
    "collage.board": Board,
    "collage.back": Back,
  },
};
