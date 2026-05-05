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
      importXBookmarks(msg.tweets, msg.authState)
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

// ── Supabase helpers ────────────────────────────────────────────────────────
async function supabaseFetch(endpoint, options = {}) {
  const { asq_token, asq_refresh_token } = await new Promise(r => chrome.storage.local.get(['asq_token', 'asq_refresh_token'], r));
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    ...(options.headers || {}),
  };
  if (asq_token) {
    headers['Authorization'] = `Bearer ${asq_token}`;
  }
  if (options.method === 'POST') {
    headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  }
  console.log(`[supabase] ${options.method} ${endpoint}`);
  const res = await fetch(`${SUPABASE_URL}${endpoint}`, { ...options, headers });
  console.log(`[supabase] ${res.status} ${res.statusText}`);

  // If JWT expired, try refresh once then retry
  if (res.status === 401) {
    const errText = await res.text().catch(() => '');
    if (errText.includes('JWT expired')) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        // Retry with new token
        const newHeaders = { ...headers };
        const newToken = await new Promise(r => chrome.storage.local.get(['asq_token'], d => r(d.asq_token)));
        if (newToken) newHeaders['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(`${SUPABASE_URL}${endpoint}`, { ...options, headers: newHeaders });
        if (retryRes.status === 204) return {};
        return retryRes.json().catch(() => null);
      }
    }
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`[supabase] Error:`, errText);
    throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
  }
  if (res.status === 204) return {};
  return res.json().catch(() => null);
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

// ── X Bookmarks import ─────────────────────────────────────────────────────
async function importXBookmarks(tweets, authState) {
  const STATE_TABLE = 'user_workspace_state';
  const X_COLLECTION_NAME = 'X Bookmarks';

  try {
    const stored = await new Promise(r => chrome.storage.local.get(['asq_user'], r));
    const userId = stored.asq_user?.id || authState?.user?.id;
    if (!userId) return { success: false, error: 'Not signed in' };

    // 1. Fetch current state
    const stateResp = await supabaseFetch(
      `/rest/v1/${STATE_TABLE}?select=*&user_id=eq.${encodeURIComponent(userId)}&board_key=eq.default%3A%3Aspace2-global`,
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

    // 3. Create items from tweet media
    const existingSrcs = new Set(existingItems.map(i => i.src));
    const newItems = [];
    const now = Date.now();

    for (const tweet of tweets) {
      let itemCount = 0;

      // Images — each image becomes a separate grid item
      for (const imgUrl of tweet.images) {
        if (existingSrcs.has(imgUrl)) continue;
        const itemId = `ximg-${tweet.id}-${itemCount}-${Math.floor(Math.random() * 9999)}`;
        newItems.push({
          id: itemId,
          src: imgUrl,
          filePath: '',
          cloudPath: '',
          browserBlobKey: '',
          signedUrlExpiresAt: 0,
          mediaType: 'image',
          thumbnailUrl: imgUrl,
          pageUrl: tweet.tweetLink,
          title: `${tweet.author} (${tweet.handle})`,
          description: tweet.text,
          collectionIds: [xCol.id],
          createdAt: now - (itemCount * 1000),
          updatedAt: now - (itemCount * 1000),
          aiMetaState: 'done'
        });
        existingSrcs.add(imgUrl);
        xCol.itemIds.push(itemId);
        itemCount++;
      }

      // Videos
      for (const videoUrl of tweet.videos) {
        if (existingSrcs.has(videoUrl)) continue;
        const itemId = `xvid-${tweet.id}-${itemCount}-${Math.floor(Math.random() * 9999)}`;
        newItems.push({
          id: itemId,
          src: videoUrl,
          filePath: '',
          cloudPath: '',
          browserBlobKey: '',
          signedUrlExpiresAt: 0,
          mediaType: 'video',
          thumbnailUrl: '',
          pageUrl: tweet.tweetLink,
          title: `${tweet.author} (${tweet.handle})`,
          description: tweet.text,
          collectionIds: [xCol.id],
          createdAt: now - (itemCount * 1000),
          updatedAt: now - (itemCount * 1000),
          aiMetaState: 'done'
        });
        existingSrcs.add(videoUrl);
        xCol.itemIds.push(itemId);
        itemCount++;
      }

      // GIFs
      for (const gifUrl of tweet.gifs) {
        if (existingSrcs.has(gifUrl)) continue;
        const itemId = `xgif-${tweet.id}-${itemCount}-${Math.floor(Math.random() * 9999)}`;
        newItems.push({
          id: itemId,
          src: gifUrl,
          filePath: '',
          cloudPath: '',
          browserBlobKey: '',
          signedUrlExpiresAt: 0,
          mediaType: 'gif',
          thumbnailUrl: gifUrl,
          pageUrl: tweet.tweetLink,
          title: `${tweet.author} (${tweet.handle})`,
          description: tweet.text,
          collectionIds: [xCol.id],
          createdAt: now - (itemCount * 1000),
          updatedAt: now - (itemCount * 1000),
          aiMetaState: 'done'
        });
        existingSrcs.add(gifUrl);
        xCol.itemIds.push(itemId);
        itemCount++;
      }

      // If no media at all, create a URL item for the tweet
      if (itemCount === 0) {
        if (existingSrcs.has(tweet.tweetLink)) continue;
        const itemId = `xtweet-${tweet.id}-${Math.floor(Math.random() * 9999)}`;
        newItems.push({
          id: itemId,
          src: tweet.tweetLink,
          filePath: '',
          cloudPath: '',
          browserBlobKey: '',
          signedUrlExpiresAt: 0,
          mediaType: 'url',
          thumbnailUrl: '',
          pageUrl: tweet.tweetLink,
          title: `${tweet.author} (${tweet.handle})`,
          description: tweet.text || tweet.tweetLink,
          collectionIds: [xCol.id],
          createdAt: now,
          updatedAt: now,
          aiMetaState: 'done'
        });
        existingSrcs.add(tweet.tweetLink);
        xCol.itemIds.push(itemId);
      }
    }

    if (newItems.length === 0) {
      return { success: true, count: 0, message: 'All already synced' };
    }

    // 4. Upsert state
    const updatedState = {
      items: [...newItems, ...existingItems],
      collections: existingCollections,
      savedAt: Date.now()
    };

    await supabaseFetch(`/rest/v1/${STATE_TABLE}?on_conflict=user_id,board_key`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
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
