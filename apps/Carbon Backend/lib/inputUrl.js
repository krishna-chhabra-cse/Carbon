// ============================================================
//  lib/inputUrl.js — Validate what the user pasted.
//  Accepts a public GitHub repo URL or a public http(s) website. Websites are
//  resolved in DNS first so nobody can point our headless browser at
//  localhost, cloud metadata or a private network.
// ============================================================

const dns = require('dns').promises;
const net = require('net');

const GITHUB_RE = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[/?#].*)?$/i;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7));
  return v6 === '::1' || v6 === '::' || /^(fc|fd|fe8|fe9|fea|feb)/.test(v6);
}

// Returns { type: 'repo', owner, repo, url } | { type: 'site', url, host }.
// Throws Error with a user-facing message when the input is not allowed.
async function parseInput(raw, { resolve = dns.lookup } = {}) {
  const text = String(raw || '').trim();
  if (!text || text.length > 300) throw new Error('Paste a GitHub repo or website URL.');

  const gh = text.match(GITHUB_RE);
  if (gh) {
    const [, owner, repo] = gh;
    if (repo.startsWith('.') || owner.startsWith('-')) throw new Error('That GitHub URL looks invalid.');
    return { type: 'repo', owner, repo, url: `https://github.com/${owner}/${repo}` };
  }
  if (/github\.com/i.test(text)) throw new Error('Use a repo URL like https://github.com/owner/repo');

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw new Error('That does not look like a URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) websites are supported.');
  if (url.username || url.password) throw new Error('URLs with credentials are not allowed.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard web ports are supported.');
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host === 'localhost' || /\.(local|internal|localhost)$/.test(host)) {
    throw new Error('Use a public website address.');
  }
  if (net.isIP(host.replace(/^\[|\]$/g, ''))) throw new Error('Use a domain name, not an IP address.');

  let addrs;
  try {
    addrs = await resolve(host, { all: true });
  } catch {
    throw new Error(`Couldn't find ${host}. Check the address.`);
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('Use a public website address.');
  url.hash = '';
  return { type: 'site', url: url.toString(), host };
}

// Roast and Go deeper only take GitHub repos. Returns the normalized URL.
function parseRepo(raw) {
  const text = String(raw || '').trim();
  const gh = text.length <= 300 ? text.match(GITHUB_RE) : null;
  if (!gh || gh[2].startsWith('.') || gh[1].startsWith('-')) {
    throw new Error('Paste a public GitHub repo URL, like https://github.com/owner/repo');
  }
  return `https://github.com/${gh[1]}/${gh[2]}`;
}

// Uploading raw files (the old VS Code extension) is off unless switched on.
const fileUploadsAllowed = () => process.env.ALLOW_FILE_UPLOADS === 'true';

module.exports = { parseRepo, fileUploadsAllowed, parseInput, isPrivateIp };
