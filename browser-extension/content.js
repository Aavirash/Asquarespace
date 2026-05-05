(function () {
  if (window.__asq_ext_loaded) return;
  window.__asq_ext_loaded = true;

  let saveBtn = null;
  let hoveredMedia = null;
  let toast = null;
  let authCache = null;
  let collectionsCache = null;
  let collectionsCacheTime = 0;

  // ── Hover save button ─────────────────────────────────────────
  function createSaveButton() {
    saveBtn = document.createElement('div');
    saveBtn.className = 'asq-save-btn';
    saveBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline d="M17 21v-8H7v8"/><polyline d="M7 3v5h8"/></svg>
    `;
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
        openCollectionDropdown(saveBtn, { src, pageUrl, title });
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
    // Top-right corner of the element
    const btnW = saveBtn.offsetWidth || 32;
    const btnH = saveBtn.offsetHeight || 32;
    let top = rect.top + 8;
    let left = rect.right - btnW - 8;
    // Clamp to viewport
    if (left < 4) left = rect.left + 8;
    if (top + btnH > window.innerHeight) top = rect.bottom - btnH - 8;
    if (top < 4) top = rect.top + 8;
    saveBtn.style.top = `${top}px`;
    saveBtn.style.left = `${left}px`;
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

    loadCollections().then(({ auth, collections }) => {
      const loading = dd.querySelector('.asq-dd-loading');
      if (loading) loading.remove();
      if (!auth || !auth.token) {
        dd.innerHTML += '<div class="asq-dd-empty">Not signed in</div>';
        return;
      }
      if (!collections || collections.length === 0) {
        dd.innerHTML += '<div class="asq-dd-empty">No collections</div>';
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

  function loadCollections() {
    return new Promise((resolve) => {
      // Use cache if fresh (< 30s)
      if (collectionsCache && Date.now() - collectionsCacheTime < 30000) {
        resolve({ auth: authCache, collections: collectionsCache });
        return;
      }
      chrome.runtime.sendMessage({ action: 'getAuth' }, (auth) => {
        if (!auth || !auth.token) {
          authCache = auth;
          resolve({ auth, collections: [] });
          return;
        }
        authCache = auth;
        const space2Key = 'default::space2-global';
        const endpoint = `/rest/v1/user_workspace_state?select=space2_state&user_id=eq.${encodeURIComponent(auth.user.id)}&board_key=eq.${encodeURIComponent(space2Key)}`;
        chrome.runtime.sendMessage({ action: 'supabaseRequest', endpoint, options: { method: 'GET' } }, (resp) => {
          collectionsCache = (Array.isArray(resp) && resp.length > 0 && resp[0]?.space2_state) ? (resp[0].space2_state.collections || []) : [];
          collectionsCacheTime = Date.now();
          resolve({ auth, collections: collectionsCache });
        });
      });
    });
  }

  // ── Save logic ────────────────────────────────────────────────
  function saveItemToCollection(item, collectionId, auth) {
    loadCollections().then(() => {
      const col = collectionsCache.find(c => c.id === collectionId);
      if (!col) { showToast('Collection not found'); return; }
      const newItem = buildItem(item, [collectionId]);
      col.itemIds = col.itemIds || [];
      col.itemIds.push(newItem.id);
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
      collectionIds, createdAt: Date.now(), updatedAt: Date.now(),
    };
  }

  function upsertState(auth, collections, newItem) {
    const space2Key = 'default::space2-global';
    const existingItems = collectionsCache ? (collectionsCache.reduce((all, c) => all.concat(c.itemIds || []), [])) : [];
    // We need to get the existing items array from the state
    chrome.runtime.sendMessage({
      action: 'supabaseRequest',
      endpoint: `/rest/v1/user_workspace_state?select=space2_state&user_id=eq.${encodeURIComponent(auth.user.id)}&board_key=eq.${encodeURIComponent(space2Key)}`,
      options: { method: 'GET' },
    }, (resp) => {
      const existingItems = (Array.isArray(resp) && resp.length > 0 && resp[0]?.space2_state)
        ? (resp[0].space2_state.items || []) : [];
      const updatedState = {
        items: existingItems.concat([newItem]),
        collections,
        savedAt: Date.now(),
      };
      chrome.runtime.sendMessage({
        action: 'supabaseRequest',
        endpoint: '/rest/v1/user_workspace_state',
        options: {
          method: 'POST',
          body: JSON.stringify({
            user_id: auth.user.id,
            board_key: space2Key,
            board_id: 'space2-global',
            canvas_state: {},
            space2_state: updatedState,
            updated_at: new Date().toISOString(),
          }),
        },
      }, (result) => {
        collectionsCache = collections;
        collectionsCacheTime = Date.now();
        showToast(result?.error ? 'Save failed' : 'Saved!');
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

  // ── Hover detection for images, videos, svgs ──────────────────
  createSaveButton();

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('img, video, svg[data-src], [role="img"]');
    if (el) {
      let src = '';
      if (el.tagName === 'IMG') src = el.src || el.dataset.src || '';
      else if (el.tagName === 'VIDEO') src = el.poster || el.src || (el.querySelector('source') && el.querySelector('source').src) || '';
      else if (el.tagName === 'SVG') src = el.dataset.src || '';
      else src = el.src || el.dataset.src || '';
      if (src && src.startsWith('http')) {
        hoveredMedia = { el, src };
        positionSaveButton(el);
        return;
      }
    }
    // Check parent containers with img children
    const container = e.target.closest('a, figure, .image-container, .media-wrapper');
    if (container) {
      const img = container.querySelector('img');
      if (img && img.src && img.src.startsWith('http')) {
        hoveredMedia = { el: img, src: img.src };
        positionSaveButton(img);
        return;
      }
    }
    // If no match, hide button
    if (hoveredMedia) {
      hoveredMedia = null;
      saveBtn.style.display = 'none';
    }
  }, true);

  window.addEventListener('scroll', () => {
    if (saveBtn && hoveredMedia) positionSaveButton(hoveredMedia.el);
  }, { passive: true });

  // Also handle dynamically loaded content via MutationObserver
  const observer = new MutationObserver(() => {
    if (hoveredMedia && !document.contains(hoveredMedia.el)) {
      hoveredMedia = null;
      saveBtn.style.display = 'none';
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
