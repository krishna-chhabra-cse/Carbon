// Build an editable launch deck (.pptx) from a deck JSON file.
//   node scripts/build-deck.mjs <deck.json> <out.pptx>
// Slides: title · why · architecture · API / quickstart · numbers · get started.
// Every shape is native PowerPoint (text boxes, rectangles, arrows), so users
// can edit everything; speaker notes carry a short talk track.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PptxGenJS from "pptxgenjs";

// Deck palettes follow the video's style (hud = dark, paper = light, bold = accent,
// glass = night blue, terminal = phosphor, kinetic = black and white, aurora = pastel).
const PALETTES = {
  hud: { BG: "050505", WHITE: "F2F2F2", DIM: "8A8A8A", PANEL: "121212", LINE: "2A2A2A", SANS: "Arial" },
  paper: { BG: "F2EDE3", WHITE: "161412", DIM: "6F685E", PANEL: "FBF8F2", LINE: "DDD5C6", SANS: "Georgia" },
  glass: { BG: "0B0C26", WHITE: "F5F6FF", DIM: "A6ABD6", PANEL: "1A1C3E", LINE: "2E3163", SANS: "Segoe UI" },
  kinetic: { BG: "0B0B0B", WHITE: "FFFFFF", DIM: "8C8C8C", PANEL: "161616", LINE: "333333", SANS: "Arial Black" },
  aurora: { BG: "F7F3FC", WHITE: "1C1434", DIM: "6E6688", PANEL: "FFFFFF", LINE: "E2DAF0", SANS: "Trebuchet MS" },
  // Directed styles (src/styles/catalog.json); unknown ids fall back to hud.
  blueprint: { BG: "0D2C52", WHITE: "E9F2FF", DIM: "8FA9C9", PANEL: "123760", LINE: "2C5585", SANS: "Segoe UI" },
  poster: { BG: "EFEEE9", WHITE: "0E0E0E", DIM: "6B6B6B", PANEL: "FFFFFF", LINE: "CFCFC9", SANS: "Arial Black" },
  collage: { BG: "EBE3D3", WHITE: "1B1A17", DIM: "6E6457", PANEL: "F7F3EA", LINE: "D6CBB6", SANS: "Georgia" },
  arcade: { BG: "11112B", WHITE: "F7F7FF", DIM: "9A9AC8", PANEL: "1D1440", LINE: "3A2C6E", SANS: "Consolas" },
  datastory: { BG: "F5F6F8", WHITE: "14161A", DIM: "6B7280", PANEL: "FFFFFF", LINE: "E1E4EA", SANS: "Segoe UI" },
  tour: { BG: "F3F4F7", WHITE: "0F1115", DIM: "5B6270", PANEL: "FFFFFF", LINE: "E4E6EB", SANS: "Segoe UI" },
  signal: { BG: "05060B", WHITE: "DFE6FF", DIM: "7D86A6", PANEL: "0E1120", LINE: "232A45", SANS: "Segoe UI Light" },
  bauhaus: { BG: "F0E9DB", WHITE: "151515", DIM: "5E574B", PANEL: "FFFFFF", LINE: "D7CDB8", SANS: "Arial" },
  whiteboard: { BG: "FBFBF8", WHITE: "232323", DIM: "6A6A6A", PANEL: "FFFFFF", LINE: "DCDCD6", SANS: "Segoe Print" },
  shell: { BG: "0D1017", WHITE: "D7DCE5", DIM: "6B7385", PANEL: "161A22", LINE: "262C38", SANS: "Consolas" },
  cinema: { BG: "030406", WHITE: "EEF1F6", DIM: "7A808C", PANEL: "101217", LINE: "22262E", SANS: "Segoe UI Light" },
};
// Hue of a "RRGGBB" color in degrees (terminal goes amber for warm brands, like the video).
const hueOf = (h) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const x = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (x * 60 + 360) % 360;
};
let BG, WHITE, DIM, PANEL, LINE, SANS;
const MONO = "Consolas";
const lum = (h) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const hex = (c) => (c || "#ff5b1f").replace("#", "").slice(0, 6).toUpperCase();
const clip = (s, n) => {
  const t = String(s ?? "").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export function buildDeck(deck) {
  let A = hex(deck.accent);
  if (deck.style === "bold") {
    // Accent-flooded slides with ink-colored text and highlights.
    const dark = lum(A) > 0.45;
    ({ BG, WHITE, DIM, PANEL, LINE, SANS } = { BG: A, WHITE: dark ? "0B0B0B" : "FFFFFF", DIM: dark ? "3A3A3A" : "E8E8E8", PANEL: dark ? "FFFFFF" : "000000", LINE: dark ? "0B0B0B" : "FFFFFF", SANS: "Impact" });
    A = WHITE;
  } else if (deck.style === "terminal") {
    const amber = hueOf(A) >= 12 && hueOf(A) <= 62;
    A = amber ? "FFB23E" : "3DFF86";
    ({ BG, WHITE, DIM, PANEL, LINE, SANS } = amber
      ? { BG: "0A0602", WHITE: "FFD9A0", DIM: "A8762A", PANEL: "1A1006", LINE: "3D2A0E", SANS: MONO }
      : { BG: "020A05", WHITE: "B4FFD0", DIM: "2E9E5A", PANEL: "03120A", LINE: "0E3A1E", SANS: MONO });
  } else {
    ({ BG, WHITE, DIM, PANEL, LINE, SANS } = PALETTES[deck.style] || PALETTES.hud);
    // Light accents vanish on light slides: darken them.
    if (lum(BG) > 0.5 && lum(A) > 0.55) A =A.match(/../g).map((x) => Math.round(parseInt(x, 16) * 0.55).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.title = `${deck.title} — launch deck`;
  pptx.company = deck.watermark ? "Made with Carbon · carbons.codes" : deck.title;

  const base = (label, notes) => {
    const s = pptx.addSlide();
    s.background = { color: BG };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.06, fill: { color: A }, line: { color: A } });
    if (label) s.addText(label.toUpperCase(), { x: 0.7, y: 0.45, w: 8, h: 0.35, fontFace: MONO, fontSize: 12, color: A, charSpacing: 4 });
    if (deck.watermark) {
      s.addText("made with carbons.codes", { x: 9.3, y: 6.95, w: 3.6, h: 0.3, fontFace: MONO, fontSize: 10, color: DIM, align: "right" });
    }
    if (notes) s.addNotes(notes);
    return s;
  };
  const heading = (s, text) =>
    s.addText(clip(text, 60), { x: 0.7, y: 0.85, w: 12, h: 0.9, fontFace: SANS, fontSize: 36, bold: true, color: WHITE });

  // 1 · title
  {
    const s = base(deck.watermark ? "Launch deck · made with Carbon" : "Launch deck", `${deck.title}: ${deck.tagline}`);
    s.addText(clip(deck.title, 28), { x: 0.7, y: 2.2, w: 12, h: 1.6, fontFace: SANS, fontSize: 80, bold: true, color: WHITE });
    s.addShape(pptx.ShapeType.rect, { x: 0.75, y: 3.95, w: 2.4, h: 0.05, fill: { color: A }, line: { color: A } });
    s.addText(clip(deck.tagline, 110), { x: 0.7, y: 4.2, w: 11, h: 1, fontFace: SANS, fontSize: 24, color: DIM });
    if (deck.url) s.addText(deck.url, { x: 0.7, y: 6.3, w: 8, h: 0.4, fontFace: MONO, fontSize: 14, color: A });
  }

  // 2 · why (skipped when there's nothing real to say)
  if ((deck.why || []).length) {
    const why = deck.why.slice(0, 3);
    const s = base("Why it matters", why.map((w) => `${w.title}: ${w.body}`).join("\n"));
    heading(s, deck.whyHeading || "Why people pick it");
    why.forEach((w, i) => {
      const x = 0.7 + i * 4.1;
      s.addShape(pptx.ShapeType.rect, { x, y: 2.2, w: 3.8, h: 3.8, fill: { color: PANEL }, line: { color: LINE } });
      s.addShape(pptx.ShapeType.rect, { x, y: 2.2, w: 3.8, h: 0.06, fill: { color: A }, line: { color: A } });
      s.addText(`0${i + 1}`, { x: x + 0.3, y: 2.5, w: 1, h: 0.5, fontFace: MONO, fontSize: 14, color: A });
      s.addText(clip(w.title, 40), { x: x + 0.3, y: 3.05, w: 3.2, h: 0.9, fontFace: SANS, fontSize: 22, bold: true, color: WHITE, valign: "top" });
      s.addText(clip(w.body, 160), { x: x + 0.3, y: 4.0, w: 3.2, h: 1.8, fontFace: SANS, fontSize: 14, color: DIM, valign: "top" });
    });
  }

  // 3 · architecture: boxes left-to-right with arrows
  if ((deck.architecture?.nodes || []).length >= 2) {
    const nodes = deck.architecture.nodes.slice(0, 5);
    const s = base("Architecture", deck.architecture?.summary || nodes.map((n) => n.name).join(" → "));
    heading(s, deck.architecture?.heading || "How it fits together");
    const n = Math.max(1, nodes.length);
    const gap = 0.45;
    const w = (11.9 - gap * (n - 1)) / n;
    nodes.forEach((node, i) => {
      const x = 0.7 + i * (w + gap);
      s.addShape(pptx.ShapeType.rect, { x, y: 2.7, w, h: 2.1, fill: { color: PANEL }, line: { color: i === 0 ? A : LINE, width: 1.5 } });
      s.addText(clip(node.name, 26), { x: x + 0.15, y: 2.85, w: w - 0.3, h: 0.7, fontFace: MONO, fontSize: 16, bold: true, color: i === 0 ? A : WHITE });
      s.addText(clip(node.desc, 90), { x: x + 0.15, y: 3.55, w: w - 0.3, h: 1.1, fontFace: SANS, fontSize: 12, color: DIM, valign: "top" });
      if (i < n - 1) {
        s.addShape(pptx.ShapeType.line, { x: x + w + 0.05, y: 3.75, w: gap - 0.1, h: 0, line: { color: A, width: 2, endArrowType: "triangle" } });
      }
    });
    if (deck.architecture?.summary) {
      s.addText(clip(deck.architecture.summary, 170), { x: 0.7, y: 5.3, w: 11.9, h: 0.9, fontFace: SANS, fontSize: 16, color: WHITE });
    }
  }

  // 4 · API / quickstart
  if ((deck.api?.items || []).length) {
    const items = (deck.api?.items || []).slice(0, 6);
    const s = base(deck.api?.label || "In one glance", items.map((it) => `${it.left} — ${it.right}`).join("\n"));
    heading(s, deck.api?.heading || "API in one glance");
    items.forEach((it, i) => {
      const y = 2.0 + i * 0.75;
      s.addShape(pptx.ShapeType.rect, { x: 0.7, y, w: 11.9, h: 0.62, fill: { color: PANEL }, line: { color: LINE } });
      s.addText(clip(it.left, 48), { x: 0.9, y, w: 5.6, h: 0.62, fontFace: MONO, fontSize: 15, color: A, valign: "middle" });
      s.addText(clip(it.right, 80), { x: 6.6, y, w: 5.9, h: 0.62, fontFace: SANS, fontSize: 14, color: WHITE, valign: "middle" });
    });
  }

  // 5 · numbers (only real numbers; skipped when there are none)
  if ((deck.numbers || []).length) {
    const nums = deck.numbers.slice(0, 4);
    const s = base("By the numbers", nums.map((x) => `${x.value} ${x.label}`).join(", "));
    heading(s, "By the numbers");
    const w = 11.9 / Math.max(1, nums.length);
    nums.forEach((x, i) => {
      const left = 0.7 + i * w;
      s.addText(clip(x.value, 10), { x: left, y: 2.6, w: w - 0.2, h: 1.6, fontFace: SANS, fontSize: 66, bold: true, color: i === 0 ? A : WHITE });
      s.addShape(pptx.ShapeType.rect, { x: left + 0.05, y: 4.3, w: Math.min(1.5, w - 0.4), h: 0.04, fill: { color: A }, line: { color: A } });
      s.addText(clip(x.label, 40), { x: left, y: 4.45, w: w - 0.2, h: 0.8, fontFace: MONO, fontSize: 14, color: DIM, valign: "top" });
    });
    if (deck.numbersNote) s.addText(clip(deck.numbersNote, 120), { x: 0.7, y: 6.2, w: 11.9, h: 0.4, fontFace: SANS, fontSize: 12, color: DIM, italic: true });
  }

  // 6 · get started
  {
    const s = base("Get started", `Get started: ${deck.cta?.command || deck.url}`);
    s.addText(clip(deck.cta?.headline || "Start building.", 40), { x: 0.7, y: 2.0, w: 12, h: 1.3, fontFace: SANS, fontSize: 60, bold: true, color: WHITE });
    if (deck.cta?.command) {
      s.addShape(pptx.ShapeType.rect, { x: 0.7, y: 3.7, w: 8, h: 0.9, fill: { color: PANEL }, line: { color: A, width: 1.5 } });
      s.addText(`$ ${clip(deck.cta.command, 60)}`, { x: 0.95, y: 3.7, w: 7.6, h: 0.9, fontFace: MONO, fontSize: 22, color: WHITE, valign: "middle" });
    }
    if (deck.url) s.addText(deck.url, { x: 0.7, y: 5.0, w: 10, h: 0.5, fontFace: MONO, fontSize: 18, color: A });
  }

  return pptx;
}

export async function writeDeck(deck, outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await buildDeck(deck).writeFile({ fileName: outPath });
  return outPath;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [input, out] = process.argv.slice(2);
  if (!input || !out) {
    console.error("usage: node scripts/build-deck.mjs <deck.json> <out.pptx>");
    process.exit(2);
  }
  writeDeck(JSON.parse(fs.readFileSync(input, "utf8")), path.resolve(out))
    .then((p) => console.log(JSON.stringify({ done: p })))
    .catch((e) => {
      console.error(e?.stack || String(e));
      process.exit(1);
    });
}
