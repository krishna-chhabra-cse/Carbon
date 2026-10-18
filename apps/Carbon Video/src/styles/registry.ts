import catalog from "./catalog.json";
import type { DirectedScene, TransitionKind } from "../engine/types";

// Typed access to styles/catalog.json, the one list of video styles. The
// backend reads the same file (pipeline/catalog.js) to validate requests,
// plan scenes and brief the director; the website lists it via /api/styles.

export type CatalogStyle = {
  id: string;
  version: number;
  status: "available" | "beta";
  engine: "classic" | "directed";
  name: string;
  category: string;
  tagline: string;
  description: string;
  bestFor: string[];
  inputs: ("repo" | "site")[];
  lengths: number[];
  music: string;
  requires?: string[];
  transition?: { kind: TransitionKind; frames: number };
  motion?: string;
  typography?: string;
  director?: string;
  references?: string[];
  scenes?: Record<string, DirectedScene[] | { repo?: DirectedScene[]; site?: DirectedScene[] }>;
  // Gallery preview media, rendered by scripts/style-gallery.mjs from a sample
  // storyboard in scripts/gallery/ at these frames.
  preview: { poster: string; clip?: string; sample?: string; posterFrame?: number; clipFrom?: number };
};

export const CATALOG = catalog.styles as CatalogStyle[];

export const findStyle = (id: string) => CATALOG.find((s) => s.id === id);

export const directedStyle = (id: string) => {
  const s = findStyle(id);
  if (!s) throw new Error(`Unknown style "${id}"`);
  if (s.engine !== "directed") throw new Error(`Style "${id}" is a classic look, not a directed style`);
  return s;
};
