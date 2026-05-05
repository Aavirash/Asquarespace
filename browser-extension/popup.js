(function () {
  const APP_PASSCODE = '24176882';
  const STATE_TABLE = 'user_workspace_state';

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
  let rawStateData = null;

  // ── Init ──────────────────────────────────────────────────────
  function init() {
    chrome.runtime.sendMessage({ action: 'getPendingEmail' }, (pending) => {
      if (pending && pending.email) {
        els.email.value = pending.email;
        showAuth('otp');
        els.authStatus.textContent = 'Check your email for the code';
        return;
      }
      chrome.runtime.sendMessage({ action: 'getAuth' }, (resp) => {
        if (resp.user && resp.token) {
          authState = { user: resp.user, token: resp.token };
          showMain();
        } else {
          showAuth('passcode');
        }
      });
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        els.pageTitle.textContent = tabs[0].title || 'Untitled Page';
        els.pageTitle.dataset.url = tabs[0].url;
        try {
          const url = new URL(tabs[0].url);
          els.pageHost.textContent = url.hostname;
          els.pageThumb.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
          els.pageThumb.style.display = 'block';
        } catch {
          els.pageHost.textContent = tabs[0].url;
        }
      }
    });

    els.passcodeBtn.addEventListener('click', handlePasscode);
    els.emailBtn.addEventListener('click', handleEmail);
    els.otpBtn.addEventListener('click', handleOtp);
    els.changeEmail.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'clearPending' });
      showAuth('email');
      els.authStatus.textContent = 'Enter a different email';
    });
    const resendBtn = document.getElementById('auth-resend-btn');
    if (resendBtn) resendBtn.addEventListener('click', () => {
      const email = els.email.value.trim();
      if (email) sendOtpCode(email);
    });
    els.signOut.addEventListener('click', handleSignOut);
    els.saveBtn.addEventListener('click', handleSavePage);
    els.newColBtn.addEventListener('click', handleNewCollection);

    els.passcode.addEventListener('keydown', (e) => { if (e.key === 'Enter') handlePasscode(); });
    els.email.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleEmail(); });
    els.otp.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleOtp(); });
  }

  // ── Auth ──────────────────────────────────────────────────────
  function showAuth(step) {
    screens.auth.classList.remove('hidden');
    screens.main.classList.add('hidden');
    document.querySelectorAll('.auth-step').forEach(s => s.classList.add('hidden'));
    document.getElementById('auth-step-' + step)?.classList.remove('hidden');
  }

  function showMain() {
    screens.auth.classList.add('hidden');
    screens.main.classList.remove('hidden');
    loadCollections();
  }

  function handlePasscode() {
    const code = els.passcode.value.trim();
    if (!code) return;
    if (code !== APP_PASSCODE) { els.authStatus.textContent = 'Invalid passcode'; return; }
    showAuth('email');
    els.authStatus.textContent = 'Passcode accepted. Enter your email.';
    chrome.runtime.sendMessage({ action: 'getLastEmail' }, (result) => {
      if (result?.email) els.email.value = result.email;
      els.email.focus();
    });
  }

  function handleEmail() {
    const email = els.email.value.trim();
    if (!email) return;
    // Save pending BEFORE request so reload doesn't lose state
    chrome.runtime.sendMessage({ action: 'setPendingEmail', email });
    sendOtpCode(email);
  }

  function sendOtpCode(email) {
    els.authStatus.textContent = 'Sending code...';
    supabase('/auth/v1/otp', { method: 'POST', body: JSON.stringify({ email, create_user: true }) })
      .then((resp) => {
        if (resp && resp.error) {
          els.authStatus.textContent = 'Error: ' + (resp.error.message || resp.error);
          return;
        }
        els.authStatus.textContent = 'Code sent. Check your inbox.';
        showAuth('otp');
      })
      .catch((err) => {
        els.authStatus.textContent = 'Failed: ' + (err.message || err);
        console.error('OTP error:', err);
      });
  }

  function handleOtp() {
    const token = els.otp.value.trim();
    if (!token) return;
    const email = els.email.value.trim();
    els.authStatus.textContent = 'Verifying...';
    supabase('/auth/v1/verify', { method: 'POST', body: JSON.stringify({ email, token, type: 'email' }) })
      .then((resp) => {
        if (resp.error || !resp.access_token) { els.authStatus.textContent = 'Invalid code'; return; }
        const user = resp.user || { id: resp.user?.id, email };
        authState = { user, token: resp.access_token };
        chrome.runtime.sendMessage({ action: 'setAuth', user, token: resp.access_token });
        chrome.runtime.sendMessage({ action: 'clearPending' });
        showMain();
      })
      .catch(() => { els.authStatus.textContent = 'Verification failed'; });
  }

  function handleSignOut() {
    chrome.runtime.sendMessage({ action: 'clearAuth' });
    chrome.runtime.sendMessage({ action: 'clearPending' });
    authState = null; collections = []; rawStateData = null;
    els.passcode.value = ''; els.email.value = ''; els.otp.value = '';
    els.authStatus.textContent = 'Enter your passcode';
    showAuth('passcode');
  }

  // ── Collections ───────────────────────────────────────────────
  function loadCollections() {
    if (!authState?.user?.id) return;
    const space2Key = 'default::space2-global';
    els.collectionsList.innerHTML = '<div class="section-label" style="padding:8px 0">Loading...</div>';

    supabase(
      `/rest/v1/${STATE_TABLE}?select=space2_state&user_id=eq.${encodeURIComponent(authState.user.id)}&board_key=eq.${encodeURIComponent(space2Key)}`,
      { method: 'GET' }
    )
      .then((resp) => {
        if (Array.isArray(resp) && resp.length > 0 && resp[0]?.space2_state) {
          rawStateData = resp[0];
          collections = resp[0].space2_state.collections || [];
        } else {
          rawStateData = null;
          collections = [];
        }
        renderCollections();
      })
      .catch((err) => {
        console.error('Load collections failed:', err);
        collections = [];
        renderCollections();
      });
  }

  function renderCollections() {
    els.collectionsList.innerHTML = '';
    if (collections.length === 0) {
      els.collectionsList.innerHTML = '<div class="section-label" style="padding:8px 0;color:rgba(228,236,255,0.35)">No collections yet</div>';
    } else {
      collections.forEach(col => {
        const btn = document.createElement('button');
        btn.className = 'col-item';
        const count = (col.itemIds || []).length;
        btn.innerHTML = `<span>${escHtml(col.name)}</span><span class="col-count">${count}</span>`;
        btn.addEventListener('click', () => savePageToCollection(col.id));
        els.collectionsList.appendChild(btn);
      });
    }
  }

  function escHtml(s) {
    const d = document.createElement('div'); d.textContent = s; return d.innerHTML;
  }

  // ── Save ──────────────────────────────────────────────────────
  function handleSavePage() {
    if (!authState?.token) return;
    loadCollections();
  }

  function savePageToCollection(collectionId) {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    const url = els.pageTitle.dataset.url || '';
    const newItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 99999)}`,
      src: url, filePath: '', cloudPath: '', browserBlobKey: '',
      signedUrlExpiresAt: 0, mediaType: 'url', thumbnailUrl: els.pageThumb.src || '',
      pageUrl: url, title: els.pageTitle.textContent, description: '',
      collectionIds: [collectionId], createdAt: Date.now(), updatedAt: Date.now(),
    };
    col.itemIds = col.itemIds || [];
    col.itemIds.push(newItem.id);
    const updatedState = { items: (rawStateData?.space2_state?.items || []).concat([newItem]), collections, savedAt: Date.now() };

    upsertState(updatedState)
      .then(() => { renderCollections(); setTimeout(() => window.close(), 800); })
      .catch(() => { alert('Save failed'); });
  }

  function handleNewCollection() {
    const name = prompt('Collection name:');
    if (!name || !name.trim() || !authState?.token) return;
    const newCol = { id: `col-${Date.now()}`, name: name.trim(), itemIds: [] };
    collections.push(newCol);
    const updatedState = { items: rawStateData?.space2_state?.items || [], collections, savedAt: Date.now() };

    upsertState(updatedState)
      .then(() => renderCollections())
      .catch(() => { collections.pop(); alert('Failed to create collection'); });
  }

  function upsertState(space2State) {
    const space2Key = 'default::space2-global';
    return supabase(`/rest/v1/${STATE_TABLE}`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: authState.user.id,
        board_key: space2Key,
        board_id: 'space2-global',
        canvas_state: {},
        space2_state: space2State,
        updated_at: new Date().toISOString(),
      }),
    });
  }

  // ── Supabase helper ───────────────────────────────────────────
  function supabase(endpoint, options = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'supabaseRequest', endpoint, options }, resolve);
    });
  }

  init();
})();
