(function () {
  if (window.__asq_ext_loaded) return;
  window.__asq_ext_loaded = true;

  let saveBtn = null;
  let hoveredImg = null;
  let toast = null;

  // ── Hover save button ─────────────────────────────────────────
  function createSaveButton() {
    saveBtn = document.createElement('div');
    saveBtn.className = 'asq-save-btn';
    saveBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline d="M17 21v-8H7v8"/><polyline d="M7 3v5h8"/></svg>
      <span>Save</span>
    `;
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (hoveredImg) {
        const src = hoveredImg.dataset.src || hoveredImg.src || '';
        const pageUrl = window.location.href;
        const alt = hoveredImg.alt || extractFileName(src);
        openCollectionDropdown(saveBtn, { src, pageUrl, title: alt });
      }
    });
    document.body.appendChild(saveBtn);
  }

  function positionSaveButton(img) {
    if (!saveBtn || !img) return;
    const rect = img.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 60 || rect.top < 0) {
      saveBtn.style.display = 'none';
      return;
    }
    saveBtn.style.display = 'flex';
    saveBtn.style.top = `${rect.top + 8}px`;
    saveBtn.style.left = `${rect.right - saveBtn.offsetWidth - 8}px`;
  }

  // ── Collection dropdown ───────────────────────────────────────
  function openCollectionDropdown(anchor, item) {
    removeDropdown();
    const dd = document.createElement('div');
    dd.className = 'asq-dropdown';
    dd.innerHTML = `
      <div class="asq-dd-header">Save to collection</div>
      <div class="asq-dd-loading">Loading...</div>
    `;
    document.body.appendChild(dd);
    const rect = anchor.getBoundingClientRect();
    dd.style.top = `${rect.bottom + 6}px`;
    dd.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`;

    // Fetch collections
    chrome.runtime.sendMessage({ action: 'getAuth' }, (auth) => {
      if (!auth.token) {
        dd.querySelector('.asq-dd-loading').textContent = 'Not signed in. Open the app to sign in.';
        return;
      }
      chrome.runtime.sendMessage({
        action: 'supabaseRequest',
        endpoint: '/rest/v1/space2_state?select=items,collections&user_id=eq.' + encodeURIComponent(auth.user?.id || ''),
        options: { method: 'GET' },
      }, (resp) => {
        dd.querySelector('.asq-dd-loading')?.remove();
        if (resp.error || !resp.length) {
          dd.innerHTML += '<div class="asq-dd-empty">No collections found.</div>';
        } else {
          const collections = resp[0]?.collections || [];
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
          // New collection button
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
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!dd.contains(e.target)) { dd.remove(); document.removeEventListener('click', handler); }
      });
    }, 100);
  }

  function removeDropdown() {
    document.querySelectorAll('.asq-dropdown').forEach(d => d.remove());
  }

  // ── Save logic ────────────────────────────────────────────────
  function saveItemToCollection(item, collectionId, auth) {
    chrome.runtime.sendMessage({
      action: 'supabaseRequest',
      endpoint: '/rest/v1/space2_state',
      options: {
        method: 'POST',
        body: JSON.stringify({
          user_id: auth.user.id,
          items: [{
            id: `item-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
            src: item.src,
            filePath: '',
            cloudPath: '',
            browserBlobKey: '',
            signedUrlExpiresAt: 0,
            mediaType: detectMediaType(item.src),
            thumbnailUrl: item.src,
            pageUrl: item.pageUrl,
            title: item.title,
            description: '',
            collectionIds: [collectionId],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }],
          collections: [],
          savedAt: Date.now(),
        }),
      },
    }, (resp) => {
      showToast(resp.error ? 'Save failed' : 'Saved!');
    });
  }

  function createAndSave(item, name, auth) {
    const newCol = { id: `col-${Date.now()}`, name, itemIds: [] };
    chrome.runtime.sendMessage({
      action: 'supabaseRequest',
      endpoint: '/rest/v1/space2_state',
      options: {
        method: 'POST',
        body: JSON.stringify({
          user_id: auth.user.id,
          items: [{
            id: `item-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
            src: item.src,
            filePath: '',
            cloudPath: '',
            browserBlobKey: '',
            signedUrlExpiresAt: 0,
            mediaType: detectMediaType(item.src),
            thumbnailUrl: item.src,
            pageUrl: item.pageUrl,
            title: item.title,
            description: '',
            collectionIds: [newCol.id],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }],
          collections: [newCol],
          savedAt: Date.now(),
        }),
      },
    }, (resp) => {
      showToast(resp.error ? 'Failed' : `Saved to "${name}"`);
    });
  }

  function detectMediaType(url) {
    if (/\.(png|jpg|jpeg|webp|gif|svg|bmp)(\?|#|$)/i.test(url)) return /\.(gif)(\?|#|$)/i.test(url) ? 'gif' : 'image';
    if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url)) return 'video';
    if (/\.(mp3|wav|m4a|ogg)(\?|#|$)/i.test(url)) return 'audio';
    return 'url';
  }

  function extractFileName(url) {
    try { return decodeURIComponent(url.split('/').pop().split('?')[0]) || 'Image'; }
    catch { return 'Image'; }
  }

  // ── Toast notification ────────────────────────────────────────
  function showToast(message) {
    if (toast) toast.remove();
    toast = document.createElement('div');
    toast.className = 'asq-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast) { toast.classList.add('asq-toast-out'); setTimeout(() => toast?.remove(), 300); } }, 2500);
  }

  // ── Listen for messages from background (context menu) ───────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'saveItem' && msg.item) {
      openCollectionDropdown(document.body, msg.item);
    }
    if (msg.action === 'showToast' && msg.message) {
      showToast(msg.message);
    }
  });

  // ── Event listeners ───────────────────────────────────────────
  createSaveButton();

  document.addEventListener('mouseover', (e) => {
    const img = e.target.closest('img');
    if (img && img.src && img.src.startsWith('http')) {
      hoveredImg = img;
      positionSaveButton(img);
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('img') === hoveredImg) {
      hoveredImg = null;
      if (saveBtn) saveBtn.style.display = 'none';
    }
  });

  window.addEventListener('scroll', () => {
    if (saveBtn && hoveredImg) positionSaveButton(hoveredImg);
  }, { passive: true });

})();
