// ============================================================
//  background.js — Carbon Chrome Extension Background Worker
// ============================================================

// 1. Initialize Context Menus & Side Panel Behavior on Install
chrome.runtime.onInstalled.addListener(() => {
  // Setup Side Panel behavior (opens sidepanel when icon clicked in supported Chrome versions)
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((err) => console.log('Side panel behavior setup:', err));
  }

  // Remove existing menus first to prevent duplication errors
  chrome.contextMenus.removeAll(() => {
    // Parent Menu
    chrome.contextMenus.create({
      id: 'carbon-parent',
      title: 'Ask Carbon',
      contexts: ['selection', 'page', 'link']
    });

    // Sub-actions
    chrome.contextMenus.create({
      id: 'carbon-explain',
      parentId: 'carbon-parent',
      title: '✦ Explain',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'carbon-simplify',
      parentId: 'carbon-parent',
      title: '◈ Simplify (ELI5)',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'carbon-example',
      parentId: 'carbon-parent',
      title: '⚡ Give an Example',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'carbon-teach',
      parentId: 'carbon-parent',
      title: '◎ Teach Me',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'carbon-lesson',
      parentId: 'carbon-parent',
      title: '🔎 Find Related Lesson',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'carbon-explain-page',
      parentId: 'carbon-parent',
      title: '✦ Explain This Entire Page',
      contexts: ['page']
    });
  });
});

// 2. Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let mode = 'explain';
  let queryText = info.selectionText ? info.selectionText.trim() : '';

  if (info.menuItemId === 'carbon-simplify') mode = 'simplify';
  else if (info.menuItemId === 'carbon-example') mode = 'example';
  else if (info.menuItemId === 'carbon-teach') mode = 'teach';
  else if (info.menuItemId === 'carbon-lesson') mode = 'lessons';
  else if (info.menuItemId === 'carbon-explain-page') {
    mode = 'page_explain';
    queryText = tab?.title ? `Explain page: ${tab.title}` : 'Explain this webpage';
  }

  const payload = {
    text: queryText,
    mode: mode,
    pageTitle: tab?.title || '',
    pageUrl: tab?.url || '',
    timestamp: Date.now()
  };

  // Save pending query in storage
  await chrome.storage.local.set({ pendingAction: payload });

  // Open side panel if available
  if (tab?.id && chrome.sidePanel && chrome.sidePanel.open) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (err) {
      console.log('Side panel open error (fallback to storage):', err);
    }
  }

  // Notify side panel if it's already open
  chrome.runtime.sendMessage({
    type: 'CARBON_ACTION_TRIGGERED',
    payload: payload
  }).catch(() => {
    // Side panel wasn't open yet, it will read from storage on mount
  });
});

// 3. Handle incoming extension messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_ACTIVE_TAB_CONTEXT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        sendResponse({ tab: tabs[0] });
      } else {
        sendResponse({ tab: null });
      }
    });
    return true; // Keep channel open for async response
  }
});
