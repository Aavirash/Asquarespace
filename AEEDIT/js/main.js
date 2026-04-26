const els = {
    syncStatus: document.getElementById('sync-status'),
    compName: document.getElementById('comp-name'),
    timelineMeta: document.getElementById('timeline-meta'),
    timeline: document.getElementById('timeline'),
    timelineRuler: document.getElementById('timeline-ruler'),
    timeReadout: document.getElementById('time-readout'),
    fileInput: document.getElementById('file-input'),
    mediaList: document.getElementById('media-list'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnCutAtCTI: document.getElementById('btn-cut-at-cti'),
    btnImportToAE: document.getElementById('btn-import-to-ae'),
    btnInsertToComp: document.getElementById('btn-insert-to-comp'),
    btnToolSelect: document.getElementById('btn-tool-select'),
    btnToolBlade: document.getElementById('btn-tool-blade'),
    btnSnap: document.getElementById('btn-snap')
};

const state = {
    cs: null,
    snapshot: null,
    selectedLayerIndex: null,
    selectedMediaPath: null,
    mediaFiles: [],
    toolMode: 'select',
    snapEnabled: true,
    pxPerSecond: 160,
    playheadDragActive: false
};

function setStatus(text, isLive) {
    els.syncStatus.textContent = text;
    els.syncStatus.classList.toggle('live', !!isLive);
}

function extFromName(fileName) {
    const bits = String(fileName || '').split('.');
    if (bits.length < 2) return '';
    return bits[bits.length - 1].toLowerCase();
}

function mediaKindFromName(fileName) {
    const ext = extFromName(fileName);
    if (['mp4', 'mov', 'webm', 'm4v'].indexOf(ext) >= 0) return 'video';
    if (['wav', 'mp3', 'm4a', 'aac', 'ogg'].indexOf(ext) >= 0) return 'audio';
    return 'video';
}

function evalHost(script) {
    return new Promise(resolve => {
        if (!window.__adobe_cep__ || !state.cs) {
            resolve('');
            return;
        }
        try {
            state.cs.evalScript(script, res => resolve(res || ''));
        } catch (_) {
            resolve('');
        }
    });
}

function escapeForEvalScript(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function formatTime(seconds, fps) {
    const totalFrames = Math.max(0, Math.round(seconds * fps));
    const ff = totalFrames % fps;
    const s = Math.floor(totalFrames / fps);
    const ss = s % 60;
    const mm = Math.floor(s / 60) % 60;
    const hh = Math.floor(s / 3600);
    const p = n => String(n).padStart(2, '0');
    return p(hh) + ':' + p(mm) + ':' + p(ss) + ':' + p(ff);
}

function setToolMode(mode) {
    state.toolMode = mode;
    const isBlade = mode === 'blade';
    els.btnToolBlade.classList.toggle('active-tool', isBlade);
    els.btnToolSelect.classList.toggle('active-tool', !isBlade);
    els.timeline.classList.toggle('blade-mode', isBlade);
}

function toggleSnap() {
    state.snapEnabled = !state.snapEnabled;
    els.btnSnap.classList.toggle('active-tool', state.snapEnabled);
    els.btnSnap.textContent = state.snapEnabled ? 'Snap: On' : 'Snap: Off';
}

function durationSeconds() {
    return state.snapshot && state.snapshot.comp ? state.snapshot.comp.duration : 0;
}

function laneWidthPx() {
    return Math.max(1200, Math.round(durationSeconds() * state.pxPerSecond));
}

function snapTime(t) {
    if (!state.snapEnabled || !state.snapshot || !state.snapshot.comp) return t;
    const fps = state.snapshot.comp.fps || 24;
    return Math.round(t * fps) / fps;
}

function eventTimeFromLaneEvent(event) {
    const lane = event.currentTarget;
    const rect = lane.getBoundingClientRect();
    const xInLane = event.clientX - rect.left;
    const t = xInLane / state.pxPerSecond;
    return Math.max(0, Math.min(durationSeconds(), snapTime(t)));
}

function buildRuler() {
    els.timelineRuler.innerHTML = '';
    if (!state.snapshot || !state.snapshot.comp) return;
    const d = durationSeconds();
    const whole = Math.ceil(d);
    for (let s = 0; s <= whole; s += 1) {
        const x = s * state.pxPerSecond;
        const tick = document.createElement('div');
        tick.className = 'ruler-tick';
        tick.style.left = x + 'px';
        els.timelineRuler.appendChild(tick);
        if (s % 1 === 0) {
            const label = document.createElement('div');
            label.className = 'ruler-label';
            label.style.left = x + 'px';
            label.textContent = String(s) + 's';
            els.timelineRuler.appendChild(label);
        }
    }
    els.timelineRuler.style.minWidth = laneWidthPx() + 'px';
}

function addPlayhead() {
    const old = els.timeline.querySelector('.playhead');
    if (old) old.remove();
    if (!state.snapshot || !state.snapshot.comp) return;
    const playhead = document.createElement('div');
    playhead.className = 'playhead';
    playhead.style.left = Math.max(0, state.snapshot.comp.time * state.pxPerSecond) + 'px';
    const handle = document.createElement('div');
    handle.className = 'playhead-handle';
    playhead.appendChild(handle);
    els.timeline.appendChild(playhead);
}

async function setCompTime(newTime, refreshAfter) {
    const t = Math.max(0, Math.min(durationSeconds(), snapTime(newTime)));
    const script = 'aeedit_setActiveCompTime(' + t + ')';
    const result = await evalHost(script);
    if (/^Error/i.test(result)) {
        setStatus(result, false);
        return;
    }
    if (state.snapshot && state.snapshot.comp) {
        state.snapshot.comp.time = t;
        els.timeReadout.textContent = formatTime(t, Math.round(state.snapshot.comp.fps || 24));
        addPlayhead();
    }
    if (refreshAfter) {
        await refreshTimeline();
    }
}

async function refreshTimeline() {
    setStatus('Syncing...', false);
    const raw = await evalHost('aeedit_getActiveCompSnapshot()');
    let parsed = null;
    try {
        parsed = JSON.parse(raw);
    } catch (_) {
        parsed = null;
    }

    if (!parsed || !parsed.ok) {
        state.snapshot = null;
        state.selectedLayerIndex = null;
        renderTimeline();
        els.compName.textContent = parsed && parsed.error ? parsed.error : 'No comp';
        els.timeReadout.textContent = '00:00:00:00';
        setStatus('Disconnected', false);
        return;
    }

    state.snapshot = parsed;
    if (typeof state.selectedLayerIndex !== 'number') {
        state.selectedLayerIndex = null;
    }
    els.compName.textContent = parsed.comp.name + ' @ ' + parsed.comp.fps.toFixed(2) + 'fps';
    els.timeReadout.textContent = formatTime(parsed.comp.time || 0, Math.round(parsed.comp.fps || 24));
    setStatus('Live', true);
    renderTimeline();
}

function clipLabel(layer) {
    const src = layer.sourceName ? ' - ' + layer.sourceName : '';
    return '#' + layer.index + ' ' + layer.name + src;
}

async function cutLayerAtTime(layerIndex, cutTime) {
    const t = snapTime(cutTime);
    const script = 'aeedit_splitLayerAtTime(' + layerIndex + ',' + t + ')';
    const result = await evalHost(script);
    setStatus(result || 'Cut done', /Success/i.test(result));
    await refreshTimeline();
}

function renderTimeline() {
    const snapshot = state.snapshot;
    els.timeline.innerHTML = '';
    buildRuler();

    if (!snapshot || !snapshot.comp) {
        els.timelineMeta.textContent = '0 layers';
        return;
    }

    const layers = snapshot.layers || [];
    els.timelineMeta.textContent = layers.length + ' layers';

    layers.forEach(layer => {
        const row = document.createElement('div');
        row.className = 'track-row';

        const label = document.createElement('div');
        label.className = 'track-label';
        label.textContent = 'L' + layer.index + '  ' + layer.name;

        const lane = document.createElement('div');
        lane.className = 'track-lane';
        lane.style.minWidth = laneWidthPx() + 'px';

        const clip = document.createElement('div');
        clip.className = 'clip ' + (layer.hasAudio && !layer.hasVideo ? 'audio' : 'video');
        if (state.selectedLayerIndex === layer.index) {
            clip.classList.add('active');
        }

        const left = Math.max(0, layer.inPoint * state.pxPerSecond);
        const width = Math.max(8, (layer.outPoint - layer.inPoint) * state.pxPerSecond);
        clip.style.left = left + 'px';
        clip.style.width = width + 'px';
        clip.title = clipLabel(layer);
        clip.textContent = clipLabel(layer);

        if (layer.hasAudio) {
            const wave = document.createElement('div');
            wave.className = 'wave';
            clip.appendChild(wave);
        }

        clip.addEventListener('click', async event => {
            event.stopPropagation();
            if (state.toolMode === 'blade') {
                const t = eventTimeFromLaneEvent({
                    currentTarget: lane,
                    clientX: event.clientX
                });
                await cutLayerAtTime(layer.index, t);
                return;
            }
            state.selectedLayerIndex = layer.index;
            renderTimeline();
        });

        lane.addEventListener('mousedown', async event => {
            if (event.button !== 0) return;
            if (state.toolMode === 'blade') return;
            const t = eventTimeFromLaneEvent(event);
            state.playheadDragActive = true;
            await setCompTime(t, false);
        });

        lane.addEventListener('mousemove', async event => {
            if (!state.playheadDragActive) return;
            const t = eventTimeFromLaneEvent(event);
            await setCompTime(t, false);
        });

        lane.appendChild(clip);
        row.appendChild(label);
        row.appendChild(lane);
        els.timeline.appendChild(row);
    });

    addPlayhead();
}

function renderMediaList() {
    els.mediaList.innerHTML = '';

    state.mediaFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'media-item';
        if (state.selectedMediaPath === file.path) {
            item.classList.add('active');
        }

        const name = document.createElement('div');
        name.className = 'media-name';
        name.textContent = file.name;

        const meta = document.createElement('div');
        meta.className = 'media-meta';
        meta.textContent = file.kind.toUpperCase() + ' - ' + file.path;

        item.appendChild(name);
        item.appendChild(meta);
        item.addEventListener('click', () => {
            state.selectedMediaPath = file.path;
            renderMediaList();
        });

        els.mediaList.appendChild(item);
    });
}

