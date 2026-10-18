// Render the style-picker preview stills (the sample storyboard's title card)
// into the website's public/media/style-<id>.jpg.
//   node scripts/style-previews.mjs [style ...]
// Or dump frames to check a style by eye:
//   node scripts/style-previews.mjs glass --frames 120,240,450 --out out/stills [--storyboard file.json]
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getServeUrl } from "./render-video.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA = path.resolve(ROOT, "..", "Carbon Frontend", "public", "media");
const ALL = ["hud", "paper", "bold", "glass", "terminal", "kinetic", "aurora"];
const SIGNATURE_TITLE = { hud: "scan", paper: "stack", bold: "stack", glass: "card", terminal: "scan", kinetic: "stack", aurora: "card" };

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const frames = opt("--frames")?.split(",").map(Number);
const outDir = opt("--out");
const sbFile = opt("--storyboard") || path.join(ROOT, "scripts", "sample-storyboard.json");
const styles = args.length ? args : ["glass", "terminal", "kinetic", "aurora"];
for (const s of styles) if (!ALL.includes(s)) throw new Error(`unknown style ${s}`);

const base = JSON.parse(fs.readFileSync(sbFile, "utf8"));
const serveUrl = await getServeUrl();
for (const style of styles) {
  // Previews show each style's signature title layout (a storyboard's own layout wins).
  const inputProps = { ...base, style, watermark: false, layout: base.layout ?? { title: SIGNATURE_TITLE[style] } };
  const composition = await selectComposition({ serveUrl, id: "LaunchVideo", inputProps });
  for (const frame of frames ?? [120]) {
    const output = outDir ? path.resolve(outDir, `${style}-${frame}.jpg`) : path.join(MEDIA, `style-${style}.jpg`);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await renderStill({
      composition,
      serveUrl,
      inputProps,
      frame,
      output,
      imageFormat: "jpeg",
      jpegQuality: 88,
      scale: outDir ? 0.5 : 653 / 1920,
      browserExecutable: process.env.CHROME_PATH || null,
    });
    console.log(output);
  }
}
