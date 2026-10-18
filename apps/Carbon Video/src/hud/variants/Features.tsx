import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { accentGlow, BEAT, fitDisplay, hud } from "../hud";
import { clamp, Display, enterStyle, Kicker, useEnter } from "../kit";

type FeatProps = { label: string; heading: string; root: string; plugins: string; accentColor: string };
const split = (plugins: string) => plugins.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);

// Features "grid": numbered cards land one per beat; the newest card is lit.
export const FeatGrid: React.FC<FeatProps> = ({ label, heading, plugins, accentColor }) => {
  const frame = useCurrentFrame();
  const items = split(plugins);
  const cols = items.length > 4 ? 3 : 2;
  const headIn = useEnter(0);
  const lit = Math.min(items.length - 1, Math.floor((frame - BEAT) / BEAT));
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <div style={{ position: "absolute", left: 160, top: 110, ...enterStyle(headIn) }}>
        <Kicker color={accentColor}>{label}</Kicker>
        <Display text={heading} base={76} maxWidth={1600} style={{ marginTop: 10 }} />
      </div>
      <div style={{ position: "absolute", left: 160, right: 160, top: 330, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 28 }}>
        {items.map((f, i) => {
          const at = BEAT + i * BEAT;
          const k = interpolate(frame, [at, at + 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const on = i === lit;
          return (
            <div
              key={f}
              style={{
                ...enterStyle(k, 36),
                scale: interpolate(k, [0, 1], [0.92, 1]),
                height: items.length > 4 ? 250 : 270,
                padding: "32px 36px",
                borderRadius: hud.radius * 1.4,
                border: `1.5px solid ${on ? accentColor : hud.faint}`,
                background: hud.panel,
                boxShadow: on ? accentGlow(accentColor) : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                ...hud.card,
                margin: 0,
              }}
            >
              <div style={{ fontFamily: hud.mono, fontSize: 22, color: on ? accentColor : hud.dim }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, fontSize: fitDisplay(f, 52, cols === 3 ? 440 : 680, 0.56), letterSpacing: hud.displayTracking, lineHeight: 1.05 }}>{f}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// Features "list": one feature per beat, huge and centered, swapping on the
// hit; the full list builds up small along the bottom.
export const FeatList: React.FC<FeatProps> = ({ label, plugins, accentColor }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const items = split(plugins);
  const per = Math.max(1, Math.floor(Math.floor(durationInFrames / BEAT) / Math.max(1, items.length))) * BEAT;
  const idx = Math.min(items.length - 1, Math.floor(frame / per));
  const local = frame - idx * per;
  const k = interpolate(local, [0, 8], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const word = items[idx] ?? "";
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <Kicker color={accentColor} style={{ position: "absolute", left: 160, top: 150 }}>
        {label} · {String(idx + 1).padStart(2, "0")}/{String(items.length).padStart(2, "0")}
      </Kicker>
      <div style={{ position: "absolute", left: 120, right: 120, top: 0, bottom: 120, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div
          style={{
            fontFamily: hud.display,
            fontWeight: hud.displayWeight,
            textTransform: hud.displayCase,
            fontSize: fitDisplay(word, 240, 1680, 0.6),
            letterSpacing: hud.titleTracking,
            lineHeight: 1,
            textShadow: hud.glow,
            opacity: k,
            scale: interpolate(k, [0, 1], [1.12, 1]),
            filter: k < 1 ? `blur(${(1 - k) * 10}px)` : undefined,
          }}
        >
          {word}
        </div>
      </div>
      <div style={{ position: "absolute", left: 160, right: 160, bottom: 140, display: "flex", gap: 34, flexWrap: "wrap", fontFamily: hud.mono, fontSize: 24, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {items.slice(0, idx + 1).map((f, i) => (
          <span key={f} style={{ color: i === idx ? accentColor : hud.dim }}>{f}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
