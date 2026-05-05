(function () {
  if (window.__asq_ext_loaded) return;
  window.__asq_ext_loaded = true;

  let saveBtn = null;
  let hoveredMedia = null;
  let toast = null;
  let btnHovered = false;

  // ── Hover save button ─────────────────────────────────────────
  function createSaveButton() {
    try {
      saveBtn = document.createElement('div');
      saveBtn.className = 'asq-save-btn';
      saveBtn.innerHTML = `<div class="asq-btn-sheen"></div><img src="${chrome.runtime.getURL('assets/icon-32.png')}" alt="Save">`;
    } catch (e) {
      if (e.message && e.message.includes('context invalidated')) {
        console.warn('[asq] Extension reloaded, content script stale — reload page to reactivate');
        return;
      }
      throw e;
    }
    saveBtn.addEventListener('mouseenter', () => { btnHovered = true; });
    saveBtn.addEventListener('mouseleave', () => { btnHovered = false; });
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (hoveredMedia) {
        const el = hoveredMedia.el;
        let src = '';
        if (el.tagName === 'VIDEO') {
          src = el.src || (el.querySelector('source') && el.querySelector('source').src) || '';
        } else {
          src = el.dataset.src || el.src || '';
        }
        const pageUrl = window.location.href;
        const title = el.alt || el.title || extractFileName(src);
        openCollectionDropdown(saveBtn, {
          src, pageUrl, title,
          width: el.naturalWidth || el.videoWidth || el.offsetWidth || 0,
          height: el.naturalHeight || el.videoHeight || el.offsetHeight || 0,
        });
      }
    });
    document.body.appendChild(saveBtn);
  }

  function positionSaveButton(el) {
    if (!saveBtn || !el) { saveBtn.style.display = 'none'; return; }
    const rect = el.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50 || rect.top < 0 || rect.bottom < 0 || rect.left < 0 || rect.right > window.innerWidth) {
      saveBtn.style.display = 'none';
      return;
    }
    saveBtn.style.display = 'flex';
    const btnW = saveBtn.offsetWidth || 32;
    const btnH = saveBtn.offsetHeight || 32;
    let top = rect.top + 8;
    let left = rect.right - btnW - 8;
    if (left < 4) left = rect.left + 8;
    if (top + btnH > window.innerHeight) top = rect.bottom - btnH - 8;
    if (top < 4) top = rect.top + 8;
    saveBtn.style.top = `${top}px`;
    saveBtn.style.left = `${left}px`;
  }

  function hideSaveButton() {
    if (!btnHovered) {
      saveBtn.style.display = 'none';
    }
  }

  // ── Collection dropdown ───────────────────────────────────────
  function openCollectionDropdown(anchor, item) {
    removeDropdown();
    const dd = document.createElement('div');
    dd.className = 'asq-dropdown';
    dd.innerHTML = `<div class="asq-dd-header">Save to collection</div><div class="asq-dd-loading">Loading...</div>`;
    document.body.appendChild(dd);
    const rect = anchor.getBoundingClientRect();
    let ddTop = rect.bottom + 6;
    let ddLeft = Math.min(rect.left, window.innerWidth - 250);
    if (ddTop + 200 > window.innerHeight) ddTop = rect.top - 200;
    if (ddLeft < 8) ddLeft = 8;
    dd.style.top = `${ddTop}px`;
    dd.style.left = `${ddLeft}px`;

    loadCollections().then(({ auth, collections, error }) => {
      const loading = dd.querySelector('.asq-dd-loading');
      if (loading) loading.remove();
      if (error) {
        dd.innerHTML += `<div class="asq-dd-empty" style="color:rgba(239,64,39,0.7)">${error.includes('JWT') ? 'Session expired — reopen popup to sign in again' : 'Error: ' + error.substring(0, 60)}</div>`;
        return;
      }
      if (!auth || !auth.token) {
        dd.innerHTML += '<div class="asq-dd-empty">Not signed in</div>';
        return;
      }
      if (!collections || collections.length === 0) {
        // Add "All Items" option even when no custom collections exist
        const allBtn = document.createElement('button');
        allBtn.className = 'asq-dd-item';
        allBtn.textContent = 'All Items';
        allBtn.addEventListener('click', () => {
          saveItemToCollection(item, '__all__', auth);
          dd.remove();
        });
        dd.appendChild(allBtn);
        const newBtn = document.createElement('button');
        newBtn.className = 'asq-dd-item asq-dd-new';
        newBtn.textContent = '+ New collection';
        newBtn.addEventListener('click', () => {
          const name = prompt('Collection name:');
          if (name && name.trim()) {
            createAndSave(item, name.trim(), auth);
            dd.remove();
          }
        });
        dd.appendChild(newBtn);
      } else {
        // "All Items" at the very top
        const allBtn = document.createElement('button');
        allBtn.className = 'asq-dd-item';
        allBtn.textContent = 'All Items';
        allBtn.addEventListener('click', () => {
          saveItemToCollection(item, '__all__', auth);
          dd.remove();
        });
        dd.appendChild(allBtn);
        collections.forEach(col => {
          const btn = document.createElement('button');
          btn.className = 'asq-dd-item';
          btn.textContent = col.name;
          btn.addEventListener('click', () => {
            saveItemToCollection(item, col.id, auth);
            dd.remove();
          });
          dd.appendChild(btn);
        });
        const newBtn = document.createElement('button');
        newBtn.className = 'asq-dd-item asq-dd-new';
        newBtn.textContent = '+ New collection';
        newBtn.addEventListener('click', () => {
          const name = prompt('Collection name:');
          if (name && name.trim()) {
            createAndSave(item, name.trim(), auth);
            dd.remove();
          }
        });
        dd.appendChild(newBtn);
      }
    });

    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', handler); }
      });
    }, 50);
  }

  function removeDropdown() {
    document.querySelectorAll('.asq-dropdown').forEach(d => d.remove());
  }

  // ── Safe messaging wrapper ─────────────────────────────────────
  function sendBg(msg, cb) {
    try {
      chrome.runtime.sendMessage(msg, cb);
    } catch (e) {
      console.warn('[asq] Extension context invalidated:', e.message);
      cb && cb({ error: 'Extension reloaded — reload page' });
    }
  }

  // ── BroadcastChannel for cross-tab sync ────────────────────────
  const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('asq-space2-sync') : null;

  function loadCollections() {
    return new Promise((resolve) => {
      if (collectionsCache && Date.now() - collectionsCacheTime < 30000) {
        resolve({ auth: authCache, collections: collectionsCache });
        return;
      }
      sendBg({ action: 'getAuth' }, (auth) => {
        if (!auth || !auth.token) {
          authCache = auth;
          resolve({ auth, collections: [] });
          return;
        }
        authCache = auth;
        const space2Key = 'default::space2-global';
        const endpoint = `/rest/v1/user_workspace_state?select=space2_state&user_id=eq.${encodeURIComponent(auth.user.id)}&board_key=eq.${encodeURIComponent(space2Key)}`;
        sendBg({ action: 'supabaseRequest', endpoint, options: { method: 'GET' } }, (resp) => {
          if (resp && resp.error) {
            console.error('loadCollections GET error:', resp);
            const errMsg = typeof resp.error === 'string' ? resp.error : (resp.error.message || JSON.stringify(resp.error));
            authCache = auth;
            collectionsCache = [];
            collectionsCacheTime = Date.now();
            resolve({ auth, collections: [], error: errMsg });
            return;
          }
          const space2State = (Array.isArray(resp) && resp.length > 0 && resp[0]?.space2_state) ? resp[0].space2_state : null;
          collectionsCache = space2State ? (space2State.collections || []) : [];
          collectionsCacheTime = Date.now();
          resolve({ auth, collections: collectionsCache });
        });
      });
    });
  }

  // ── Save logic ────────────────────────────────────────────────
  let collectionsCache = null;
  let collectionsCacheTime = 0;
  let authCache = null;

  function saveItemToCollection(item, collectionId, auth) {
    loadCollections().then(() => {
      // "__all__" means no specific collection — save to main space
      const targetColIds = (collectionId === '__all__') ? [] : [collectionId];
      if (collectionId !== '__all__') {
        const col = collectionsCache.find(c => c.id === collectionId);
        if (!col) { showToast('Collection not found'); return; }
        col.itemIds = col.itemIds || [];
      }
      const newItem = buildItem(item, targetColIds);
      if (collectionId !== '__all__') {
        const col = collectionsCache.find(c => c.id === collectionId);
        col.itemIds.push(newItem.id);
      }
      upsertState(auth, collectionsCache, newItem);
    });
  }

  function createAndSave(item, name, auth) {
    loadCollections().then(() => {
      const newCol = { id: `col-${Date.now()}`, name, itemIds: [] };
      const cols = (collectionsCache || []).concat([newCol]);
      const newItem = buildItem(item, [newCol.id]);
      newCol.itemIds = [newItem.id];
      upsertState(auth, cols, newItem);
      showToast(`Saved to "${name}"`);
    });
  }

  function buildItem(item, collectionIds) {
    return {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
      src: item.src, filePath: '', cloudPath: '', browserBlobKey: '',
      signedUrlExpiresAt: 0, mediaType: detectMediaType(item.src),
      thumbnailUrl: item.src, pageUrl: item.pageUrl,
      title: item.title, description: '',
      width: item.width || 0, height: item.height || 0,
      collectionIds, createdAt: Date.now(), updatedAt: Date.now(),
    };
  }

  function upsertState(auth, collections, newItem) {
    if (!auth || !auth.token) { showToast('Not signed in'); return; }
    const userId = auth.user?.id;
    if (!userId) { showToast('Auth error: no user ID'); return; }
    const space2Key = 'default::space2-global';

    // First fetch existing state
    sendBg({
      action: 'supabaseRequest',
      endpoint: `/rest/v1/user_workspace_state?select=space2_state&user_id=eq.${encodeURIComponent(userId)}&board_key=eq.${encodeURIComponent(space2Key)}`,
      options: { method: 'GET' },
    }, (resp) => {
      if (resp?.error) {
        console.error('GET state failed:', resp);
        showToast('Save failed: ' + resp.error);
        return;
      }
      const existingItems = (Array.isArray(resp) && resp.length > 0 && resp[0]?.space2_state)
        ? (resp[0].space2_state.items || []) : [];
      const updatedState = {
        items: [newItem].concat(existingItems),
        collections,
        savedAt: Date.now(),
      };
      sendBg({
        action: 'supabaseRequest',
        endpoint: '/rest/v1/user_workspace_state?on_conflict=user_id,board_key',
        options: {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            board_key: space2Key,
            board_id: 'space2-global',
            project_key: '',
            canvas_state: {},
            space2_state: updatedState,
            updated_at: new Date().toISOString(),
          }),
        },
      }, (result) => {
        if (result?.error) {
          console.error('POST state failed:', result);
          showToast('Save failed: ' + result.error);
          return;
        }
        collectionsCache = collections;
        collectionsCacheTime = Date.now();
        if (syncChannel) {
          syncChannel.postMessage({ action: 'saved', timestamp: Date.now() });
        }
        showToast('Saved!');
      });
    });
  }

  function detectMediaType(url) {
    if (/\.(png|jpg|jpeg|webp|gif|svg|bmp|avif)(\?|#|$)/i.test(url)) return /\.(gif)(\?|#|$)/i.test(url) ? 'gif' : 'image';
    if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) return 'video';
    if (/\.(mp3|wav|m4a|ogg|aac)(\?|#|$)/i.test(url)) return 'audio';
    return 'url';
  }

  function extractFileName(url) {
    try { return decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Image'; }
    catch { return 'Image'; }
  }

  // ── Toast ─────────────────────────────────────────────────────
  function showToast(message) {
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = 'asq-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast) { toast.classList.add('asq-toast-out'); setTimeout(() => toast?.remove(), 300); } }, 2500);
  }

  // ── Context menu listener ─────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'saveItem' && msg.item) {
      openCollectionDropdown(document.body, msg.item);
    }
    if (msg.action === 'showToast' && msg.message) {
      showToast(msg.message);
    }
  });

  // ── Hover detection ───────────────────────────────────────────
  createSaveButton();

  function findMediaEl(target) {
    if (!target) return null;
    const img = target.closest('img');
    if (img && img.src && img.src.startsWith('http') && img.width >= 50 && img.height >= 50) return img;
    const video = target.closest('video');
    if (video) {
      const src = video.poster || video.src || (video.querySelector('source') && video.querySelector('source').src) || '';
      if (src && src.startsWith('http')) return video;
    }
    return null;
  }

  document.addEventListener('mousemove', (e) => {
    const media = findMediaEl(e.target);
    if (media) {
      hoveredMedia = { el: media, src: media.tagName === 'VIDEO' ? (media.poster || media.src) : media.src };
      positionSaveButton(media);
    } else {
      // Check if mouse is on saveBtn - don't hide if so
      if (!btnHovered) {
        hoveredMedia = null;
        saveBtn.style.display = 'none';
      }
    }
  }, { passive: true });

  window.addEventListener('scroll', () => {
    if (saveBtn && hoveredMedia && !btnHovered) positionSaveButton(hoveredMedia.el);
  }, { passive: true });

  // Clean up if media removed
  const observer = new MutationObserver(() => {
    if (hoveredMedia && !document.contains(hoveredMedia.el)) {
      hoveredMedia = null;
      if (!btnHovered) saveBtn.style.display = 'none';
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