function hydrateMediaFromInput(fileList) {
    const next = [];
    for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const filePath = f.path || '';
        if (!filePath) continue;
        next.push({
            name: f.name,
            path: filePath,
            kind: mediaKindFromName(f.name)
        });
    }

    state.mediaFiles = next;
    state.selectedMediaPath = next.length ? next[0].path : null;
    renderMediaList();
}

async function importSelectedMedia(importToComp) {
    if (!state.selectedMediaPath) return;
    const escapedPath = escapeForEvalScript(state.selectedMediaPath);
    const script = importToComp
        ? 'aeedit_insertFileAtCTI("' + escapedPath + '")'
        : 'aeedit_importFile("' + escapedPath + '")';
    const result = await evalHost(script);
    setStatus(result || 'Done', /Success/i.test(result));
    await refreshTimeline();
}

async function cutSelectedLayerAtCTI() {
    const snapshot = state.snapshot;
    if (!snapshot || !snapshot.ok || typeof state.selectedLayerIndex !== 'number') {
        setStatus('Select a clip first', false);
        return;
    }
    await cutLayerAtTime(state.selectedLayerIndex, snapshot.comp.time);
}

function wireEvents() {
    els.btnRefresh.addEventListener('click', refreshTimeline);
    els.btnCutAtCTI.addEventListener('click', cutSelectedLayerAtCTI);
    els.btnImportToAE.addEventListener('click', () => importSelectedMedia(false));
    els.btnInsertToComp.addEventListener('click', () => importSelectedMedia(true));
    els.btnToolSelect.addEventListener('click', () => setToolMode('select'));
    els.btnToolBlade.addEventListener('click', () => setToolMode('blade'));
    els.btnSnap.addEventListener('click', toggleSnap);

    els.fileInput.addEventListener('change', event => {
        hydrateMediaFromInput(event.target.files || []);
    });

    window.addEventListener('mouseup', () => {
        state.playheadDragActive = false;
    });

    document.addEventListener('keydown', event => {
        const isCtrlOnly = event.ctrlKey && !event.metaKey && !event.altKey;

        if (isCtrlOnly && (event.key === 'v' || event.key === 'V')) {
            setToolMode('select');
            event.preventDefault();
            return;
        }
        if (isCtrlOnly && (event.key === 'c' || event.key === 'C')) {
            setToolMode('blade');
            event.preventDefault();
            return;
        }
        if (event.key === 's' || event.key === 'S') {
            toggleSnap();
            event.preventDefault();
            return;
        }
        if ((event.key === 'x' || event.key === 'X') && (event.metaKey || event.ctrlKey)) {
            cutSelectedLayerAtCTI();
            event.preventDefault();
        }
    });
}

async function init() {
    if (window.__adobe_cep__) {
        state.cs = new CSInterface();
        const ping = await evalHost('aeedit_ping()');
        setStatus(ping || 'Connected', true);
    } else {
        setStatus('CEP runtime not detected', false);
    }

    setToolMode('select');
    wireEvents();
    await refreshTimeline();
}

init();
