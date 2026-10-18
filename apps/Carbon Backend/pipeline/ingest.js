// ============================================================
//  pipeline/ingest.js — Read the facts a video is allowed to use.
//
//  Repo: GitHub API (metadata, languages, README, package manifest).
//  Site: headless capture via apps/Carbon Video/scripts/capture-site.mjs.
//  Everything later in the pipeline (LLM copy, numbers, code) is drawn from
//  these facts, so the video never shows invented stats or code.
// ============================================================

const axios = require('axios');
const path = require('path');
const { execFile } = require('child_process');

const VIDEO_APP = path.resolve(process.env.VIDEO_APP_DIR || path.join(__dirname, '..', '..', 'Carbon Video'));

const gh = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 15000,
  headers: {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'carbons.codes',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  },
});

const INSTALL_RE = /^\s*(?:\$\s*)?((?:npm (?:i|install|create)|npx|pnpm (?:add|create|dlx)|yarn (?:add|create)|bun (?:add|create|x)|pip3? install|pipx install|uv (?:add|pip install|tool install)|cargo (?:add|install)|go (?:get|install)|brew install|gem install|composer require|dotnet add|docker (?:run|pull)|curl -fsSL)\s+\S.*)$/;

// Fenced code blocks from the README, shortest-useful first.
function extractSnippets(readme) {
  const out = [];
  const re = /```([\w+-]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(readme)) && out.length < 12) {
    const lang = (m[1] || '').toLowerCase();
    const lines = m[2].replace(/\t/g, '  ').split('\n').map((l) => l.replace(/\s+$/, ''));
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    if (lines.length < 1 || lines.length > 12) continue;
    if (lines.some((l) => l.length > 70)) continue;
    if (['json', 'yaml', 'yml', 'text', 'txt', 'diff', 'csv', 'mermaid'].includes(lang)) continue;
    out.push({ lang: lang || 'sh', code: lines.join('\n') });
  }
  return out;
}

function extractCommands(readme) {
  const cmds = new Set();
  for (const line of readme.split('\n')) {
    const m = line.match(INSTALL_RE);
    if (m && m[1].length <= 60) cmds.add(m[1].trim());
    if (cmds.size >= 8) break;
  }
  return [...cmds];
}

function extractHeadings(readme) {
  return readme
    .split('\n')
    .filter((l) => /^#{2,3}\s/.test(l))
    .map((l) => l.replace(/^#+\s*/, '').replace(/[`*_[\]]/g, '').replace(/\(.*?\)/g, '').trim())
    .filter((h) => h.length > 2 && h.length < 60 && !/^(license|contributing|contributors|table of contents|sponsors?|backers|credits|changelog)$/i.test(h))
    .slice(0, 15);
}

function cleanReadme(readme) {
  return readme
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 12000);
}

