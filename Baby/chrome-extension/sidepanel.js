// ============================================================
//  sidepanel.js — Carbon AI Learning Companion Controller
// ============================================================

const DEFAULT_BACKEND_URL = 'http://localhost:3002';
const DEFAULT_WEB_URL = 'https://carbons.codes';

let currentTabContext = {
  title: '',
  url: '',
  domain: '',
  selectedText: '',
  pageExcerpt: ''
};

let conversationHistory = [];
let backendUrl = DEFAULT_BACKEND_URL;
let webUrl = DEFAULT_WEB_URL;
let lastFailedQuery = null;

// ── 1. DOM Elements ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const queryInput = document.getElementById('query-input');
  const sendQueryBtn = document.getElementById('send-query-btn');
  const quickChips = document.querySelectorAll('.action-chip');
  const pageDomainText = document.getElementById('page-domain-text');
  const pageTitleText = document.getElementById('page-title-text');
  const selectedTextBox = document.getElementById('selected-text-box');
  const selectionPreviewText = document.getElementById('selection-preview-text');
  const analyzePageBtn = document.getElementById('analyze-page-btn');
  const explainSelectionBtn = document.getElementById('explain-selection-btn');
  const refreshPageBtn = document.getElementById('refresh-page-btn');
  const loadingState = document.getElementById('loading-state');
  const errorCard = document.getElementById('error-card');
  const errorTitle = document.getElementById('error-title');
  const errorDesc = document.getElementById('error-desc');
  const retryBtn = document.getElementById('retry-btn');
  const conversationContainer = document.getElementById('conversation-container');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const openFullWebBtn = document.getElementById('open-full-web-btn');
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const backendUrlInput = document.getElementById('backend-url-input');
  const webUrlInput = document.getElementById('web-url-input');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const historyToggleBtn = document.getElementById('history-toggle-btn');
  const historyPanel = document.getElementById('history-panel');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const historyList = document.getElementById('history-list');

  // Load config & history
  const savedConfig = await chrome.storage.local.get({
    backendUrl: DEFAULT_BACKEND_URL,
    webUrl: DEFAULT_WEB_URL,
    conversationHistory: [],
    recentHistory: []
  });

  backendUrl = savedConfig.backendUrl || DEFAULT_BACKEND_URL;
  webUrl = savedConfig.webUrl || DEFAULT_WEB_URL;
  conversationHistory = savedConfig.conversationHistory || [];

  backendUrlInput.value = backendUrl;
  webUrlInput.value = webUrl;
  openFullWebBtn.href = webUrl;

  // Render restored conversation
  if (conversationHistory.length > 0) {
    conversationHistory.forEach(item => appendResponseCard(item, false));
  }

  // Sync active tab context
  await syncActiveTab();

  // Check for pending context menu actions
  checkPendingActions();

  // ── 2. Event Listeners ────────────────────────────────────────

  // Send query via button
  sendQueryBtn.addEventListener('click', () => {
    const text = queryInput.value.trim();
    if (!text) return;
    runQuery(text, 'explain');
    queryInput.value = '';
  });

  // Send query via Enter key (Shift+Enter for newline)
  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = queryInput.value.trim();
      if (!text) return;
      runQuery(text, 'explain');
      queryInput.value = '';
    }
  });

  // Quick Action Chips
  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const mode = chip.getAttribute('data-mode');
      handleQuickAction(mode);
    });
  });

  // Analyze page button
  analyzePageBtn.addEventListener('click', () => {
    handleQuickAction('page_explain');
  });

  // Explain selection button
  explainSelectionBtn.addEventListener('click', () => {
    if (currentTabContext.selectedText) {
      runQuery(currentTabContext.selectedText, 'explain');
    }
  });

  // Refresh tab sync
  refreshPageBtn.addEventListener('click', async () => {
    await syncActiveTab();
  });

  // Clear chat
  clearChatBtn.addEventListener('click', async () => {
    conversationContainer.innerHTML = '';
    conversationHistory = [];
    await chrome.storage.local.set({ conversationHistory: [] });
  });

  // Retry failed query
  retryBtn.addEventListener('click', () => {
    if (lastFailedQuery) {
      errorCard.classList.add('hidden');
      runQuery(lastFailedQuery.query, lastFailedQuery.mode);
    }
  });

  // Settings Panel Toggle
  settingsToggleBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('hidden');
    historyPanel.classList.add('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });

  saveSettingsBtn.addEventListener('click', async () => {
    backendUrl = backendUrlInput.value.trim() || DEFAULT_BACKEND_URL;
    webUrl = webUrlInput.value.trim() || DEFAULT_WEB_URL;
    openFullWebBtn.href = webUrl;
    await chrome.storage.local.set({ backendUrl, webUrl });
    settingsPanel.classList.add('hidden');
  });

  // History Panel Toggle
  historyToggleBtn.addEventListener('click', async () => {
    historyPanel.classList.toggle('hidden');
    settingsPanel.classList.add('hidden');
    renderHistoryDrawer();
  });

  closeHistoryBtn.addEventListener('click', () => {
    historyPanel.classList.add('hidden');
  });

  // Listen for real-time trigger messages from background script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'CARBON_ACTION_TRIGGERED' && msg.payload) {
      handleIncomingAction(msg.payload);
    }
  });

  // ── 3. Helper Functions ───────────────────────────────────────

  async function syncActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs || tabs.length === 0) return;

      const tab = tabs[0];
      currentTabContext.title = tab.title || 'Active Webpage';
      currentTabContext.url = tab.url || '';

      try {
        const parsed = new URL(tab.url);
        currentTabContext.domain = parsed.hostname;
      } catch {
        currentTabContext.domain = 'local';
      }

      pageTitleText.textContent = currentTabContext.title;
      pageDomainText.textContent = currentTabContext.domain;

      // Extract highlighted selection from page if permitted
      if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString()
          });

          if (results && results[0] && results[0].result && results[0].result.trim()) {
            currentTabContext.selectedText = results[0].result.trim();
            selectionPreviewText.textContent = `"${currentTabContext.selectedText.slice(0, 120)}..."`;
            selectedTextBox.classList.remove('hidden');
            explainSelectionBtn.classList.remove('hidden');
          } else {
            currentTabContext.selectedText = '';
            selectedTextBox.classList.add('hidden');
            explainSelectionBtn.classList.add('hidden');
          }
        } catch {
          // Scripting might be restricted on certain internal URLs
        }
      }
    } catch (err) {
      console.log('Tab sync notice:', err);
    }
  }

  function handleQuickAction(mode) {
    let queryText = '';

    if (mode === 'page_explain') {
      queryText = `Explain this page: ${currentTabContext.title}`;
    } else if (mode === 'summarize') {
      queryText = currentTabContext.selectedText 
        ? `Summarize this: ${currentTabContext.selectedText}`
        : `Summarize this page: ${currentTabContext.title}`;
    } else if (mode === 'teach') {
      queryText = currentTabContext.selectedText
        ? `Teach me this concept: ${currentTabContext.selectedText}`
        : `Teach me the core concepts of: ${currentTabContext.title}`;
    } else if (mode === 'lessons') {
      queryText = currentTabContext.selectedText
        ? `Find lessons for: ${currentTabContext.selectedText}`
        : `Find learning roadmap & lessons for: ${currentTabContext.title}`;
    } else if (mode === 'simplify') {
      queryText = currentTabContext.selectedText
        ? `Simplify this: ${currentTabContext.selectedText}`
        : `Explain simply in ELI5: ${currentTabContext.title}`;
    } else if (mode === 'example') {
      queryText = currentTabContext.selectedText
        ? `Show code examples for: ${currentTabContext.selectedText}`
        : `Show practical code examples for: ${currentTabContext.title}`;
    }

    runQuery(queryText, mode);
  }

  async function checkPendingActions() {
    const data = await chrome.storage.local.get(['pendingAction']);
    if (data && data.pendingAction) {
      const action = data.pendingAction;
      // Clear pending action so it doesn't repeat
      await chrome.storage.local.remove('pendingAction');
      handleIncomingAction(action);
    }
  }

  function handleIncomingAction(action) {
    if (!action || !action.text) return;
    runQuery(action.text, action.mode || 'explain');
  }

  async function runQuery(query, mode = 'explain') {
    lastFailedQuery = { query, mode };
    errorCard.classList.add('hidden');
    loadingState.classList.remove('hidden');

    const loadingMsg = document.getElementById('loading-text-msg');
    if (mode === 'teach') loadingMsg.textContent = 'Preparing interactive lesson with AI Carbon...';
    else if (mode === 'summarize') loadingMsg.textContent = 'Generating executive summary...';
    else if (mode === 'lessons') loadingMsg.textContent = 'Discovering matching learning content...';
    else loadingMsg.textContent = 'Synthesizing response with AI Carbon...';

    const payload = {
      query: query,
      mode: mode,
      context: {
        title: currentTabContext.title,
        url: currentTabContext.url,
        domain: currentTabContext.domain,
        selectedText: currentTabContext.selectedText
      }
    };

    try {
      const response = await fetch(`${backendUrl}/api/companion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Try fallback to /api/chat
        const fallbackRes = await fetch(`${backendUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query, repoUrl: currentTabContext.url })
        });

        if (!fallbackRes.ok) {
          throw new Error(`HTTP error ${response.status}: Failed to get answer from Carbon backend.`);
        }

        const fallbackData = await fallbackRes.json();
        handleSuccessResponse(query, mode, fallbackData.answer || 'No response generated.');
        return;
      }

      const data = await response.json();
      handleSuccessResponse(query, mode, data.answer || 'No response generated.');

    } catch (err) {
      console.error('Carbon Companion Error:', err);
      loadingState.classList.add('hidden');
      errorTitle.textContent = 'Could not reach Carbon Backend';
      errorDesc.textContent = `${err.message} (Is your Carbon server running at ${backendUrl}?)`;
      errorCard.classList.remove('hidden');
    }
  }

  async function handleSuccessResponse(query, mode, answerText) {
    loadingState.classList.add('hidden');

    const responseItem = {
      id: Date.now(),
      query: query,
      mode: mode,
      answer: answerText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pageTitle: currentTabContext.title
    };

    appendResponseCard(responseItem, true);

    // Save to conversation and history
    conversationHistory.push(responseItem);
    await chrome.storage.local.set({ conversationHistory });

    const stored = await chrome.storage.local.get({ recentHistory: [] });
    const recent = stored.recentHistory || [];
    recent.unshift(responseItem);
    await chrome.storage.local.set({ recentHistory: recent.slice(0, 30) });
  }

  function appendResponseCard(item, scroll = true) {
    const card = document.createElement('div');
    card.className = 'response-card';

    const modeLabels = {
      explain: '✦ EXPLAIN',
      simplify: '⚡ SIMPLIFY',
      example: '💻 EXAMPLE',
      teach: '◎ TEACH ME',
      summarize: '◈ SUMMARY',
      page_explain: '✦ PAGE ANALYSIS',
      lessons: '🔎 LESSONS'
    };

    const formattedMarkdown = renderMarkdown(item.answer);

    card.innerHTML = `
      <div class="response-header-row">
        <span class="mode-tag">${modeLabels[item.mode] || '✦ CARBON'}</span>
        <div class="response-actions">
          <button class="mini-action-btn copy-btn" title="Copy response">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </div>
      <div class="query-user-bubble">
        ${escapeHtml(item.query)}
      </div>
      <div class="markdown-content">
        ${formattedMarkdown}
      </div>
    `;

    // Copy action
    const copyBtn = card.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(item.answer);
      copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      }, 2000);
    });

    conversationContainer.appendChild(card);

    if (scroll) {
      card.scrollIntoView({ behavior: 'smooth' });
    }
  }

  async function renderHistoryDrawer() {
    const data = await chrome.storage.local.get({ recentHistory: [] });
    const list = data.recentHistory || [];

    if (list.length === 0) {
      historyList.innerHTML = `<div class="empty-state">No recent explanations yet.</div>`;
      return;
    }

    historyList.innerHTML = list.map(item => `
      <div class="history-card" data-id="${item.id}" style="background: rgba(18, 24, 48, 0.7); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px; cursor: pointer; margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
          <span style="font-size:10px; font-weight:700; color:var(--accent-cyan); text-transform:uppercase;">${item.mode}</span>
          <span style="font-size:10px; color:var(--text-faint);">${item.timestamp || ''}</span>
        </div>
        <div style="font-size:12px; font-weight:600; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escapeHtml(item.query)}
        </div>
      </div>
    `).join('');

    historyList.querySelectorAll('.history-card').forEach(hCard => {
      hCard.addEventListener('click', () => {
        const id = Number(hCard.getAttribute('data-id'));
        const found = list.find(l => l.id === id);
        if (found) {
          appendResponseCard(found, true);
          historyPanel.classList.add('hidden');
        }
      });
    });
  }

  // ── 4. Lightweight Markdown Parser ────────────────────────────
  function renderMarkdown(text) {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks with syntax formatting
    html = html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h3>$1</h3>');

    // Bold & Italics
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');

    // Line breaks & Paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');
    html = html.replace(/\n/g, '<br />');

    // Details / Summary for interactive Quiz Questions
    html = html.replace(/&lt;details&gt;&lt;summary&gt;(.*?)&lt;\/summary&gt;([\s\S]*?)&lt;\/details&gt;/gim, (match, summary, content) => {
      return `<details><summary>${summary}</summary>${content}</details>`;
    });

    return `<p>${html}</p>`;
  }

  function escapeHtml(string) {
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
});
