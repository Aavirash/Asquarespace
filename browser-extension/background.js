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
  const STATE_TABLE = 'user_workspace_state';
  const X_COLLECTION_NAME = 'X Bookmarks';

  try {
    // 1. Fetch current state from Supabase
    const stateResp = await supabaseFetch(
      `/rest/v1/${STATE_TABLE}?select=*&user_id=eq.${encodeURIComponent(authState.user.id)}&board_key=eq.default%3A%3Aspace2-global`,
      { method: 'GET' }
    );

    let existingItems = [];
    let existingCollections = [];
    if (Array.isArray(stateResp) && stateResp.length > 0 && stateResp[0]?.space2_state) {
      existingItems = stateResp[0].space2_state.items || [];
      existingCollections = stateResp[0].space2_state.collections || [];
    }

    // 2. Ensure "X Bookmarks" collection exists
    let xCol = existingCollections.find(c => c.name === X_COLLECTION_NAME);
    if (!xCol) {
      xCol = { id: `col-${Date.now()}`, name: X_COLLECTION_NAME, itemIds: [] };
      existingCollections.push(xCol);
    }

    // 3. Fetch metadata for each URL and create items
    const existingUrls = new Set(existingItems.map(i => i.src));
    const newItems = [];
    const now = Date.now();

    for (const url of urls) {
      if (existingUrls.has(url)) continue;

      let meta = { title: '', description: '', image: '' };
      const isYouTube = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)/i.test(url);

      if (isYouTube) {
        const ytId = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (ytId) {
          meta.title = 'YouTube Video';
          meta.image = `https://img.youtube.com/vi/${ytId[1]}/hqdefault.jpg`;
        }
      } else {
        try {
          meta = await fetchUrlMetadataExt(url);
        } catch (e) {
          console.warn('Metadata fetch failed for:', url, e);
        }
      }

      const itemId = `item-${now}-${Math.floor(Math.random() * 99999)}`;
      const item = {
        id: itemId,
        src: url,
        filePath: '',
        cloudPath: '',
        browserBlobKey: '',
        signedUrlExpiresAt: 0,
        mediaType: isYouTube ? 'youtube' : 'url',
        thumbnailUrl: meta.image || '',
        pageUrl: url,
        title: meta.title || url,
        description: meta.description || '',
        collectionIds: [xCol.id],
        createdAt: now,
        updatedAt: now,
        aiMetaState: 'done'
      };

      newItems.push(item);
      xCol.itemIds.push(itemId);
      existingUrls.add(url);
    }

    if (newItems.length === 0) {
      return { success: true, count: 0, message: 'All bookmarks already synced' };
    }

    // 4. Upsert combined state
    const updatedState = {
      items: [...newItems, ...existingItems],
      collections: existingCollections,
      savedAt: Date.now()
    };

    await supabaseFetch(`/rest/v1/${STATE_TABLE}?on_conflict=user_id,board_key`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: authState.user.id,
        board_key: 'default::space2-global',
        board_id: 'space2-global',
        project_key: '',
        canvas_state: {},
        space2_state: updatedState,
        updated_at: new Date().toISOString()
      })
    });

    return { success: true, count: newItems.length };
  } catch (err) {
    console.error('importXBookmarks error:', err);
    return { success: false, error: err.message };
  }
}

async function fetchUrlMetadataExt(url) {
  // For extension: try to fetch OG tags directly (background has no CORS)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (!res.ok) return { title: '', description: '', image: '' };

    const html = await res.text();
    const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i);
    const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    return {
      title: titleMatch ? titleMatch[1] : '',
      description: descMatch ? descMatch[1] : '',
      image: imgMatch ? imgMatch[1] : ''
    };
  } catch (e) {
    clearTimeout(timeout);
    return { title: '', description: '', image: '' };
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
