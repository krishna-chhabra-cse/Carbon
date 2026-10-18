import type React from "react";
import type { Storyboard } from "../LaunchVideo";

// A directed style tells its own story: the backend copies the style's scene
// list from styles/catalog.json into `storyboard.direction`, and the renderer
// plays those scenes with the style's own components, motion and transitions.

export type TransitionKind = "none" | "fade" | "slide" | "wipe" | "flip" | "clockWipe" | "iris" | "pushCut";
export type DirectedScene = { scene: string; frames: number; params?: Record<string, unknown> };
export type Direction = {
  style: string;
  version: number;
  scenes: DirectedScene[];
  transition?: { kind: TransitionKind; frames: number };
  requires?: string[];
};

export type SceneProps = {
  sb: Storyboard;
  accent: string;
  // Position in the film (for "sheet 2 of 5" style labels), and the film
  // frame this scene starts on (for motion that continues across cuts).
  index: number;
  total: number;
  start: number;
  params: Record<string, unknown>;
};

export type StyleModule = {
  // Background colour behind everything (and behind transitions).
  bg: string;
  // The accent this style draws with, derived from the product's own colour.
  accent: (sb: Storyboard) => string;
  // Drawn behind / in front of every scene, with the film's global frame.
  Background?: React.FC<{ sb: Storyboard; accent: string; cuts: number[] }>;
  Overlay?: React.FC<{ sb: Storyboard; accent: string; cuts: number[] }>;
  watermark: { color: string; background: string; font: string; low?: boolean };
  scenes: Record<string, React.FC<SceneProps>>;
};
