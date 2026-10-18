import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { accentGlow, BEAT, beatPulse, fitDisplay, hud } from "../hud";
import { clamp, Display, EndCard, enterStyle, Kicker, useEnter } from "../kit";

// Scenes for the non-launch video types (explainer, kinetic, numbers) and the
// short cut's end card. Same rules as the other layouts: colors and fonts from
// `hud`, motion on the 90 BPM beat grid.

const ease = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

// Explainer opener: the customer's problem, word by word, then one line of
// detail. Ends with an accent wipe that hands over to the answer.
export const ProblemScene: React.FC<{ problem: string; detail: string; accentColor: string }> = ({ problem, detail, accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const words = problem.split(" ").filter(Boolean);
  const step = Math.max(2, Math.min(6, Math.floor((durationInFrames * 0.45) / Math.max(1, words.length))));
  const detailAt = Math.min(durationInFrames - 30, words.length * step + 10);
  const wipe = interpolate(frame, [durationInFrames - 14, durationInFrames], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <div style={{ position: "absolute", left: 160, right: 160, top: 250 }}>
        <Kicker color={accentColor}>The problem</Kicker>
        <div style={{ marginTop: 26, display: "flex", flexWrap: "wrap", gap: "0 0.28em", fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, letterSpacing: hud.displayTracking, lineHeight: 1.06, fontSize: fitDisplay(problem, 120, 1600 * 2, 0.56) }}>
          {words.map((w, i) => (
            <span key={i} style={{ ...enterStyle(ease(frame, i * step, 8), 30), textShadow: hud.glow }}>{w}</span>
          ))}
        </div>
        <div style={{ marginTop: 40, fontFamily: hud.sans, fontSize: 40, color: hud.mid, maxWidth: 1400, ...enterStyle(ease(frame, detailAt, 12)) }}>{detail}</div>
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${wipe * 100}%`, background: accentColor }} />
    </AbsoluteFill>
  );
};

// Explainer core: three numbered steps, each lit for an equal share of the
// scene, joined by a line that draws from one to the next.
export const StepsScene: React.FC<{ steps: { title: string; detail: string }[]; accentColor: string }> = ({ steps, accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const items = steps.slice(0, 3);
  const beats = Math.floor(durationInFrames / BEAT);
  const per = Math.max(1, Math.floor((beats - 1) / Math.max(1, items.length))) * BEAT;
  const active = Math.min(items.length - 1, Math.floor(Math.max(0, frame - BEAT) / per));
  const headIn = useEnter(0);
  const colW = 1600 / Math.max(1, items.length);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <Kicker color={accentColor} style={{ position: "absolute", left: 160, top: 170, ...enterStyle(headIn) }}>How it works</Kicker>
      <div style={{ position: "absolute", left: 160, right: 160, top: 300, height: 4, background: hud.faint }}>
        <div style={{ width: `${interpolate(frame, [BEAT, BEAT + per * items.length], [0, 100], clamp)}%`, height: "100%", background: accentColor, boxShadow: accentGlow(accentColor) }} />
      </div>
      {items.map((s, i) => {
        const at = BEAT + i * per;
        const k = ease(frame, at, 12);
        const on = i === active;
        return (
          <div key={i} style={{ position: "absolute", left: 160 + i * colW, top: 270, width: colW - 60, ...enterStyle(k, 40) }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: hud.radius ? 32 : 0,
                background: on ? accentColor : hud.panel,
                border: `2px solid ${on ? accentColor : hud.faint}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: hud.mono,
                fontSize: 26,
                color: on ? hud.bg : hud.dim,
                scale: on ? 1 + 0.08 * beatPulse(frame - at) : 1,
              }}
            >
              {i + 1}
            </div>
            <div style={{ marginTop: 50, fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, letterSpacing: hud.displayTracking, lineHeight: 1.04, fontSize: fitDisplay(s.title, 72, colW - 60, 0.56), opacity: on ? 1 : 0.55 }}>{s.title}</div>
            <div style={{ marginTop: 22, fontFamily: hud.sans, fontSize: 30, lineHeight: 1.35, color: on ? hud.mid : hud.dim }}>{s.detail}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Numbers: up to four real figures count up one after another on the beats.
export const NumbersScene: React.FC<{ items: { value: number; suffix: string; label: string }[]; heading: string; accentColor: string }> = ({ items, heading, accentColor }) => {
  const frame = useCurrentFrame();
  const list = items.slice(0, 4);
  const headIn = useEnter(0);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <div style={{ position: "absolute", left: 160, top: 150, ...enterStyle(headIn) }}>
        <Kicker color={accentColor}>By the numbers</Kicker>
        <Display text={heading} base={70} maxWidth={1600} style={{ marginTop: 12 }} />
      </div>
      <div style={{ position: "absolute", left: 160, right: 160, top: 420, display: "grid", gridTemplateColumns: `repeat(${Math.max(1, list.length)}, 1fr)`, gap: 40 }}>
        {list.map((n, i) => {
          const at = BEAT + i * BEAT * 1.5;
          const k = ease(frame, at, 10);
          const count = Math.round(interpolate(frame, [at, at + 30], [0, n.value], { ...clamp, easing: Easing.out(Easing.cubic) }));
          return (
            <div key={n.label} style={{ ...enterStyle(k, 40), borderTop: `3px solid ${i === 0 ? accentColor : hud.faint}`, paddingTop: 30 }}>
              <div style={{ fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, fontVariantNumeric: "tabular-nums", letterSpacing: hud.displayTracking, lineHeight: 1, fontSize: fitDisplay(`${n.value}${n.suffix}`, 150, 1500 / Math.max(1, list.length), 0.62), color: i === 0 ? accentColor : hud.white, textShadow: hud.glow }}>
                {count}
                {n.suffix}
              </div>
              <div style={{ marginTop: 18, fontFamily: hud.mono, fontSize: 24, letterSpacing: "0.1em", textTransform: "uppercase", color: hud.dim }}>{n.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 160, bottom: 140, fontFamily: hud.mono, fontSize: 20, letterSpacing: "0.1em", color: hud.dim, textTransform: "uppercase" }}>live from the github api</div>
    </AbsoluteFill>
  );
};

// Kinetic statement: the tagline slams in one word per half-beat, stacked
// two or three words a line; the last word takes the accent.
export const StatementScene: React.FC<{ text: string; accentColor: string }> = ({ text, accentColor }) => {
  const frame = useCurrentFrame();
  const words = text.replace(/[.!]$/, "").split(" ").filter(Boolean).slice(0, 9);
  const perLine = words.length > 6 ? 3 : 2;
  const lines: string[][] = [];
  for (let i = 0; i < words.length; i += perLine) lines.push(words.slice(i, i + perLine));
  const longest = lines.map((l) => l.join(" ")).reduce((a, l) => (l.length > a.length ? l : a), "");
  const size = Math.min(fitDisplay(longest, 200, 1600, 0.62), 780 / Math.max(1, lines.length));
  let n = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white, justifyContent: "center", paddingLeft: 160 }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: "flex", gap: "0 0.25em", fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, letterSpacing: hud.titleTracking, lineHeight: 1.0, fontSize: size }}>
          {line.map((w) => {
            const i = n++;
            const k = ease(frame, i * (BEAT / 2), 5);
            return (
              <span key={i} style={{ opacity: k, scale: interpolate(k, [0, 1], [1.25, 1]), color: i === words.length - 1 ? accentColor : hud.white, textShadow: i === words.length - 1 ? accentGlow(accentColor) : hud.glow, display: "inline-block" }}>
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </AbsoluteFill>
  );
};

// The short cut's last scene: just the end card, landing on the final hit.
export const EndScene: React.FC<{ title: string; command: string; url: string; accentColor: string }> = ({ title, command, url, accentColor }) => (
  <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
    <EndCard title={title} command={command} url={url} accent={accentColor} at={0} />
  </AbsoluteFill>
);
