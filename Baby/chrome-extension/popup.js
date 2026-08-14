// ============================================================
//  Carbon Chrome Extension — Popup Controller
// ============================================================

const DEFAULT_BACKEND_URL = 'http://localhost:3002';
const DEFAULT_WEB_URL = 'https://carbons.codes';

document.addEventListener('DOMContentLoaded', async () => {
  const repoNameEl = document.getElementById('repo-name');
  const repoUrlDisplayEl = document.getElementById('repo-url-display');
  const analyzeBtn = document.getElementById('analyze-current-btn');
  const openStudioBtn = document.getElementById('open-studio-btn');
  const manualInput = document.getElementById('manual-repo-input');
  const manualBtn = document.getElementById('manual-analyze-btn');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel = document.getElementById('settings-panel');
  const backendUrlInput = document.getElementById('backend-url-input');
  const webUrlInput = document.getElementById('web-url-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const statusBox = document.getElementById('status-box');
  const statusText = document.getElementById('status-text');
  const statusProgressFill = document.getElementById('status-progress-fill');

  let currentDetectedRepoUrl = null;

  // Load configured URLs from chrome storage
  const config = await chrome.storage.local.get({
    backendUrl: DEFAULT_BACKEND_URL,
    webUrl: DEFAULT_WEB_URL
  });

  backendUrlInput.value = config.backendUrl;
  webUrlInput.value = config.webUrl;

  // Settings toggle
  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
  });

  saveSettingsBtn.addEventListener('click', async () => {
    const backendUrl = backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
    const webUrl = webUrlInput.value.trim() || DEFAULT_WEB_URL;
    await chrome.storage.local.set({ backendUrl, webUrl });
    settingsPanel.classList.add('hidden');
  });

  // Detect active tab URL
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const match = tab.url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
      if (match) {
        const owner = match[1];
        const repo = match[2].split(/[#?]/)[0]; // strip query/hash
        currentDetectedRepoUrl = `https://github.com/${owner}/${repo}`;
        
        repoNameEl.textContent = `${owner}/${repo}`;
        repoUrlDisplayEl.textContent = currentDetectedRepoUrl;
        analyzeBtn.disabled = false;
        analyzeBtn.querySelector('.btn-label').textContent = `Analyze ${repo}`;
      }
    }
  } catch (err) {
    console.error('Tab query error:', err);
  }

  // Open full Carbon web app with repo
  function openCarbonStudio(repoUrl) {
    chrome.storage.local.get({ webUrl: DEFAULT_WEB_URL }, (res) => {
      const baseUrl = res.webUrl.replace(/\/+$/, '');
      const targetUrl = repoUrl ? `${baseUrl}/?repo=${encodeURIComponent(repoUrl)}` : baseUrl;
      chrome.tabs.create({ url: targetUrl });
    });
  }

  // Analyze current button
  analyzeBtn.addEventListener('click', () => {
    if (currentDetectedRepoUrl) {
      openCarbonStudio(currentDetectedRepoUrl);
    }
  });

  // Open generic studio
  openStudioBtn.addEventListener('click', () => {
    openCarbonStudio(currentDetectedRepoUrl || '');
  });

  // Manual repo analyze
  manualBtn.addEventListener('click', () => {
    const val = manualInput.value.trim();
    if (val) {
      openCarbonStudio(val);
    }
  });

  manualInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = manualInput.value.trim();
      if (val) {
        openCarbonStudio(val);
      }
    }
  });
});
