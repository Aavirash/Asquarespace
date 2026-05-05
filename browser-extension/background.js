const SUPABASE_URL = 'https://seceezshzzkxoqllbosw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9uq_CY2KsPns9dtogTVbyA_5wlvxA3e';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-to-asquarespace',
      title: 'Save to Asquarespace',
      contexts: ['image', 'page', 'link'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-asquarespace' && tab && tab.id) {
    let itemData = null;
    if (info.srcUrl) {
      itemData = { src: info.srcUrl, pageUrl: info.pageUrl, title: extractFileName(info.srcUrl) };
    } else if (info.linkUrl) {
      itemData = { src: info.linkUrl, pageUrl: info.pageUrl, title: extractFileName(info.linkUrl) };
    } else {
      itemData = { src: info.pageUrl, pageUrl: info.pageUrl, title: tab?.title || 'Web Page' };
    }
    try {
      chrome.tabs.sendMessage(tab.id, { action: 'saveItem', item: itemData });
    } catch (e) {
      // Tab might not have content script injected
    }
  }
});

function extractFileName(url) {
  try { return decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Untitled'; }
  catch { return 'Untitled'; }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    if (msg.action === 'getAuth') {
      chrome.storage.local.get(['asq_user', 'asq_token'], (result) => {
        sendResponse({ user: result.asq_user || null, token: result.asq_token || null });
      });
      return true;
    }
    if (msg.action === 'setAuth') {
      chrome.storage.local.set({ asq_user: msg.user, asq_token: msg.token }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'clearAuth') {
      chrome.storage.local.remove(['asq_user', 'asq_token'], () => {
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'getPendingEmail') {
      chrome.storage.local.get(['asq_pending_email'], (result) => {
        sendResponse({ email: result.asq_pending_email || null });
      });
      return true;
    }
    if (msg.action === 'setPendingEmail') {
      chrome.storage.local.set({ asq_pending_email: msg.email, asq_last_email: msg.email }, () => {
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'getLastEmail') {
      chrome.storage.local.get(['asq_last_email'], (result) => {
        sendResponse({ email: result.asq_last_email || null });
      });
      return true;
    }
    if (msg.action === 'clearPending') {
      chrome.storage.local.remove(['asq_pending_email'], () => {
        sendResponse({ ok: true });
      });
      return true;
    }
    if (msg.action === 'supabaseRequest') {
      supabaseFetch(msg.endpoint, msg.options)
        .then((data) => sendResponse(data))
        .catch((err) => sendResponse({ error: err.message }));
      return true;
    }
    if (msg.action === 'showToast' && sender.tab) {
      try {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'showToast', message: msg.message });
      } catch (e) {}
      sendResponse({ ok: true });
      return true;
    }
  } catch (e) {
    console.error('background onMessage error:', e);
    sendResponse({ error: e.message });
  }
  return false;
});

async function supabaseFetch(endpoint, options = {}) {
  const { asq_token } = await new Promise(r => chrome.storage.local.get(['asq_token'], r));
  if (!asq_token) throw new Error('No auth token');
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${asq_token}`,
    ...(options.headers || {}),
  };
  if (options.method === 'POST') {
    headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  }
  console.log(`[supabase] ${options.method} ${endpoint}`);
  const res = await fetch(`${SUPABASE_URL}${endpoint}`, { ...options, headers });
  console.log(`[supabase] ${res.status} ${res.statusText}`);
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[supabase] Error:`, errText);
    throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
  }
  if (res.status === 204) return {};
  const data = await res.json().catch(() => null);
  return data;
}
