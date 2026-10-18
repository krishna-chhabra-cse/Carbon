import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadDMSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadPress } from "@remotion/google-fonts/PressStart2P";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadSpecialElite } from "@remotion/google-fonts/SpecialElite";

// Display faces for the directed styles (all SIL Open Font License, via
// Google Fonts). The classic looks keep theirs in ../theme.ts.
export const { fontFamily: pressStart } = loadPress("normal", { weights: ["400"], subsets: ["latin"] });
export const { fontFamily: caveat } = loadCaveat("normal", { weights: ["500", "700"], subsets: ["latin"] });
export const { fontFamily: marker } = loadMarker("normal", { weights: ["400"], subsets: ["latin"] });
export const { fontFamily: typewriter } = loadSpecialElite("normal", { weights: ["400"], subsets: ["latin"] });
export const { fontFamily: dmSerif } = loadDMSerif("normal", { weights: ["400"], subsets: ["latin"] });
export const { fontFamily: grotesk } = loadSpaceGrotesk("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
export const { fontFamily: jetbrains } = loadJetBrains("normal", { weights: ["400", "700"], subsets: ["latin"] });
