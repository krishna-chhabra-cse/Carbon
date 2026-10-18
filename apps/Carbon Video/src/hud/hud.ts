import type React from "react";
import { geometric, mono, pixel, plexMono, poster, rounded, sans, serif, wide } from "../theme";
// Shared constants for the HUD style. Music is 90 BPM, so at 30fps:
// 1 beat = 20 frames, 1 bar = 80 frames. Cut scenes on bar lines.
export const BPM = 90;
export const BEAT = 20;
export const BAR = 80;

// 1 right on a beat, decaying to ~0 before the next one.
export const beatPulse = (frame: number, every = BEAT, decay = 5) => {
  if (frame < 0) return 0;
  const t = (frame % every) / every;
  return Math.exp(-t * decay);
};

// ── Styles ────────────────────────────────────────────────────
// Every template reads its colors and display font from `hud`. setStyle()
// swaps the whole palette before a video renders, so one storyboard can be
// drawn as HUD (dark, glowing), Paper (light, editorial serif), Bold
// (accent-flooded, condensed poster type), Glass (night gradient, frosted
// cards), Terminal (phosphor CRT), Kinetic (huge wide type, whip cuts) or
// Aurora (pastel light, rounded type). Backdrop.tsx draws the animated
// backgrounds and overlays the last four use.
export type StyleName = "hud" | "paper" | "bold" | "glass" | "terminal" | "kinetic" | "aurora";
export const STYLES: StyleName[] = ["hud", "paper", "bold", "glass", "terminal", "kinetic", "aurora"];
export type BackdropKind = "none" | "glass" | "terminal" | "kinetic" | "aurora";

