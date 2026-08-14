// ============================================================
//  Carbon Chrome Extension — GitHub Injected Content Script
//  Adds an "Explain with Carbon" button directly on GitHub repos.
// ============================================================

(function () {
  const DEFAULT_WEB_URL = 'https://carbons.codes';

  function injectCarbonButton() {
    // Only inject on repo root or repo pages
    const match = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)/);
    if (!match) return;

    // Avoid injecting multiple times
    if (document.getElementById('carbon-github-btn')) return;

    // Target the repo navigation actions header or file navigation header
    const pageActions = document.querySelector('.pagehead-actions') || 
                        document.querySelector('#repo-stars-counter-star')?.closest('ul') ||
                        document.querySelector('.file-navigation');

    if (!pageActions) return;

    const owner = match[1];
    const repo = match[2];
    const fullRepoUrl = `https://github.com/${owner}/${repo}`;

    const li = document.createElement('li');
    li.id = 'carbon-github-btn-container';

    const btn = document.createElement('a');
    btn.id = 'carbon-github-btn';
    btn.className = 'btn btn-sm carbon-injected-btn';
    btn.href = '#';
    btn.title = 'Explain this codebase with Carbon AI';
    btn.innerHTML = `
      <span class="carbon-btn-glow"></span>
      <span class="carbon-icon">🧠</span>
      <span class="carbon-label">Explain with Carbon</span>
    `;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get({ webUrl: DEFAULT_WEB_URL }, (res) => {
          const baseUrl = (res.webUrl || DEFAULT_WEB_URL).replace(/\/+$/, '');
          window.open(`${baseUrl}/?repo=${encodeURIComponent(fullRepoUrl)}`, '_blank');
        });
      } else {
        window.open(`${DEFAULT_WEB_URL}/?repo=${encodeURIComponent(fullRepoUrl)}`, '_blank');
      }
    });

    li.appendChild(btn);

    // Insert at start of actions or into file navigation
    if (pageActions.classList.contains('pagehead-actions')) {
      pageActions.insertBefore(li, pageActions.firstChild);
    } else if (pageActions.classList.contains('file-navigation')) {
      btn.style.marginLeft = '8px';
      pageActions.appendChild(btn);
    } else {
      pageActions.appendChild(li);
    }
  }

  // Run on initial load
  injectCarbonButton();

  // Handle GitHub Turbo / SPA page transitions
  document.addEventListener('turbo:load', injectCarbonButton);
  document.addEventListener('pjax:end', injectCarbonButton);

  // Observer fallback for dynamic navigations
  const observer = new MutationObserver(() => {
    injectCarbonButton();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
