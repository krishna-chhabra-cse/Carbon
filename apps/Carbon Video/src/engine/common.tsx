import { Audio } from "@remotion/media";
import type React from "react";
import { Easing, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

// Shared pieces for both engines (the classic launch film and the directed
// styles): the soundtrack, the free-tier watermark and small motion helpers.
// Music is 90 BPM at 30 fps: 1 beat = 20 frames, 1 bar = 80 frames.

export const MUSIC_FILES: Record<string, string> = {
  hud: "music.wav",
  paper: "music-paper.wav",
  bold: "music-bold.wav",
  glass: "music-glass.wav",
  terminal: "music-terminal.wav",
  kinetic: "music-kinetic.wav",
  aurora: "music-aurora.wav",
};

// The 15 s cut plays the 30 s track spliced on beat lines: source 80–320
// (build, drop) then 680–900 (lift, final hit at video frame 400).
export const SPLICE = { at: 240, first: 80, second: 680 };

export const Soundtrack: React.FC<{ music: string; short: boolean }> = ({ music, short }) => {
  const file = MUSIC_FILES[music];
  if (!file) throw new Error(`Unknown soundtrack "${music}"`);
  const src = staticFile(file);
  if (!short) return <Audio src={src} />;
  return (
    <>
      {/* 2-frame fades on both sides of the splice keep it click-free */}
      <Sequence durationInFrames={SPLICE.at}>
        <Audio src={src} trimBefore={SPLICE.first} volume={(f) => Math.min(1, (SPLICE.at - f) / 2)} />
      </Sequence>
      <Sequence from={SPLICE.at}>
        <Audio src={src} trimBefore={SPLICE.second} volume={(f) => Math.min(1, (f + 1) / 2)} />
      </Sequence>
    </>
  );
};

export const Watermark: React.FC<{ color: string; background: string; font: string; low?: boolean }> = ({ color, background, font, low }) => (
  <div
    style={{
      position: "absolute",
      right: 70,
      ...(low ? { bottom: 70 } : { top: 46 }),
      fontFamily: font,
      fontSize: 22,
      letterSpacing: "0.08em",
      color,
      padding: "8px 14px",
      border: `1px solid ${color}`,
      backgroundColor: background,
      opacity: 0.85,
    }}
  >
    made with carbons.codes
  </div>
);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const BEAT = 20;
export const BAR = 80;

// 0 → 1 over `len` frames starting at `at`.
export const ramp = (frame: number, at: number, len: number, easing: (t: number) => number = Easing.out(Easing.cubic)) =>
  interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });

// Frame number held for `every` frames: animation "on twos" / at 12 fps / 8 fps.
export const stepped = (frame: number, every: number) => Math.floor(frame / every) * every;

// Deterministic pseudo-random number in [0, 1) for a seed (no Math.random in renders).
export const rand = (seed: number | string) => {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// Fit a font size so `text` fits in `maxWidth` px for a face with average glyph width `charW` (em).
export const fit = (text: string, base: number, maxWidth: number, charW = 0.6) =>
  Math.max(14, Math.min(base, maxWidth / (Math.max(1, text.length) * charW)));

export const useScene = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  return { frame, duration: durationInFrames, fps, width, height };
};

// Colour helpers (hex in, hex/rgba out).
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export const safeHex = (hex: string, fallback = "#ff5b1f") => (/^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback);
export const rgba = (hex: string, a: number) => `rgba(${rgb(safeHex(hex)).join(",")},${a})`;
export const mixHex = (hex: string, toward: number, k: number) =>
  `#${rgb(safeHex(hex)).map((v) => Math.round(v + (toward - v) * k).toString(16).padStart(2, "0")).join("")}`;
export const lum = (hex: string) => {
  const [r, g, b] = rgb(safeHex(hex)).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
// Lighten or darken until the colour reads against a light or dark background.
export const readableOn = (hex: string, dark: boolean) => {
  let c = safeHex(hex);
  for (let i = 0; i < 6; i++) {
    const l = lum(c);
    if (dark ? l > 0.28 : l < 0.32) return c;
    c = mixHex(c, dark ? 255 : 0, 0.22);
  }
  return c;
};
