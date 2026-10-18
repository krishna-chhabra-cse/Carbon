// Capture a live website for the video: a hero screenshot plus the page's
// title, headings and brand colors/fonts.
//   node scripts/capture-site.mjs <https://url> <outDir>
// Writes <outDir>/hero.jpg and prints the site facts as one JSON line.
import { ensureBrowser } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

export const isPrivateHost = (host) => {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h)) return true;
  if (!h.includes(":")) return false;
  return h === "::1" || h === "::" || /^(fc|fd|fe80)/.test(h) || h.startsWith("::ffff:");
};

// Reuse the headless Chrome Remotion already downloads for rendering.
async function browserPath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const status = await ensureBrowser();
  if (status.type === "local-puppeteer-browser" || status.type === "user-defined-path") return status.path;
  throw new Error("No headless browser available (set CHROME_PATH)");
}

export async function captureSite(url, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: await browserPath(), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, deviceScaleFactor: 1 });
    // Only public http(s) resources: no file:, no localhost / private network
    // (the backend also checks DNS before queueing the job).
    await page.route("**/*", (route) => {
      const u = route.request().url();
      if (/^(data:|blob:)/.test(u)) return route.continue();
      if (!/^https?:/.test(u) || isPrivateHost(new URL(u).hostname)) return route.abort();
      return route.continue();
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    const hero = path.join(outDir, "hero.jpg");
    await page.screenshot({ path: hero, type: "jpeg", quality: 72 });
    // A second view further down the page (features section, usually).
    const section = path.join(outDir, "section.jpg");
    const scrolled = await page.evaluate(() => {
      const y = Math.min(window.innerHeight * 1.1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, Math.max(0, y));
      return y > 200;
    });
    await page.waitForTimeout(600);
    if (scrolled) await page.screenshot({ path: section, type: "jpeg", quality: 72 });

    const facts = await page.evaluate(() => {
      const text = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
      const meta = (n) =>
        document.querySelector(`meta[name="${n}"]`)?.getAttribute("content") ||
        document.querySelector(`meta[property="${n}"]`)?.getAttribute("content") ||
        "";
      const isColor = (c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent";
      const bodyStyle = getComputedStyle(document.body);
      const h1 = document.querySelector("h1");
      // Accent: the most common background color of buttons / primary links.
      const counts = {};
      document.querySelectorAll("button, a[class*='btn'], a[class*='button'], [role='button']").forEach((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        if (isColor(bg)) counts[bg] = (counts[bg] || 0) + 1;
      });
      const accent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      return {
        title: document.title.trim(),
        description: meta("description") || meta("og:description"),
        siteName: meta("og:site_name"),
        h1: text(h1),
        headings: [...document.querySelectorAll("h2, h3")].map(text).filter((t) => t.length > 3 && t.length < 90).slice(0, 12),
        paragraphs: [...document.querySelectorAll("main p, section p, p")].map(text).filter((t) => t.length > 40).slice(0, 8),
        brand: {
          bg: isColor(bodyStyle.backgroundColor) ? bodyStyle.backgroundColor : "",
          fg: bodyStyle.color,
          accent,
          font: (h1 ? getComputedStyle(h1).fontFamily : bodyStyle.fontFamily).split(",")[0].replace(/["']/g, "").trim(),
        },
      };
    });
    return { ...facts, url: page.url(), hero, section: scrolled ? section : hero };
  } finally {
    await browser.close();
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [url, outDir] = process.argv.slice(2);
  if (!url || !/^https?:\/\//.test(url) || !outDir) {
    console.error("usage: node scripts/capture-site.mjs <https://url> <outDir>");
    process.exit(2);
  }
  captureSite(url, path.resolve(outDir))
    .then((f) => console.log(JSON.stringify(f)))
    .catch((e) => {
      console.error(e?.stack || String(e));
      process.exit(1);
    });
}
