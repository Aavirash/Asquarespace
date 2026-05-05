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
      chrome.storage.local.get(['asq_user', 'asq_token', 'asq_refresh_token'], (result) => {
        sendResponse({
          user: result.asq_user || null,
          token: result.asq_token || null,
          refreshToken: result.asq_refresh_token || null,
        });
      });
      return true;
    }
    if (msg.action === 'setAuth') {
      chrome.storage.local.set({
        asq_user: msg.user,
        asq_token: msg.token,
        asq_refresh_token: msg.refreshToken || null,
      }, () => {
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
        .catch(async (err) => {
          if (err.message && (err.message.includes('JWT expired') || err.message.includes('401'))) {
            const refreshed = await tryRefreshToken();
            if (refreshed) {
              supabaseFetch(msg.endpoint, msg.options)
                .then((data) => sendResponse(data))
                .catch((err2) => sendResponse({ error: err2.message }));
              return;
  }
}

async function importXBookmarks(urls, authState) {
  const APP_URL = 'https://asquarespace.com';
  const BATCH_SIZE = 5;

  try {
    let appTab = null;
    const tabs = await chrome.tabs.query({ url: APP_URL + '/*' });
    if (tabs.length > 0) {
      appTab = tabs[0];
      await chrome.tabs.update(appTab.id, { active: true });
    } else {
      appTab = await chrome.tabs.create({ url: APP_URL, active: true });
    }

    await new Promise((resolve) => {
      const listener = (tabId, info) => {
        if (tabId === appTab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, 10000);
    });

    // Inject URLs via window.postMessage
    let imported = 0;
    for (let i = 0; i < urls.length; i += BATCH_SIZE) {
      const batch = urls.slice(i, i + BATCH_SIZE);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: appTab.id },
          func: (urls) => {
            window.postMessage({ source: 'asq-extension', action: 'importXBookmarks', urls }, '*');
          },
          args: [batch],
        });
        imported += batch.length;
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.warn('Batch import failed:', e);
      }
    }

    return { success: true, count: imported };
  } catch (err) {
    console.error('importXBookmarks error:', err);
    return { success: false, error: err.message };
  }
}
          sendResponse({ error: err.message });
        });
      return true;
    }
    if (msg.action === 'showToast' && sender.tab) {
      try {
        chrome.tabs.sendMessage(sender.tab.id, { action: 'showToast', message: msg.message });
      } catch (e) {}
      sendResponse({ ok: true });
      return true;
    }
    if (msg.action === 'importXBookmarks') {
      importXBookmarks(msg.urls, msg.authState)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    }
  } catch (e) {
    console.error('background onMessage error:', e);
    sendResponse({ error: e.message });
  }
  return false;
});

async function supabaseFetch(endpoint, options = {}) {
  const { asq_token, asq_refresh_token } = await new Promise(r => chrome.storage.local.get(['asq_token', 'asq_refresh_token'], r));
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...(options.headers || {}),
  };
  // Only add auth header if we have a token (auth endpoints don't need it)
  if (asq_token) {
    headers['Authorization'] = `Bearer ${asq_token}`;
  }
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

async function tryRefreshToken() {
  const { asq_refresh_token } = await new Promise(r => chrome.storage.local.get(['asq_refresh_token'], r));
  if (!asq_refresh_token) {
    console.warn('[auth] No refresh token stored');
    return false;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: asq_refresh_token }),
    });
    if (!res.ok) {
      console.error('[auth] Refresh failed:', res.status);
      return false;
    }
    const session = await res.json();
    await new Promise(r => chrome.storage.local.set({
      asq_token: session.access_token,
      asq_refresh_token: session.refresh_token,
      asq_user: session.user,
    }, r));
    console.log('[auth] Token refreshed successfully');
    return true;
  } catch (e) {
    console.error('[auth] Refresh error:', e);
    return false;
  }
}
