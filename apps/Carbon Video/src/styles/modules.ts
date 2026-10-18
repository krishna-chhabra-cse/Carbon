import type { StyleModule } from "../engine/types";
import { arcade } from "./arcade";
import { bauhaus } from "./bauhaus";
import { blueprint } from "./blueprint";
import { cinema } from "./cinema";
import { collage } from "./collage";
import { datastory } from "./datastory";
import { poster } from "./poster";
import { shell } from "./shell";
import { signal } from "./signal";
import { tour } from "./tour";
import { whiteboard } from "./whiteboard";

// Renderer for every directed style in catalog.json, by id.
export const STYLE_MODULES: Record<string, StyleModule> = {
  arcade,
  bauhaus,
  blueprint,
  cinema,
  collage,
  datastory,
  poster,
  shell,
  signal,
  tour,
  whiteboard,
};
