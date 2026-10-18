import type React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { accentGlow, BEAT, beatPulse, fitDisplay, hud, typed } from "../hud";
import { clamp, EndCard, enterStyle, Kicker, useEnter } from "../kit";

type OutroProps = { command: string; commandLabel?: string; headline: string; url: string; title: string; finalAt: number; accentColor: string };

// Outro "cta": the headline, then a big button-like pill with the install
// command / URL that pulses on every beat; end card on the final hit.
export const OutroCta: React.FC<OutroProps> = ({ command, commandLabel, headline, url, title, finalAt, accentColor }) => {
  const frame = useCurrentFrame();
  const headIn = useEnter(0);
  const btnIn = useEnter(BEAT * 2, 14);
  const out = interpolate(frame, [finalAt - 1, finalAt], [1, 0], clamp);
  const p = beatPulse(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <AbsoluteFill style={{ opacity: out, alignItems: "center", justifyContent: "center", gap: 70 }}>
        <div style={{ textAlign: "center", ...enterStyle(headIn, 40) }}>
          <Kicker color={accentColor}>{commandLabel ?? "INSTALL"}</Kicker>
          <div style={{ fontFamily: hud.display, fontWeight: hud.displayWeight, textTransform: hud.displayCase, fontSize: fitDisplay(headline, 150, 1600, 0.58), letterSpacing: hud.titleTracking, lineHeight: 1, marginTop: 20, textShadow: hud.glow }}>{headline}</div>
        </div>
        <div
          style={{
            ...enterStyle(btnIn, 30),
            scale: interpolate(btnIn, [0, 1], [0.85, 1]) * (1 + 0.035 * p),
            padding: "30px 60px",
            borderRadius: hud.radius ? 999 : 0,
            background: accentColor,
            color: hud.bg,
            fontFamily: hud.mono,
            fontWeight: 500,
            fontSize: fitDisplay(command, 52, 1200, 0.62),
            boxShadow: `${accentGlow(accentColor)}, 0 ${20 + 14 * p}px 60px rgba(0,0,0,0.35)`,
          }}
        >
          {command === url ? command : `$ ${typed(command, frame, BEAT * 2, 1.2)}`}
        </div>
        <div style={{ fontFamily: hud.mono, fontSize: 28, color: hud.dim, opacity: interpolate(frame, [BEAT * 4, BEAT * 4 + 10], [0, 1], clamp) }}>{url}</div>
      </AbsoluteFill>
      <EndCard title={title} command={command} url={url} accent={accentColor} at={finalAt} />
    </AbsoluteFill>
  );
};

// Outro "words": the headline slams in one word per beat, each word stacked
// and huge, then the end card.
export const OutroWords: React.FC<OutroProps> = ({ command, headline, url, title, finalAt, accentColor }) => {
  const frame = useCurrentFrame();
  const words = headline.replace(/[.!]$/, "").split(" ").filter(Boolean).slice(0, 5);
  const out = interpolate(frame, [finalAt - 1, finalAt], [1, 0], clamp);
  const longest = words.reduce((a, w) => (w.length > a.length ? w : a), "");
  const size = Math.min(fitDisplay(longest, 230, 1600, 0.62), 600 / Math.max(1, words.length));
  return (
    <AbsoluteFill style={{ backgroundColor: hud.sceneBg, color: hud.white }}>
      <AbsoluteFill style={{ opacity: out, alignItems: "flex-start", justifyContent: "center", paddingLeft: 160 }}>
        {words.map((w, i) => {
          const at = i * BEAT;
          const k = interpolate(frame, [at, at + 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
          const last = i === words.length - 1;
          return (
            <div
              key={i}
              style={{
                fontFamily: hud.display,
                fontWeight: hud.displayWeight,
                textTransform: hud.displayCase,
                fontSize: size,
                lineHeight: 0.98,
                letterSpacing: hud.titleTracking,
                color: last ? accentColor : hud.white,
                textShadow: last ? accentGlow(accentColor) : hud.glow,
                opacity: k,
                translate: `${interpolate(k, [0, 1], [-80, 0])}px 0px`,
              }}
            >
              {w}
            </div>
          );
        })}
        <div style={{ marginTop: 50, fontFamily: hud.mono, fontSize: 30, color: hud.dim, opacity: interpolate(frame, [words.length * BEAT, words.length * BEAT + 10], [0, 1], clamp) }}>
          {command !== url ? <span style={{ color: accentColor }}>$ {command}</span> : null} {url}
        </div>
      </AbsoluteFill>
      <EndCard title={title} command={command} url={url} accent={accentColor} at={finalAt} />
    </AbsoluteFill>
  );
};
