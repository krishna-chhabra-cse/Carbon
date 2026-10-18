import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { accentGlow, BEAT, beatPulse, fitDisplay, hud } from "../hud";
import { clamp, enterStyle, Kicker, useEnter } from "../kit";

type StatProps = { label: string; value: number; suffix: string; unit: string; note: string; accentColor: string };

const useCount = (value: number, to = 45) => {
  const frame = useCurrentFrame();
  return Math.round(interpolate(frame, [0, to], [0, value], { ...clamp, easing: Easing.out(Easing.cubic) }));
};

// Stat "giant": the number is the whole frame; a tick ruler fills under it
// on the beats and the unit slides in from the side.
export const StatGiant: React.FC<StatProps> = ({ label, value, suffix, unit, note, accentColor }) => {
  const frame = useCurrentFrame();
  const n = useCount(value);
  const text = `${n}${suffix}`;
  const unitIn = useEnter(BEAT * 2);
  const ticks = 48;
  const lit = Math.floor(interpolate(frame, [0, BEAT * 6], [0, ticks], clamp));
  const p = beatPulse(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <Kicker color={accentColor} style={{ position: "absolute", left: 160, top: 170 }}>{label}</Kicker>
      <div
        style={{
          position: "absolute",
          left: 140,
          right: 140,
          top: 220,
          fontFamily: hud.display,
          fontWeight: hud.displayWeight,
          textTransform: hud.displayCase,
          fontSize: fitDisplay(`${value}${suffix}`, 520, 1640, 0.62),
          lineHeight: 1,
          letterSpacing: hud.titleTracking,
          fontVariantNumeric: "tabular-nums",
          textShadow: hud.glow,
          scale: 1 + 0.02 * p,
          transformOrigin: "left center",
        }}
      >
        {text}
      </div>
      <div style={{ position: "absolute", left: 160, right: 160, top: 790, display: "flex", gap: 8, alignItems: "flex-end", height: 60 }}>
        {new Array(ticks).fill(0).map((_, i) => (
          <div key={i} style={{ flex: 1, height: i % 4 === 0 ? 60 : 30, background: i < lit ? (i % 4 === 0 ? accentColor : hud.white) : hud.faint, borderRadius: hud.radius ? 3 : 0 }} />
        ))}
      </div>
      <div style={{ position: "absolute", left: 160, top: 880, display: "flex", alignItems: "baseline", gap: 30, ...enterStyle(unitIn) }}>
        <span style={{ fontFamily: hud.sans, fontWeight: 700, fontSize: 52 }}>{unit}</span>
        <span style={{ fontFamily: hud.mono, fontSize: 20, letterSpacing: "0.1em", color: hud.dim, textTransform: "uppercase" }}>{note}</span>
      </div>
    </AbsoluteFill>
  );
};

// Stat "ring": a radial gauge fills to the number; the label and unit sit
// beside it and a small orbiting dot keeps time with the beat.
export const StatRing: React.FC<StatProps> = ({ label, value, suffix, unit, note, accentColor }) => {
  const frame = useCurrentFrame();
  const n = useCount(value, 60);
  const fill = interpolate(frame, [0, 60], [0, 0.82], { ...clamp, easing: Easing.out(Easing.cubic) });
  const C = { x: 620, y: 560, r: 300 };
  const circ = 2 * Math.PI * C.r;
  const orbit = (frame / (BEAT * 4)) * Math.PI * 2 - Math.PI / 2;
  const sideIn = useEnter(BEAT * 2);
  const text = `${n}${suffix}`;
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <circle cx={C.x} cy={C.y} r={C.r} fill="none" stroke={hud.faint} strokeWidth={34} />
        <circle
          cx={C.x}
          cy={C.y}
          r={C.r}
          fill="none"
          stroke={accentColor}
          strokeWidth={34}
          strokeLinecap={hud.radius ? "round" : "butt"}
          strokeDasharray={`${circ * fill} ${circ}`}
          transform={`rotate(-90 ${C.x} ${C.y})`}
          style={{ filter: hud.glowOn ? `drop-shadow(${accentGlow(accentColor).split(",")[0]})` : undefined }}
        />
        <circle cx={C.x + Math.cos(orbit) * (C.r + 60)} cy={C.y + Math.sin(orbit) * (C.r + 60)} r={8 + 6 * beatPulse(frame)} fill={hud.white} />
      </svg>
      <div style={{ position: "absolute", left: C.x - 260, width: 520, top: C.y - 110, textAlign: "center" }}>
        <div
          style={{
            fontFamily: hud.display,
            fontWeight: hud.displayWeight,
            textTransform: hud.displayCase,
            fontSize: fitDisplay(`${value}${suffix}`, 180, 460, 0.62),
            lineHeight: 1,
            letterSpacing: hud.displayTracking,
            fontVariantNumeric: "tabular-nums",
            textShadow: hud.glow,
          }}
        >
          {text}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1100, top: 380, width: 660, ...enterStyle(sideIn) }}>
        <Kicker color={accentColor}>{label}</Kicker>
        <div style={{ fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, fontSize: fitDisplay(unit, 84, 660, 0.56), letterSpacing: hud.displayTracking, lineHeight: 1.05, marginTop: 24 }}>{unit}</div>
        <div style={{ fontFamily: hud.mono, fontSize: 20, letterSpacing: "0.1em", color: hud.dim, marginTop: 28, textTransform: "uppercase" }}>{note}</div>
      </div>
    </AbsoluteFill>
  );
};
