// The video style catalog, from the backend (GET /api/styles, which reads
// apps/Carbon Video/src/styles/catalog.json). If it can't be loaded the
// classic looks are still offered, so the Create page always works.
import { useEffect, useState } from 'react';
import { api } from './api';

const classic = (id, name, tagline) => ({
  id,
  engine: 'classic',
  name,
  category: 'Classic',
  tagline,
  description: 'The classic Carbon launch film. Classic looks share one story structure and differ in palette, type and background.',
  bestFor: [],
  inputs: ['repo', 'site'],
  lengths: [30, 15],
  requires: [],
  preview: { poster: `/media/style-${id}.jpg` },
});
export const CLASSIC_STYLES = [
  classic('hud', 'HUD', 'Dark, glowing, cinematic'),
  classic('paper', 'Paper', 'Light, editorial serif'),
  classic('bold', 'Bold', 'Your colour, poster type'),
  classic('glass', 'Glass', 'Frosted cards, soft light'),
  classic('terminal', 'Terminal', 'CRT green, pixel mono'),
  classic('kinetic', 'Kinetic', 'Huge type, whip cuts'),
  classic('aurora', 'Aurora', 'Pastel glow, rounded'),
];

// Soundtrack names (ids match the backend MUSIC enum).
export const MUSIC_NAMES = {
  hud: 'Cinematic trap',
  paper: 'Soft & warm',
  bold: 'Punchy & bright',
  glass: 'Airy future garage',
  terminal: 'Chiptune synthwave',
  kinetic: 'Hard phonk drums',
  aurora: 'Bright pluck pop',
};

let cache = null;
let pending = null;
export function loadStyles() {
  if (cache) return Promise.resolve(cache);
  pending ||= api('/api/styles', { auth: false })
    .then((d) => (cache = Array.isArray(d.styles) && d.styles.length ? d.styles : CLASSIC_STYLES))
    .catch(() => {
      pending = null; // try again next time
      return CLASSIC_STYLES;
    });
  return pending;
}

export function useStyles() {
  const [styles, setStyles] = useState(cache || CLASSIC_STYLES);
  const [loaded, setLoaded] = useState(Boolean(cache));
  useEffect(() => {
    let alive = true;
    loadStyles().then((s) => {
      if (!alive) return;
      setStyles(s);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { styles, loaded };
}

export const findStyle = (styles, id) => styles.find((s) => s.id === id) || null;
export const styleName = (styles, id) => findStyle(styles, id)?.name || id;
export const isDirected = (s) => s?.engine === 'directed';
export const supportsInput = (s, type) => !type || Boolean(s?.inputs?.includes(type));
export const inputNeed = (s) => (s.inputs.includes('repo') ? 'Needs a GitHub repo' : 'Needs a website');
