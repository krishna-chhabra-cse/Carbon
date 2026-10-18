// Render the style gallery previews: for every directed style in
// src/styles/catalog.json, a poster still and an 8 s muted clip, drawn by the
// real renderer from one of the sample storyboards in scripts/gallery/
// (built by the real pipeline from github.com/fastify/fastify and
// carbons.codes). Output: apps/Carbon Frontend/public/media/styles/<id>.jpg|.mp4
//   node scripts/style-gallery.mjs [style ...] [--no-clip]
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromiumOptionsFor, getServeUrl } from "./render-video.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.resolve(ROOT, "..", "Carbon Frontend", "public");
const GALLERY = path.join(ROOT, "scripts", "gallery");
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "styles", "catalog.json"), "utf8")).styles;

const args = process.argv.slice(2);
const noClip = args.includes("--no-clip");
const ids = args.filter((a) => !a.startsWith("--"));
const styles = catalog.filter((s) => s.engine === "directed" && s.status === "available" && (!ids.length || ids.includes(s.id)));
for (const id of ids) if (!styles.some((s) => s.id === id)) throw new Error(`unknown directed style ${id}`);

// A sample storyboard with its screenshots inlined as data URLs.
const sample = (name) => {
  const sb = JSON.parse(fs.readFileSync(path.join(GALLERY, `${name}.json`), "utf8"));
  for (const k of ["slot2", "slot3"]) {
    if (sb[k]?.image?.startsWith("gallery/")) sb[k].image = `data:image/jpeg;base64,${fs.readFileSync(path.join(GALLERY, path.basename(sb[k].image))).toString("base64")}`;
  }
  return sb;
};

// Same plan the backend builds (pipeline/catalog.js planDirection) for 30 s.
const direct = (style, base) => {
  const plan = style.scenes["30"];
  const scenes = Array.isArray(plan) ? plan : plan[base.meta.type];
  return {
    ...base,
    style: style.id,
    music: style.music,
    length: 30,
    watermark: false,
    direction: { style: style.id, version: style.version, scenes, transition: style.transition, requires: style.requires || [] },
  };
};

const serveUrl = await getServeUrl();
for (const style of styles) {
  const { sample: name, posterFrame, clipFrom = 0 } = style.preview;
  const inputProps = direct(style, sample(name));
  const chromiumOptions = chromiumOptionsFor(inputProps);
  const composition = await selectComposition({ serveUrl, id: "LaunchVideo", inputProps, chromiumOptions });
  const poster = path.join(PUBLIC, style.preview.poster);
  fs.mkdirSync(path.dirname(poster), { recursive: true });
  await renderStill({ composition, serveUrl, inputProps, frame: posterFrame, output: poster, imageFormat: "jpeg", jpegQuality: 82, scale: 0.5, chromiumOptions });
  console.log(poster);
  if (noClip || !style.preview.clip) continue;
  const clip = path.join(PUBLIC, style.preview.clip);
  await renderMedia({ composition, serveUrl, inputProps, codec: "h264", crf: 30, muted: true, scale: 0.5, frameRange: [clipFrom, clipFrom + 239], outputLocation: clip, chromiumOptions });
  console.log(clip);
}
