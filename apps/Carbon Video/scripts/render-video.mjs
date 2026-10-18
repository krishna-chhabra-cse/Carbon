// Render a launch video from a storyboard JSON file.
//   node scripts/render-video.mjs <storyboard.json> <out.mp4> [--height 720]
// Prints one JSON line per progress update ({"progress":0.42}) so the backend
// worker can show a progress bar, and {"done":"<path>"} at the end.
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromiumOptionsFor } from "./gl.mjs";

export { chromiumOptionsFor };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_DIR = path.join(ROOT, ".bundle");

const newestMtime = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
    const p = path.join(dir, e.name);
    return Math.max(m, e.isDirectory() ? newestMtime(p) : fs.statSync(p).mtimeMs);
  }, 0);

// Bundling takes ~20s, so reuse the bundle until the templates change.
export async function getServeUrl() {
  const marker = path.join(BUNDLE_DIR, "index.html");
  const srcTime = Math.max(newestMtime(path.join(ROOT, "src")), newestMtime(path.join(ROOT, "public")));
  if (fs.existsSync(marker) && fs.statSync(marker).mtimeMs > srcTime) return BUNDLE_DIR;
  return bundle({ entryPoint: path.join(ROOT, "src/index.ts"), outDir: BUNDLE_DIR, publicDir: path.join(ROOT, "public") });
}

export async function renderLaunchVideo(storyboard, outPath, { scale = 1, onProgress = () => {}, frameRange } = {}) {
  const serveUrl = await getServeUrl();
  const chromiumOptions = chromiumOptionsFor(storyboard);
  const composition = await selectComposition({ serveUrl, id: "LaunchVideo", inputProps: storyboard, chromiumOptions });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 23,
    outputLocation: outPath,
    inputProps: storyboard,
    scale,
    chromiumOptions,
    ...(frameRange ? { frameRange } : {}),
    browserExecutable: process.env.CHROME_PATH || null,
    onProgress: ({ progress }) => onProgress(progress),
  });
  return outPath;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [input, out] = process.argv.slice(2);
  const scaleIdx = process.argv.indexOf("--scale");
  const heightIdx = process.argv.indexOf("--height");
  const scale = heightIdx > 0 ? Number(process.argv[heightIdx + 1]) / 1080 : scaleIdx > 0 ? Number(process.argv[scaleIdx + 1]) : 1;
  if (!input || !out) {
    console.error("usage: node scripts/render-video.mjs <storyboard.json> <out.mp4> [--height 720]");
    process.exit(2);
  }
  const storyboard = JSON.parse(fs.readFileSync(input, "utf8"));
  let last = -1;
  renderLaunchVideo(storyboard, path.resolve(out), {
    scale,
    onProgress: (p) => {
      const pct = Math.floor(p * 100);
      if (pct !== last) {
        last = pct;
        console.log(JSON.stringify({ progress: p }));
      }
    },
  })
    .then((p) => console.log(JSON.stringify({ done: p })))
    .catch((e) => {
      console.error(e?.stack || String(e));
      process.exit(1);
    });
}
