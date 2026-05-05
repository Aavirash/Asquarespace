(function () {
  const screens = { auth: document.getElementById('auth-screen'), main: document.getElementById('main-screen') };
  const els = {
    passcode: document.getElementById('auth-passcode'), passcodeBtn: document.getElementById('auth-passcode-btn'),
    email: document.getElementById('auth-email'), emailBtn: document.getElementById('auth-email-btn'),
    otp: document.getElementById('auth-otp'), otpBtn: document.getElementById('auth-otp-btn'),
    changeEmail: document.getElementById('auth-change-email'), authStatus: document.getElementById('auth-status'),
    signOut: document.getElementById('sign-out-btn'), pageThumb: document.getElementById('page-thumb'),
    pageTitle: document.getElementById('page-title'), pageHost: document.getElementById('page-host'),
    saveBtn: document.getElementById('save-page-btn'), collectionsList: document.getElementById('collections-list'),
    newColBtn: document.getElementById('new-collection-btn'),
  };

  let authState = null;
  let collections = [];

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    chrome.runtime.sendMessage({ action: 'getAuth' }, (resp) => {
      if (resp.user && resp.token) {
        authState = { user: resp.user, token: resp.token };
        showMain();
      } else {
        showAuth('passcode');
      }
    });

    // Current page info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        els.pageTitle.textContent = tabs[0].title || 'Untitled Page';
        try { els.pageHost.textContent = new URL(tabs[0].url).hostname; } catch { els.pageHost.textContent = tabs[0].url; }
        // Try to get thumbnail from og:image or favicon
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            const og = document.querySelector('meta[property="og:image"]');
            if (og) return og.content;
            const link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            if (link) return link.href;
            return null;
          },
        }, (results) => {
          if (results?.[0]?.result) {
            els.pageThumb.src = results[0].result;
            els.pageThumb.style.display = 'block';
          }
        });
      }
    });

    // Event bindings
    els.passcodeBtn.addEventListener('click', handlePasscode);
    els.emailBtn.addEventListener('click', handleEmail);
    els.otpBtn.addEventListener('click', handleOtp);
    els.changeEmail.addEventListener('click', () => showAuth('email'));
    els.signOut.addEventListener('click', handleSignOut);
    els.saveBtn.addEventListener('click', handleSavePage);
    els.newColBtn.addEventListener('click', handleNewCollection);

    // Enter key on auth inputs
    els.passcode.addEventListener('keydown', (e) => { if (e.key === 'Enter') handlePasscode(); });
    els.email.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleEmail(); });
    els.otp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleOtp(); });
  }

  // ── Auth flow ─────────────────────────────────────────────────
  function showAuth(step) {
    screens.auth.classList.remove('hidden');
    screens.main.classList.add('hidden');
    document.querySelectorAll('.auth-step').forEach(s => s.classList.add('hidden'));
    if (step === 'passcode') document.getElementById('auth-step-passcode').classList.remove('hidden');
    if (step === 'email') document.getElementById('auth-step-email').classList.remove('hidden');
    if (step === 'otp') document.getElementById('auth-step-otp').classList.remove('hidden');
  }

  function showMain() {
    screens.auth.classList.add('hidden');
    screens.main.classList.remove('hidden');
    loadCollections();
  }

  const APP_PASSCODE = '24176882';

  function handlePasscode() {
    const code = els.passcode.value.trim();
    if (!code) return;
    if (code !== APP_PASSCODE) {
      els.authStatus.textContent = 'Invalid passcode';
      return;
    }
    showAuth('email');
    els.authStatus.textContent = 'Passcode accepted. Enter your email to continue.';
    els.email.focus();
  }

  function handleEmail() {
    const email = els.email.value.trim();
    if (!email) return;
    els.authStatus.textContent = 'Sending code...';
    supabase('/auth/v1/otp', {
      method: 'POST',
      body: JSON.stringify({ email, data: { passcode: authState?.user?.passcode }, create_user: false }),
    })
      .then(() => {
        els.authStatus.textContent = 'Check your email';
        showAuth('otp');
      })
      .catch(() => { els.authStatus.textContent = 'Failed to send code'; });
  }

  function handleOtp() {
    const token = els.otp.value.trim();
    if (!token) return;
    const email = els.email.value.trim();
    els.authStatus.textContent = 'Verifying...';
    supabase('/auth/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ email, token, type: 'email' }),
    })
      .then((resp) => {
        if (resp.error || !resp.access_token) {
          els.authStatus.textContent = 'Invalid code';
          return;
        }
        authState = { user: authState.user, token: resp.access_token };
        chrome.runtime.sendMessage({ action: 'setAuth', user: authState.user, token: authState.token });
        showMain();
      })
      .catch(() => { els.authStatus.textContent = 'Verification failed'; });
  }

  function handleSignOut() {
    chrome.runtime.sendMessage({ action: 'clearAuth' });
    authState = null;
    els.passcode.value = '';
    els.email.value = '';
    els.otp.value = '';
    els.authStatus.textContent = 'Enter your passcode';
    showAuth('passcode');
  }

  // ── Collections ───────────────────────────────────────────────
  function loadCollections() {
    if (!authState?.user?.id) return;
    els.collectionsList.innerHTML = '<div class="section-label">Loading...</div>';
    supabase(`/rest/v1/space2_state?select=*&user_id=eq.${encodeURIComponent(authState.user.id)}`, { method: 'GET' })
      .then((resp) => {
        if (resp.error || !resp.length) {
          els.collectionsList.innerHTML = '<div class="section-label">No collections yet</div>';
          return;
        }
        collections = resp[0].collections || [];
        renderCollections();
      })
      .catch(() => { els.collectionsList.innerHTML = '<div class="section-label">Failed to load</div>'; });
  }

  function renderCollections() {
    els.collectionsList.innerHTML = '';
    collections.forEach(col => {
      const btn = document.createElement('button');
      btn.className = 'col-item';
      const count = (col.itemIds || []).length;
      btn.innerHTML = `<span>${col.name}</span><span class="col-count">${count}</span>`;
      btn.addEventListener('click', () => savePageToCollection(col.id));
      els.collectionsList.appendChild(btn);
    });
  }

  // ── Save ──────────────────────────────────────────────────────
  function handleSavePage() {
    if (!authState?.token) return;
    loadCollections();
  }

  function savePageToCollection(collectionId) {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    const url = els.pageTitle.dataset.url || window.location.href;
    const newItem = {
      id: `item-${Date.now()}`,
      src: url,
      filePath: '',
      cloudPath: '',
      browserBlobKey: '',
      signedUrlExpiresAt: 0,
      mediaType: 'url',
      thumbnailUrl: els.pageThumb.src || '',
      pageUrl: url,
      title: els.pageTitle.textContent,
      description: '',
      collectionIds: [collectionId],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    supabase('/rest/v1/space2_state', {
      method: 'POST',
      body: JSON.stringify({
        user_id: authState.user.id,
        items: [newItem],
        collections: collections.map(c => ({
          ...c,
          itemIds: c.itemIds || [],
        })),
        savedAt: Date.now(),
      }),
    })
      .then(() => {
        col.itemIds = col.itemIds || [];
        col.itemIds.push(newItem.id);
        renderCollections();
        window.close();
      })
      .catch(() => { alert('Save failed'); });
  }

  function handleNewCollection() {
    const name = prompt('Collection name:');
    if (!name || !name.trim() || !authState?.token) return;
    const newCol = { id: `col-${Date.now()}`, name: name.trim(), itemIds: [] };
    collections.push(newCol);

    supabase('/rest/v1/space2_state', {
      method: 'POST',
      body: JSON.stringify({
        user_id: authState.user.id,
        items: [],
        collections,
        savedAt: Date.now(),
      }),
    })
      .then(() => renderCollections())
      .catch(() => {
        collections.pop();
        alert('Failed to create collection');
      });
  }

  // ── Supabase helper ───────────────────────────────────────────
  function supabase(endpoint, options = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'supabaseRequest',
        endpoint,
        options,
      }, resolve);
    });
  }

  init();
})();
