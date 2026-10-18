import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { accentGlow, BEAT, fitDisplay, hud } from "./hud";

// Small building blocks shared by the alternative scene layouts in
// ./variants. Everything reads colors and fonts from `hud`, so every layout
// works in every style.

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Entrance used by most elements: rise + fade + a touch of blur, never a pop.
export const useEnter = (delay = 0, damping = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
};
export const enterStyle = (k: number, dy = 24): React.CSSProperties => ({
  opacity: k,
  translate: `0px ${interpolate(k, [0, 1], [dy, 0])}px`,
  filter: k < 0.99 ? `blur(${(1 - k) * 8}px)` : undefined,
});

export const Kicker: React.FC<{ children: React.ReactNode; color: string; style?: React.CSSProperties }> = ({ children, color, style }) => (
  <div style={{ fontFamily: hud.mono, fontSize: 22, letterSpacing: "0.16em", color, textTransform: "uppercase", ...style }}>{children}</div>
);

export const Display: React.FC<{ text: string; base: number; maxWidth: number; style?: React.CSSProperties; charW?: number }> = ({ text, base, maxWidth, style, charW = 0.58 }) => (
  <div
    style={{
      fontFamily: hud.display,
      fontWeight: hud.displayWeight,
      textTransform: hud.displayCase,
      fontSize: fitDisplay(text, base, maxWidth, charW),
      letterSpacing: hud.displayTracking,
      lineHeight: 1.02,
      textShadow: hud.glow,
      ...style,
    }}
  >
    {text}
  </div>
);

// A pill/chip that lands on a beat.
export const Chip: React.FC<{ text: string; at: number; accent: string; size?: number }> = ({ text, at, accent, size = 28 }) => {
  const k = useEnter(at, 16);
  return (
    <div
      style={{
        ...enterStyle(k, 18),
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 22px",
        borderRadius: Math.min(999, hud.radius * 2 + 2),
        border: `1.5px solid ${hud.faint}`,
        background: hud.panel,
        fontFamily: hud.mono,
        fontSize: size,
        color: hud.white,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: hud.radius ? 5 : 0, background: accent, boxShadow: accentGlow(accent) }} />
      {text}
    </div>
  );
};

// The closing packshot: wordmark lands on the final hit, then the rule and CTA.
export const EndCard: React.FC<{ title: string; command: string; url: string; accent: string; at: number }> = ({ title, command, url, accent, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at) return null;
  const end = spring({ frame: frame - at, fps, config: { damping: 18, stiffness: 160 } });
  const rule = interpolate(frame, [at, at + 24], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Display text={title} base={280} maxWidth={1700} charW={0.62} style={{ letterSpacing: hud.titleTracking, lineHeight: 1, scale: interpolate(end, [0, 1], [1.18, 1]) }} />
      <div style={{ width: 1100 * rule, height: 1, background: accent, marginTop: 40, boxShadow: accentGlow(accent) }} />
      <div style={{ display: "flex", gap: 60, marginTop: 34, fontFamily: hud.mono, fontSize: 30, letterSpacing: "0.06em", opacity: rule }}>
        {command && command !== url ? <span style={{ color: accent }}>$ {command}</span> : null}
        <span style={{ color: command && command !== url ? hud.dim : accent }}>{url}</span>
      </div>
    </div>
  );
};

// Index of the current beat inside a scene, and how far into it we are (0–1).
export const useBeat = () => {
  const frame = useCurrentFrame();
  return { index: Math.floor(frame / BEAT), phase: (frame % BEAT) / BEAT, frame };
};