type Palette = {
  bg: string;
  white: string; // primary ink (white on HUD)
  dim: string;
  faint: string;
  mid: string;
  lineNo: string;
  panel: string;
  panelBar: string;
  glow: string;
  glowOn: boolean;
  grain: number;
  vignette: string;
  display: string;
  displayWeight: number;
  displayCase: "none" | "uppercase";
  displayTracking: string;
  ink: (a: number) => string;
  // Added with the Glass / Terminal / Kinetic / Aurora packs. The HUD values
  // below keep the original three styles exactly as they were.
  sceneBg: string; // scene fill ("transparent" lets the backdrop show)
  backdrop: BackdropKind;
  mono: string; // labels, code, commands
  sans: string; // keyword ribbon
  titleTracking: string;
  displayWidth: number; // display glyph width vs. the HUD face (for fitSize)
  card: React.CSSProperties; // panel treatment for code / run columns
  radius: number; // browser-window corner radius
  imgFilter: string; // CSS filter for website screenshots
  flash: string; // cut-flash color
  beatZoom: number; // camera punch on every beat
  whip: boolean; // whip-pan transitions on the cuts
  tint: string[]; // backdrop colors
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const mix = (hex: string, toward: number, k: number) =>
  `#${rgb(hex).map((v) => Math.round(v + (toward - v) * k).toString(16).padStart(2, "0")).join("")}`;
export const alpha = (hex: string, a: number) => `rgba(${rgb(hex).join(",")},${a})`;
const hue = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
// Same saturation and brightness, hue moved by `deg` (HSV rotation).
const hueShift = (hex: string, deg: number) => {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const s = max ? (max - Math.min(r, g, b)) / max : 0;
  const h = (hue(hex) + deg + 360) % 360;
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return max - max * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return `#${[f(5), f(3), f(1)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
};

const HUD: Palette = {
  bg: "#050505",
  white: "#f2f2f2",
  dim: "#6e6e6e",
  faint: "rgba(255,255,255,0.14)",
  mid: "#c9c9c9",
  lineNo: "#3a3a3a",
  panel: "#0b0b0b",
  panelBar: "#141414",
  glow: "0 0 18px rgba(255,255,255,0.45), 0 0 60px rgba(255,255,255,0.18)",
  glowOn: true,
  grain: 1,
  vignette: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.75) 100%)",
  display: sans,
  displayWeight: 900,
  displayCase: "none",
  displayTracking: "-0.04em",
  ink: (a) => `rgba(255,255,255,${a})`,
  sceneBg: "#050505",
  backdrop: "none",
  mono,
  sans,
  titleTracking: "-0.055em",
  displayWidth: 1,
  card: {},
  radius: 14,
  imgFilter: "none",
  flash: "white",
  beatZoom: 0.012,
  whip: false,
  tint: [],
};

export const hud: Palette = { ...HUD };

// Applies a style and returns the accent the templates should use.
export function setStyle(style: StyleName = "hud", accent = "#ff5b1f"): { accent: string; bg: string } {
  const safe = /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#ff5b1f";
  if (style === "paper") {
    const ink = (a: number) => `rgba(22,20,18,${a})`;
    Object.assign(hud, {
      ...HUD,
      bg: "#f2ede3",
      sceneBg: "#f2ede3",
      white: "#161412",
      dim: "#7d766c",
      faint: ink(0.14),
      mid: "#3d3a35",
      lineNo: "#b9b1a4",
      panel: "#fbf8f2",
      panelBar: "#e7e0d3",
      glow: "none",
      glowOn: false,
      grain: 0.5,
      vignette: "radial-gradient(ellipse at center, transparent 60%, rgba(120,100,70,0.12) 100%)",
      display: serif,
      displayWeight: 400,
      displayTracking: "-0.02em",
      ink,
    });
    // Light accents (yellow, mint…) vanish on paper: darken them.
    return { accent: luminance(safe) > 0.45 ? mix(safe, 0, 0.45) : safe, bg: hud.bg };
  }
  if (style === "bold") {
    const darkText = luminance(safe) > 0.35;
    const t = darkText ? "11,11,11" : "255,255,255";
    const ink = (a: number) => `rgba(${t},${a})`;
    Object.assign(hud, {
      ...HUD,
      bg: safe,
      sceneBg: safe,
      white: `rgb(${t})`,
      dim: ink(0.62),
      faint: ink(0.2),
      mid: ink(0.85),
      lineNo: ink(0.4),
      panel: darkText ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.22)",
      panelBar: darkText ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.32)",
      glow: "none",
      glowOn: false,
      grain: 0.6,
      vignette: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.22) 100%)",
      display: poster,
      displayWeight: 400,
      displayCase: "uppercase",
      displayTracking: "0em",
      ink,
    });
    // On an accent-colored background, highlights are drawn in the ink color.
    return { accent: `rgb(${t})`, bg: safe };
  }
  if (style === "glass") {
    // Night-blue gradient lit by soft blobs of the brand color and two
    // neighbours on the color wheel; content sits on frosted cards.
    const a = luminance(safe) < 0.06 ? mix(safe, 255, 0.4) : safe;
    Object.assign(hud, {
      ...HUD,
      bg: "#07081a",
      sceneBg: "transparent",
      backdrop: "glass",
      white: "#f5f6ff",
      dim: "rgba(225,228,255,0.58)",
      faint: "rgba(255,255,255,0.16)",
      mid: "rgba(235,238,255,0.85)",
      lineNo: "rgba(255,255,255,0.28)",
      panel: "rgba(255,255,255,0.07)",
      panelBar: "rgba(255,255,255,0.1)",
      glow: "0 0 30px rgba(190,200,255,0.35)",
      glowOn: true,
      grain: 0.6,
      vignette: "radial-gradient(ellipse at center, transparent 55%, rgba(2,2,12,0.6) 100%)",
      display: geometric,
      displayWeight: 700,
      displayTracking: "-0.035em",
      titleTracking: "-0.045em",
      displayWidth: 1.12,
      card: {
        margin: "-30px -34px",
        padding: "30px 34px",
        borderRadius: 26,
        background: "linear-gradient(145deg, rgba(255,255,255,0.13), rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 30px 80px rgba(0,0,10,0.45)",
        backdropFilter: "blur(26px) saturate(1.4)",
      },
      radius: 22,
      flash: "#dfe4ff",
      tint: [a, hueShift(a, 55), hueShift(a, -70)],
    });
    return { accent: a, bg: hud.bg };
  }
  if (style === "terminal") {
    // Phosphor CRT: green, or amber when the brand color is warm.
    const h = hue(safe);
    const p = h >= 12 && h <= 62 ? "#ffb23e" : "#3dff86";
    const ink = (k: number) => alpha(p, k);
    Object.assign(hud, {
      ...HUD,
      bg: p === "#3dff86" ? "#020a05" : "#0a0602",
      sceneBg: "transparent",
      backdrop: "terminal",
      white: mix(p, 255, 0.55),
      dim: ink(0.55),
      faint: ink(0.18),
      mid: ink(0.82),
      lineNo: ink(0.3),
      panel: alpha(p, 0.05),
      panelBar: alpha(p, 0.1),
      glow: `0 0 8px ${alpha(p, 0.75)}, 0 0 28px ${alpha(p, 0.35)}`,
      glowOn: true,
      grain: 1.4,
      vignette: "radial-gradient(ellipse 75% 70% at center, transparent 55%, rgba(0,0,0,0.85) 100%)",
      display: pixel,
      displayWeight: 400,
      displayTracking: "0em",
      titleTracking: "0.02em",
      displayWidth: 0.85,
      mono: plexMono,
      sans: plexMono,
      ink,
      card: { margin: "-26px -30px", padding: "26px 30px", border: `1px solid ${ink(0.35)}`, background: ink(0.04) },
      radius: 0,
      imgFilter: `grayscale(1) contrast(1.15) brightness(0.9) sepia(1) hue-rotate(${p === "#3dff86" ? "70deg" : "-12deg"}) saturate(2.6)`,
      flash: p,
      tint: [p],
    });
    return { accent: p, bg: hud.bg };
  }
  if (style === "kinetic") {
    // Black and white, one loud accent, huge extra-wide caps, whip cuts.
    const a = luminance(safe) < 0.12 ? mix(safe, 255, 0.35) : safe;
    Object.assign(hud, {
      ...HUD,
      bg: "#0b0b0b",
      sceneBg: "transparent",
      backdrop: "kinetic",
      white: "#ffffff",
      dim: "rgba(255,255,255,0.55)",
      faint: "rgba(255,255,255,0.18)",
      mid: "rgba(255,255,255,0.86)",
      glow: "none",
      glowOn: false,
      grain: 0.8,
      vignette: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)",
      display: wide,
      displayWeight: 900,
      displayCase: "uppercase",
      displayTracking: "-0.03em",
      titleTracking: "-0.04em",
      displayWidth: 1.5,
      radius: 0,
      beatZoom: 0.03,
      whip: true,
      tint: [a],
    });
    return { accent: a, bg: hud.bg };
  }
  if (style === "aurora") {
    // Light pastel aurora; ink is a deep violet so it reads on every hue.
    const ink = (k: number) => `rgba(28,20,52,${k})`;
    const a = luminance(safe) > 0.4 ? mix(safe, 0, 0.4) : safe;
    const soft = (c: string) => mix(c, 255, 0.45);
    Object.assign(hud, {
      ...HUD,
      bg: "#f7f3fc",
      sceneBg: "transparent",
      backdrop: "aurora",
      white: "#1c1434",
      dim: ink(0.55),
      faint: ink(0.14),
      mid: ink(0.8),
      lineNo: ink(0.3),
      panel: "rgba(255,255,255,0.75)",
      panelBar: "rgba(255,255,255,0.9)",
      glow: "none",
      glowOn: false,
      grain: 0.35,
      vignette: "radial-gradient(ellipse at center, transparent 65%, rgba(120,90,180,0.10) 100%)",
      display: rounded,
      displayWeight: 600,
      displayTracking: "-0.02em",
      titleTracking: "-0.03em",
      displayWidth: 1,
      ink,
      card: {
        margin: "-30px -34px",
        padding: "30px 34px",
        borderRadius: 30,
        background: "rgba(255,255,255,0.58)",
        border: "1px solid rgba(255,255,255,0.9)",
        boxShadow: "0 24px 70px rgba(90,60,160,0.16)",
        backdropFilter: "blur(20px)",
      },
      radius: 28,
      tint: [soft(safe), soft(hueShift(safe, 70)), soft(hueShift(safe, -80)), soft(hueShift(safe, 150))],
    });
    return { accent: a, bg: hud.bg };
  }
  Object.assign(hud, HUD);
  return { accent: safe, bg: hud.bg };
}

// fitSize for the display face, corrected for how wide the style's font is.
export const fitDisplay = (text: string, base: number, maxWidth: number, charW = 0.6) =>
  fitSize(text, base, maxWidth, charW * hud.displayWidth);

export const accentGlow = (c: string) => (hud.glowOn ? `0 0 14px ${c}aa, 0 0 40px ${c}55` : "none");

// Reveal `text` one character at a time.
export const typed = (text: string, frame: number, start: number, cps: number) =>
  text.slice(0, Math.max(0, Math.floor((frame - start) * cps)));

// Shrink a font size so `text` fits in `maxWidth` px (charW = average glyph width in em).
export const fitSize = (text: string, base: number, maxWidth: number, charW = 0.6) =>
  Math.max(14, Math.min(base, maxWidth / (Math.max(1, text.length) * charW)));