async function fetchRepoFacts(owner, repo) {
  let meta;
  try {
    meta = (await gh.get(`/repos/${owner}/${repo}`)).data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) throw new Error('Repo not found. Is it public?');
    if (status === 403 || status === 429) throw new Error('GitHub is rate-limiting us right now. Try again in a few minutes.');
    throw new Error('Could not reach GitHub.');
  }
  if (meta.private) throw new Error('Only public repos are supported.');

  const [langs, readmeRes, pkgRes] = await Promise.all([
    gh.get(`/repos/${owner}/${repo}/languages`).then((r) => r.data).catch(() => ({})),
    gh.get(`/repos/${owner}/${repo}/readme`, { headers: { Accept: 'application/vnd.github.raw+json' }, responseType: 'text' }).then((r) => String(r.data)).catch(() => ''),
    gh.get(`/repos/${owner}/${repo}/contents/package.json`, { headers: { Accept: 'application/vnd.github.raw+json' }, responseType: 'text' }).then((r) => String(r.data)).catch(() => ''),
  ]);

  let pkg = null;
  try {
    pkg = pkgRes ? JSON.parse(pkgRes) : null;
  } catch {
    pkg = null;
  }
  const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, bytes]) => ({ name, pct: Math.round((bytes / totalBytes) * 100) }));

  const commands = extractCommands(readmeRes);
  if (pkg?.name && !pkg.private && !commands.some((c) => c.includes(pkg.name))) commands.unshift(`npm i ${pkg.name}`);

  return {
    type: 'repo',
    url: `https://github.com/${meta.full_name}`,
    displayUrl: `github.com/${meta.full_name}`,
    name: meta.name,
    owner: meta.owner?.login || owner,
    description: (meta.description || '').trim(),
    homepage: meta.homepage || '',
    topics: (meta.topics || []).slice(0, 10),
    license: meta.license?.spdx_id || '',
    language: meta.language || languages[0]?.name || '',
    languages,
    numbers: [
      { key: 'stars', label: 'GitHub stars', value: meta.stargazers_count || 0 },
      { key: 'forks', label: 'forks', value: meta.forks_count || 0 },
      { key: 'watchers', label: 'watchers', value: meta.subscribers_count || 0 },
      { key: 'languages', label: 'languages', value: Object.keys(langs).length },
    ],
    commands,
    snippets: extractSnippets(readmeRes),
    headings: extractHeadings(readmeRes),
    readme: cleanReadme(readmeRes),
    packageKeywords: Array.isArray(pkg?.keywords) ? pkg.keywords.slice(0, 10) : [],
  };
}

// Runs a Carbon Video script in a child process (no shell) and returns the
// last JSON line it printed.
function runVideoScript(script, args, { timeoutMs = 120000, onLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [path.join(VIDEO_APP, 'scripts', script), ...args], {
      cwd: VIDEO_APP,
      timeout: timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
      windowsHide: true,
    }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${script} failed: ${(stderr || err.message).trim().split('\n').slice(-3).join(' ')}`));
      const lines = stdout.trim().split('\n').filter(Boolean);
      try {
        resolve(JSON.parse(lines[lines.length - 1]));
      } catch {
        reject(new Error(`${script} printed no result`));
      }
    });
    if (onLine) {
      let buf = '';
      child.stdout.on('data', (d) => {
        buf += d;
        const parts = buf.split('\n');
        buf = parts.pop();
        parts.forEach((l) => {
          try {
            onLine(JSON.parse(l));
          } catch {
            /* not a JSON line */
          }
        });
      });
    }
  });
}

async function fetchSiteFacts(url, workDir) {
  const facts = await runVideoScript('capture-site.mjs', [url, workDir], { timeoutMs: 90000 });
  const host = new URL(facts.url || url).hostname.replace(/^www\./, '');
  // "Vite | Next Generation Frontend Tooling" → "Vite"; fall back to og:site_name, then host.
  const fromTitle = (facts.title || '').split(/\s[|–—:-]\s|\s·\s/)[0].trim();
  const name = (fromTitle && fromTitle.length <= 24 ? fromTitle : facts.siteName || host).trim().slice(0, 40);
  return {
    type: 'site',
    url: facts.url || url,
    displayUrl: host,
    name,
    description: facts.description || facts.paragraphs?.[0] || '',
    h1: facts.h1 || '',
    headings: facts.headings || [],
    paragraphs: facts.paragraphs || [],
    brand: facts.brand || {},
    hero: facts.hero,
    section: facts.section || facts.hero,
    numbers: [],
    commands: [],
    snippets: [],
  };
}

// Facts for a parsed input ({ type, url }); site screenshots go into workDir.
async function readFacts(type, url, workDir) {
  if (type === 'repo') {
    const [, owner, repo] = new URL(url).pathname.split('/');
    return fetchRepoFacts(owner, repo);
  }
  return fetchSiteFacts(url, workDir);
}

module.exports = { readFacts, fetchRepoFacts, fetchSiteFacts, runVideoScript, extractSnippets, extractCommands, extractHeadings, VIDEO_APP };
