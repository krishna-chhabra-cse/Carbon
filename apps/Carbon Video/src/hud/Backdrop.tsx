import type React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { alpha, BAR, BEAT, beatPulse, hud } from "./hud";

// Animated backgrounds (behind the scenes) and overlays (in front) for the
// Glass, Terminal, Kinetic and Aurora styles. Everything is driven by the
// absolute frame, so it flows across cuts. HUD / Paper / Bold draw nothing.

// Glass: night gradient lit by three slowly orbiting color blobs that
// brighten on the beat, plus one soft diagonal light streak.
const Glass: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const p = beatPulse(frame, BEAT, 4);
  const [a, b, c] = hud.tint;
  const blob = (color: string, x: number, y: number, r: number, k: number): React.CSSProperties => ({
    position: "absolute",
    left: x - r,
    top: y - r,
    width: r * 2,
    height: r * 2,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${alpha(color, 0.55 + 0.15 * p * k)} 0%, ${alpha(color, 0)} 68%)`,
  });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(160deg, #0b0c26 0%, #06061a 55%, #0a0618 100%)", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: "blur(40px)" }}>
        <div style={blob(a, 1450 + 160 * Math.sin(t * 0.35), 260 + 90 * Math.cos(t * 0.28), 620, 1)} />
        <div style={blob(b, 380 + 140 * Math.cos(t * 0.3), 880 + 70 * Math.sin(t * 0.4), 560, 0.6)} />
        <div style={blob(c, 980 + 220 * Math.sin(t * 0.22 + 2), 560 + 120 * Math.cos(t * 0.33), 480, 0.4)} />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: -400 + ((frame * 3) % 2900),
          top: -300,
          width: 260,
          height: 1700,
          rotate: "24deg",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
        }}
      />
    </AbsoluteFill>
  );
};

// Aurora: soft pastel curtains drifting over a pale lilac page.
const Aurora: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const [a, b, c, d] = hud.tint;
  const curtain = (color: string, i: number): React.CSSProperties => ({
    position: "absolute",
    left: -300 + i * 520 + 120 * Math.sin(t * 0.25 + i * 1.7),
    top: -200 + 80 * Math.cos(t * 0.3 + i),
    width: 900,
    height: 1500,
    borderRadius: "50%",
    rotate: `${-18 + 10 * Math.sin(t * 0.2 + i * 2)}deg`,
    background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${color} 0%, ${alpha(color, 0)} 70%)`,
    opacity: 0.85,
  });
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #fbf9ff 0%, #f4effb 100%)", overflow: "hidden" }}>
      <AbsoluteFill style={{ filter: "blur(70px) saturate(1.2)" }}>
        {[a, b, c, d].map((col, i) => (
          <div key={i} style={curtain(col, i)} />
        ))}
      </AbsoluteFill>
      {/* white haze so text always sits on a light surface */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255,255,255,0.55), rgba(255,255,255,0.15) 70%)" }} />
    </AbsoluteFill>
  );
};

// Terminal: a dark tube with a phosphor bloom and a faint character grid.
const Terminal: React.FC = () => {
  const p = hud.tint[0];
  return (
    <AbsoluteFill
      style={{
        backgroundColor: hud.bg,
        backgroundImage: `radial-gradient(ellipse 60% 55% at 50% 50%, ${alpha(p, 0.1)}, transparent 75%), linear-gradient(${alpha(p, 0.035)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(p, 0.035)} 1px, transparent 1px)`,
        backgroundSize: "100% 100%, 48px 48px, 48px 48px",
      }}
    />
  );
};

// Kinetic: three rows of giant outlined title text sliding in opposite
// directions, kicked forward on every beat.
const Kinetic: React.FC<{ title: string }> = ({ title }) => {
  const frame = useCurrentFrame();
  const beats = Math.floor(frame / BEAT);
  const into = (frame % BEAT) / BEAT;
  // Moves mostly in a fast burst right after each beat.
  const travel = beats + 1 - Math.exp(-into * 6);
  const word = `${title.toUpperCase()} ✦ `.repeat(8);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.bg, overflow: "hidden" }}>
      {[0, 1, 2].map((row) => {
        const dir = row % 2 ? 1 : -1;
        const x = -3000 + dir * travel * 60 - row * 400;
        return (
          <div
            key={row}
            style={{
              position: "absolute",
              top: 40 + row * 340,
              left: x,
              whiteSpace: "nowrap",
              fontFamily: hud.display,
              fontWeight: 900,
              fontSize: 300,
              lineHeight: 1,
              color: "transparent",
              WebkitTextStroke: `2px ${row === 1 ? alpha(hud.tint[0], 0.16) : "rgba(255,255,255,0.07)"}`,
            }}
          >
            {word}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Backdrop: React.FC<{ title: string }> = ({ title }) => {
  if (hud.backdrop === "glass") return <Glass />;
  if (hud.backdrop === "aurora") return <Aurora />;
  if (hud.backdrop === "terminal") return <Terminal />;
  if (hud.backdrop === "kinetic") return <Kinetic title={title} />;
  return null;
};

// Terminal: scanlines, a rolling refresh band and a slight flicker, on top
// of everything (drawn by HudChrome).
export const Overlay: React.FC = () => {
  const frame = useCurrentFrame();
  if (hud.backdrop !== "terminal") return null;
  const roll = ((frame % BAR) / BAR) * 1400 - 200;
  const flicker = 0.04 * random(`flicker-${frame}`);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0px, rgba(0,0,0,0.32) 2px, transparent 2px, transparent 4px)" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: roll,
          height: 140,
          background: `linear-gradient(180deg, transparent, ${alpha(hud.tint[0], 0.06)}, transparent)`,
        }}
      />
      <AbsoluteFill style={{ backgroundColor: "black", opacity: flicker }} />
      {/* rounded tube corners */}
      <AbsoluteFill style={{ boxShadow: "inset 0 0 160px 40px rgba(0,0,0,0.9)", borderRadius: 60 }} />
    </AbsoluteFill>
  );
};

// Kinetic whip pan: the outgoing scene smears off to the left over the last
// 6 frames before a cut, the next one smears in from the right.
export const whipAt = (frame: number, cuts: number[]) => {
  if (!hud.whip) return { x: 0, blur: 0 };
  for (const c of cuts) {
    const d = frame - c;
    if (d >= -6 && d < 0) {
      const k = interpolate(d, [-6, -1], [0, 1]) ** 2;
      return { x: -k * 760, blur: k * 60 };
    }
    if (d >= 0 && d < 7) {
      const k = interpolate(d, [0, 6], [1, 0]) ** 2;
      return { x: k * 760, blur: k * 60 };
    }
  }
  return { x: 0, blur: 0 };
};
