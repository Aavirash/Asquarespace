(function () {
  if (window.__asq_ext_loaded) return;
  window.__asq_ext_loaded = true;

  let saveBtn = null;
  let hoveredMedia = null;
  let toast = null;
  let btnHovered = false;

  // ── Hover save button ─────────────────────────────────────────
  function createSaveButton() {
    saveBtn = document.createElement('div');
    saveBtn.className = 'asq-save-btn';
    saveBtn.innerHTML = `<div class="asq-btn-sheen"></div>`;
    saveBtn.style.backgroundImage = 'url(data:image/png;base64,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)';
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
  let collectionsCache = null;
  let collectionsCacheTime = 0;
  let authCache = null;

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
