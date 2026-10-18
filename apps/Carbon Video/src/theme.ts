import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSora } from "@remotion/google-fonts/Sora";
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadVT323 } from "@remotion/google-fonts/VT323";
import { loadFont as loadPlexMono } from "@remotion/google-fonts/IBMPlexMono";

// Fonts: Geist for text, Geist Mono for code and commands.
export const { fontFamily: sans } = loadGeist("normal", {
  weights: ["400", "500", "700", "800", "900"],
  subsets: ["latin"],
});
export const { fontFamily: mono } = loadGeistMono("normal", {
  weights: ["400", "500"],
  subsets: ["latin"],
});

// Display faces for the Paper (editorial serif) and Bold (condensed poster) styles.
export const { fontFamily: serif } = loadInstrumentSerif("normal", { weights: ["400"], subsets: ["latin"] });
export const { fontFamily: poster } = loadAnton("normal", { weights: ["400"], subsets: ["latin"] });

// Display faces for Glass (geometric), Kinetic (extra-wide), Aurora (rounded)
// and Terminal (pixel CRT, with Plex Mono for code and labels).
export const { fontFamily: geometric } = loadSora("normal", { weights: ["600", "700"], subsets: ["latin"] });
export const { fontFamily: wide } = loadUnbounded("normal", { weights: ["800", "900"], subsets: ["latin"] });
export const { fontFamily: rounded } = loadFredoka("normal", { weights: ["500", "600"], subsets: ["latin"] });
export const { fontFamily: pixel } = loadVT323("normal", { weights: ["400"], subsets: ["latin"] });
export const { fontFamily: plexMono } = loadPlexMono("normal", { weights: ["400", "500"], subsets: ["latin"] });

// GitHub dark palette. Accent comes from the repo's primary language.
export const colors = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  text: "#e6edf3",
  muted: "#8b949e",
};

// GitHub linguist colors for common languages.
export const languageColors: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  Java: "#b07219",
};

// Spring presets used across scenes. Lower damping = more overshoot/bounce.
export const springs = {
  // Snappy with a visible overshoot, for headlines and cards.
  pop: { damping: 11, stiffness: 140, mass: 0.7 },
  // Smooth, no bounce, for supporting text and fades.
  smooth: { damping: 200 },
};
