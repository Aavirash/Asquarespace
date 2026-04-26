/* ═══════════════════════════════════
   Asquarespace – main.js
═══════════════════════════════════ */
function safeNodeRequire(mod){
    if(!window.require) return null;
    try{return window.require(mod);}catch{return null;}
}

const nodeFs    = safeNodeRequire('fs');
const nodePath  = safeNodeRequire('path');
const nodeOs    = safeNodeRequire('os');
const nodeHttps = safeNodeRequire('https');
const nodeHttp  = safeNodeRequire('http');
const nodeCrypto= safeNodeRequire('crypto');
const nodeChildProcess = safeNodeRequire('child_process');
const APP_QUERY = new URLSearchParams(window.location.search);
const IS_MAC_APP = APP_QUERY.get('app') === 'mac';

const API_KEY  = 'sk_CpXbaZAa5rqnfaDUxTtFrw4rVsOjtc7m';
const API_BASE = 'https://gen.pollinations.ai';

// ── Rotation cursor SVGs (curved arrow, rotated for each corner) ────────────
// The SVG is a curved rotate arrow (Asquarespace branded in #ef4027).
// We encode 4 variants: br (base), bl (flip-h), tl (flip-h+v), tr (flip-v)
function rotCursorURL(scaleX, scaleY) {
    const path = "M505.7,122.5l-92.2-62.7c-6.7-4.5-15.6-3.1-20.7,3.1l-69.2,87.4c-5.2,6.6-4.1,16.1,2.5,21.3s16.1,4.1,21.3-2.5l50.4-63.8c2.9,14.6,4.3,29.4,4.3,44.3,0,125.2-101.9,227-227,227s-90.5-13.8-128.2-39.6l79-27.8c8-2.5,12.4-11,9.9-18.9s-11-12.4-18.9-9.9c-.3.1-.7.2-1,.4l-105.2,37c-2,.7-3.9,1.8-5.4,3.3-4.2,3.8-6,9.7-4.5,15.2l29.3,107.5c1.8,6.6,7.8,11.1,14.6,11.1s2.7-.2,4-.5c8.1-2.2,12.8-10.5,10.6-18.6l-18-66.4c40.3,24.6,86.6,37.5,133.8,37.5,68.3.2,133.8-27,181.9-75.4,48.4-48.1,75.5-113.7,75.4-181.9,0-14.3-1.2-28.6-3.5-42.8l59.8,40.7c7.1,4.4,16.4,2.2,20.8-4.9,4.1-6.6,2.5-15.4-3.8-20.1h0Z";
    const transform = `scale(${scaleX} ${scaleY}) translate(${scaleX<0?-512:0} ${scaleY<0?-512:0})`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 512 512'><g transform='${transform}'><path fill='%23ef4027' d='${path}'/></g></svg>`;
    return `url("data:image/svg+xml,${svg}") 10 10, pointer`;
}

const ROT_CURSORS = {
    br: rotCursorURL(1, 1),
    bl: rotCursorURL(-1, 1),
    tl: rotCursorURL(-1, -1),
    tr: rotCursorURL(1, -1),
};

// ── DOM ─────────────────────────────────────────────────────────────────
const html        = document.documentElement;
const uiContainer = document.getElementById('ui-container');
const viewport    = document.getElementById('viewport');
const canvas      = document.getElementById('canvas');
const selBox      = document.getElementById('selection-box');
const multiSelBox = document.getElementById('multi-selection-box');
const ctxToolbar  = document.getElementById('context-toolbar');
const multiToolbar= document.getElementById('multi-toolbar');
const noteToolbar = document.getElementById('note-toolbar');
const bottomBar   = document.getElementById('bottom-bar');
const thumbList   = document.getElementById('thumb-list');
const aiInput     = document.getElementById('ai-prompt-input');
const promptMagicBtn = document.getElementById('prompt-magic-btn');
const genBtn      = document.getElementById('bar-gen-btn');
const modelBtn    = document.getElementById('model-btn');
const modelLabel  = document.getElementById('model-label');
const modelDD     = document.getElementById('model-dropdown');
const sizeBtn     = document.getElementById('size-btn');
const sizeLabel   = document.getElementById('size-label');
const sizeDD      = document.getElementById('size-dropdown');
const fileInput   = document.getElementById('file-input');
const themeToggle = document.getElementById('theme-toggle');
const barExtraBtn = document.getElementById('bar-extra-btn');
const barExtraMenu= document.getElementById('bar-extra-menu');
const iconSun     = document.getElementById('icon-sun');
const iconMoon    = document.getElementById('icon-moon');
const modelWrapper= document.getElementById('model-wrapper');
const sizeWrapper = document.getElementById('size-wrapper');
const colorPopup  = document.getElementById('color-picker-popup');
const ntColorSwatch=document.getElementById('nt-color-swatch');
const ntFontSel   = document.getElementById('nt-font-select');
const ntSizeInput = document.getElementById('nt-size-input');
const settingsModal = document.getElementById('settings-modal');
const geminiKeyInput= document.getElementById('gemini-key-input');
const geminiToggleBtn = document.getElementById('gemini-toggle');
const geminiStatus  = document.getElementById('gemini-status');
const settingsSave  = document.getElementById('settings-save');
const settingsCancel= document.getElementById('settings-cancel');
const settingsBtn   = document.getElementById('extra-settings');
const favoritesPanel= document.getElementById('favorites-panel');
const favoritesStrip= document.getElementById('favorites-strip');
const favoritesToggleBtn=document.getElementById('extra-toggle-favorites');
const boardToggleBtn= document.getElementById('board-toggle-btn');
const boardMenuTrigger = document.getElementById('board-menu-trigger');
const boardQuickMenu = document.getElementById('board-quick-menu');
const boardPanel    = document.getElementById('board-panel');
const boardList     = document.getElementById('board-list');
const boardNewBtn   = document.getElementById('board-new-btn');
const boardCurrentName = document.getElementById('board-current-name');
const moveBoardModal= document.getElementById('move-board-modal');
const moveBoardList = document.getElementById('move-board-list');
const moveBoardCancel = document.getElementById('move-board-cancel');
const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');

// ── State ─────────────────────────────────────────────────────────────────
let tx=0, ty=0, sc=1;
let allNodes    = [];
let selectedSet = new Set();
let drag        = null;
let interactionDirty=false;
let genW=1024, genH=1024;
let currentModel='flux';
let isDark=false;
let appMode='ai';
let placeColumn=0, placeRow=0;
const PLACE_COLS=3, PLACE_GAP=24;
let activeFontSize=30, activeBold=false, activeAlign='left';
let selectedNote=null;
const ENABLE_PROJECT_PERSISTENCE=true;
let geminiApiKey=localStorage.getItem('asq.gemini.api.key')||'';
let geminiEnabled=(localStorage.getItem('asq.gemini.enabled')||'1')==='1';
let modelCatalog={image:[],video:[],text:[],audio:[]};
let geminiCatalog={text:[],image:[],video:[],audio:[]};
let geminiCatalogLoadedAt=0;
let geminiLastError='';
let modelMetaByName={};
let imageBatchSize=1;
let currentProjectKey='local-default';
let currentBoardId='board-1';
let boards=[];
let persistenceReady=false;
let suppressPersist=false;
let persistTimer=null;
let projectPollTimer=null;
let undoStack=[];
let redoStack=[];
let historyMute=false;
let historyTimer=null;
let favoritesVisible=false;
let promptHistory=[];
let promptHistoryIndex=-1;
let promptHistoryDraft='';

// ── Persistence ────────────────────────────────────────────────────────────
function evalHost(script){
    return new Promise(resolve=>{
        if(!window.__adobe_cep__){resolve('local-default');return;}
        try{
            const cs=new CSInterface();
            cs.evalScript(script,res=>resolve(res||''));
        }catch{
            resolve('local-default');
        }
    });
}

async function deriveCurrentProjectId(){
    if(!window.__adobe_cep__||!evalHost)return'default';
    const raw=await evalHost('getAsquarespaceProjectKey()');
    const key=(typeof raw==='string'?raw:'').trim().replace(/^"|"$/g,'');
    if(!key||key==='undefined'||key==='null'||key==='EvalScript error.'||/^error:/i.test(key)){
        return currentProjectKey||'local-default';
    }
    return key;
}

function getPersistenceDir(){
    if(!nodeFs||!nodePath||!nodeOs) return null;
    return nodePath.join(nodeOs.homedir(),'Library','Application Support','Asquarespace','canvas-state');
}

function getBoardMetaKey(projectKey){
    return `asq.boards.v1.${projectKey||'local-default'}`;
}

function getStorageKey(projectKey,boardId){
    return `asq.canvas.v1.${projectKey||'local-default'}.${boardId||'board-1'}`;
}

function getActiveProjectKey(){
    return deriveCurrentProjectId().then(key=>key||currentProjectKey||'local-default');
}

function hasAnyCanvasForProject(projectKey){
    const prefix=`asq.canvas.v1.${projectKey}.`;
    for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';
        if(key.startsWith(prefix)) return true;
    }
    return false;
}

function getProjectKeyCandidates(projectKey){
    const uniq=new Set([projectKey]);
    if(typeof projectKey!=='string'||!projectKey) return [...uniq];

    const patterns=[
        [/Asquarespace/g,'InfinityBoard'],
        [/asquarespace/g,'infinityboard'],
        [/ASQUARESPACE/g,'INFINITYBOARD'],
    ];

    patterns.forEach(([replFrom,replTo])=>{
        if(replFrom.test(projectKey)) uniq.add(projectKey.replace(replFrom,replTo));
    });

    return [...uniq];
}

function parseBoardIdFromStorageKey(projectKey,key){
    const prefix=`asq.canvas.v1.${projectKey}.`;
    if(!key||!key.startsWith(prefix)) return '';
    return key.slice(prefix.length)||'';
}

function findLatestNonEmptySnapshotForProject(projectKey){
    const candidates=getProjectKeyCandidates(projectKey);
    let best=null;
    for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';
        const matchedProject=candidates.find(pk=>key.startsWith(`asq.canvas.v1.${pk}.`));
        if(!matchedProject) continue;
        const boardId=parseBoardIdFromStorageKey(matchedProject,key);
        if(!boardId) continue;
        try{
            const raw=localStorage.getItem(key);
            if(!raw) continue;
            const data=JSON.parse(raw);
            const count=Array.isArray(data&&data.nodes)?data.nodes.length:0;
            if(!count) continue;
            const savedAt=(data&&typeof data.savedAt==='number')?data.savedAt:0;
            if(!best||savedAt>best.savedAt){
                best={
                    projectKey:matchedProject,
                    boardId,
                    raw,
                    savedAt,
                    count
                };
            }
        }catch{}
    }
    return best;
}

function ensureBoardExists(boardId,name){
    if(!boardId) return;
    if(!Array.isArray(boards)||!boards.length) boards=[];
    if(!boards.some(b=>b.id===boardId)){
        boards.push({id:boardId,name:name||'Recovered Board'});
    }
}

function recoverCanvasIfEmpty(projectKey){
    if(allNodes.length>0) return false;
    const snap=findLatestNonEmptySnapshotForProject(projectKey);
    if(!snap) return false;

    try{
        if(snap.projectKey!==projectKey){
            localStorage.setItem(getStorageKey(projectKey,snap.boardId),snap.raw);
        }
        ensureBoardExists(snap.boardId,'Recovered Board');
        currentBoardId=snap.boardId;
        saveBoards(projectKey);
        loadBoardState(projectKey,currentBoardId);
        renderBoardList();
        return allNodes.length>0;
    }catch(err){
        console.warn('recover canvas failed',err);
        return false;
    }
}

function migrateLegacyProjectStateIfNeeded(projectKey){
    if(!projectKey) return;
    const targetBoardsKey=getBoardMetaKey(projectKey);
    if(localStorage.getItem(targetBoardsKey)||hasAnyCanvasForProject(projectKey)) return;

    const projectCandidates=getProjectKeyCandidates(projectKey);
    const boardPrefixes=['asq.boards.v1.','infinityboard.boards.v1.','ib.boards.v1.'];
    const canvasPrefixes=['asq.canvas.v1.','infinityboard.canvas.v1.','ib.canvas.v1.'];

    for(let c=0;c<projectCandidates.length;c++){
        const sourceProjectKey=projectCandidates[c];
        if(!sourceProjectKey||sourceProjectKey===projectKey) continue;

        let found=false;
        for(let i=0;i<boardPrefixes.length;i++){
            const sourceBoardKey=`${boardPrefixes[i]}${sourceProjectKey}`;
            const boardPayload=localStorage.getItem(sourceBoardKey);
            if(boardPayload){
                localStorage.setItem(targetBoardsKey,boardPayload);
                found=true;
                break;
            }
        }

        for(let i=0;i<localStorage.length;i++){
            const key=localStorage.key(i)||'';
            for(let p=0;p<canvasPrefixes.length;p++){
                const sourcePrefix=`${canvasPrefixes[p]}${sourceProjectKey}.`;
                if(!key.startsWith(sourcePrefix)) continue;
                const boardId=key.slice(sourcePrefix.length);
                const payload=localStorage.getItem(key);
                if(!payload||!boardId) continue;
                localStorage.setItem(getStorageKey(projectKey,boardId),payload);
                found=true;
            }
        }

        if(found) return;
    }
}

function getProjectStateFile(projectKey){
    const dir=getPersistenceDir();
    if(!dir||!projectKey) return null;
    let fileKey='';
    if(nodeCrypto){
        fileKey=nodeCrypto.createHash('sha1').update(projectKey).digest('hex');
    }else{
        fileKey=projectKey.replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,120)||'local-default';
    }
    return nodePath.join(dir,`${fileKey}.json`);
}

function schedulePersist(delay=300){
    if(!persistenceReady||suppressPersist) return;
    if(persistTimer) clearTimeout(persistTimer);
    persistTimer=setTimeout(()=>{persistTimer=null;saveProjectState();},delay);
}

function scheduleHistoryCapture(delay=350){
    if(historyMute||suppressPersist) return;
    if(historyTimer) clearTimeout(historyTimer);
    historyTimer=setTimeout(()=>{historyTimer=null;captureHistorySnapshot();},delay);
}

function captureHistorySnapshot(){
    if(historyMute||suppressPersist) return;
    const snap=JSON.stringify(buildBoardPayload());
    if(undoStack.length&&undoStack[undoStack.length-1]===snap) return;
    undoStack.push(snap);
    if(undoStack.length>80) undoStack.shift();
    redoStack=[];
    updateHistoryButtons();
}

function updateHistoryButtons(){
    if(undoBtn) undoBtn.disabled=undoStack.length<=1;
    if(redoBtn) redoBtn.disabled=redoStack.length===0;
}

function loadPromptHistory(){
    try{
        const raw=localStorage.getItem('asq.prompt.history.v1');
        const arr=raw?JSON.parse(raw):[];
        promptHistory=Array.isArray(arr)?arr.filter(x=>typeof x==='string'&&x.trim()):[];
    }catch{promptHistory=[];}
}

function savePromptHistory(){
    localStorage.setItem('asq.prompt.history.v1',JSON.stringify(promptHistory.slice(-300)));
}

function addPromptToHistory(prompt){
    const p=(prompt||'').trim();
    if(!p) return;
    if(promptHistory[promptHistory.length-1]!==p) promptHistory.push(p);
    if(promptHistory.length>300) promptHistory=promptHistory.slice(-300);
    savePromptHistory();
    promptHistoryIndex=-1;
    promptHistoryDraft='';
}

function navigatePromptHistory(dir){
    if(!promptHistory.length) return;
    if(promptHistoryIndex===-1) promptHistoryDraft=aiInput.value||'';
    if(dir<0){
        promptHistoryIndex=(promptHistoryIndex===-1)?promptHistory.length-1:Math.max(0,promptHistoryIndex-1);
        aiInput.value=promptHistory[promptHistoryIndex]||'';
    }else{
        if(promptHistoryIndex===-1) return;
        promptHistoryIndex=Math.min(promptHistory.length,promptHistoryIndex+1);
        if(promptHistoryIndex===promptHistory.length){
            promptHistoryIndex=-1;
            aiInput.value=promptHistoryDraft;
        }else{
            aiInput.value=promptHistory[promptHistoryIndex]||'';
        }
    }
    aiInput.dispatchEvent(new Event('input'));
    aiInput.setSelectionRange(aiInput.value.length,aiInput.value.length);
}

function getExportDir(){
    if(!nodeFs||!nodePath||!nodeOs) return '';
    const dir=nodePath.join(nodeOs.homedir(),'Desktop','Asquarespace Exports');
    try{nodeFs.mkdirSync(dir,{recursive:true});}catch{}
    return dir;
}

function extFromMime(type){
    const t=(type||'').toLowerCase();
    if(t.includes('png')) return 'png';
    if(t.includes('jpeg')||t.includes('jpg')) return 'jpg';
    if(t.includes('webp')) return 'webp';
    if(t.includes('gif')) return 'gif';
    if(t.includes('svg')) return 'svg';
    if(t.includes('avif')) return 'avif';
    if(t.includes('quicktime')||t.includes('mov')) return 'mov';
    if(t.includes('webm')) return 'webm';
    if(t.includes('mp4')) return 'mp4';
    if(t.includes('mpeg')||t.includes('mp3')) return 'mp3';
    if(t.includes('wav')) return 'wav';
    if(t.includes('m4a')||t.includes('aac')) return 'm4a';
    if(t.includes('ogg')) return 'ogg';
    return 'bin';
}

function extFromSrcPath(src){
    const clean=String(src||'').split('#')[0].split('?')[0];
    const m=clean.match(/\.([a-z0-9]{2,8})$/i);
    if(!m) return '';
    const ext=m[1].toLowerCase();
    return ext==='jpeg'?'jpg':ext;
}

function mimeFromExt(ext){
    const e=String(ext||'').toLowerCase();
    if(e==='png') return 'image/png';
    if(e==='jpg'||e==='jpeg') return 'image/jpeg';
    if(e==='webp') return 'image/webp';
    if(e==='gif') return 'image/gif';
    if(e==='svg') return 'image/svg+xml';
    if(e==='avif') return 'image/avif';
    if(e==='mp4') return 'video/mp4';
    if(e==='webm') return 'video/webm';
    if(e==='mov') return 'video/quicktime';
    if(e==='mp3') return 'audio/mpeg';
    if(e==='wav') return 'audio/wav';
    if(e==='m4a') return 'audio/mp4';
    if(e==='ogg') return 'audio/ogg';
    return 'application/octet-stream';
}

function makeExportFilePath(prefix='asq',ext='bin'){
    const dir=getExportDir();
    if(!dir||!nodePath) return '';
    const safePrefix=String(prefix||'asq').replace(/[^a-z0-9_-]+/gi,'_');
    const safeExt=String(ext||'bin').replace(/[^a-z0-9]+/gi,'').toLowerCase()||'bin';
    return nodePath.join(dir,`${safePrefix}_${Date.now()}_${Math.floor(Math.random()*100000)}.${safeExt}`);
}

function getNodeMediaElement(node){
    if(!node) return null;
    return node.querySelector('.node-inner img, .node-inner video, .node-inner audio');
}

function getNodeMediaSrc(node){
    const media=getNodeMediaElement(node);
    return media?(media.currentSrc||media.src||''):'';
}

function toFileUrl(fp){
    return `file://${String(fp||'').replace(/\\/g,'/')}`;
}

function filePathFromFileUrl(src){
    if(!/^file:\/\//i.test(String(src||''))) return '';
    return decodeURIComponent(String(src).replace(/^file:\/\//i,''));
}

function mediaExtFromSource(src){
    const clean=String(src||'').split('#')[0].split('?')[0];
    const m=clean.match(/\.([a-z0-9]{2,8})$/i);
    return m?m[1].toLowerCase():'';
}

function normalizePreviewSource(ref){
    const s=String(ref||'').trim();
    if(!s) return '';
    if(/^https?:\/\//i.test(s)||/^file:\/\//i.test(s)||/^blob:/i.test(s)||/^data:/i.test(s)) return s;
    return toFileUrl(s);
}

function downloadUrlBuffer(url,maxRedirects=5){
    return new Promise((resolve,reject)=>{
        const u=String(url||'').trim();
        const client=/^https:\/\//i.test(u)?nodeHttps:(/^http:\/\//i.test(u)?nodeHttp:null);
        if(!client){reject(new Error('Unsupported URL protocol'));return;}
        try{
            const req=client.get(u,{headers:{'User-Agent':'Mozilla/5.0','Accept':'*/*'}},res=>{
                const code=res.statusCode||0;
                const loc=(res.headers&&res.headers.location)||'';
                if(code>=300&&code<400&&loc&&maxRedirects>0){
                    const next=/^https?:\/\//i.test(loc)?loc:new URL(loc,u).toString();
                    res.resume();
                    resolve(downloadUrlBuffer(next,maxRedirects-1));
                    return;
                }
                if(code<200||code>=300){
                    res.resume();
                    reject(new Error(`HTTP ${code}`));
                    return;
                }
                const chunks=[];
                res.on('data',c=>chunks.push(c));
                res.on('end',()=>resolve({
                    buffer:Buffer.concat(chunks),
                    contentType:String((res.headers&&res.headers['content-type'])||'')
                }));
            });
            req.on('error',reject);
        }catch(err){
            reject(err);
        }
    });
}

async function ensureNodeHasLocalFile(node,prefix='asset'){
    if(!node||!nodeFs||!nodePath) return '';

    const existing=(node.dataset.filePath||'').trim();
    if(existing){
        if(!nodeFs.existsSync||nodeFs.existsSync(existing)) return existing;
        node.dataset.filePath='';
    }

    const media=getNodeMediaElement(node);
    if(!media) return '';
    const src=getNodeMediaSrc(node);
    if(!src) return '';

    const fromFile=filePathFromFileUrl(src);
    if(fromFile){
        node.dataset.filePath=fromFile;
        return fromFile;
    }

    try{
        let outPath='';
        if(/^https?:\/\//i.test(src)&&(nodeHttps||nodeHttp)){
            const dl=await downloadUrlBuffer(src.replace(/ /g,'%20'));
            const byType=extFromMime(dl.contentType);
            const ext=byType!=='bin'?byType:(extFromSrcPath(src)||'jpg');
            outPath=makeExportFilePath(prefix,ext);
            nodeFs.writeFileSync(outPath,dl.buffer);
        }else{
            const res=await fetch(src);
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob=await res.blob();
            const byType=extFromMime(blob.type);
            const ext=byType!=='bin'?byType:(extFromSrcPath(src)||'jpg');
            outPath=makeExportFilePath(prefix,ext);
            nodeFs.writeFileSync(outPath,Buffer.from(await blob.arrayBuffer()));
        }

        if(!outPath) return '';
        node.dataset.filePath=outPath;
        media.src=toFileUrl(outPath);
        if(media.tagName==='VIDEO'||media.tagName==='AUDIO'){
            try{media.load();}catch{}
        }
        schedulePersist(120);
        return outPath;
    }catch(err){
        console.warn('Localize media failed',err);
        return '';
    }
}

async function persistGeneratedBlob(blob,prefix='asq'){
    if(!blob||!nodeFs||!nodePath) return '';
    const dir=getExportDir();
    if(!dir) return '';
    const ext=extFromMime(blob.type);
    const fp=nodePath.join(dir,`${prefix}_${Date.now()}_${Math.floor(Math.random()*100000)}.${ext}`);
    nodeFs.writeFileSync(fp,Buffer.from(await blob.arrayBuffer()));
    return fp;
}

function readBoards(projectKey){
    try{
        const raw=localStorage.getItem(getBoardMetaKey(projectKey));
        const parsed=raw?JSON.parse(raw):null;
        if(parsed&&Array.isArray(parsed.boards)&&parsed.boards.length){
            return {
                boards:parsed.boards.map(b=>({id:b.id,name:b.name||'Board'})).filter(b=>b.id),
                currentBoardId:parsed.currentBoardId||parsed.boards[0].id
            };
        }
    }catch(err){console.warn('read boards failed',err);}
    return {boards:[{id:'board-1',name:'Board 1'}],currentBoardId:'board-1'};
}

function saveBoards(projectKey){
    localStorage.setItem(getBoardMetaKey(projectKey),JSON.stringify({boards,currentBoardId}));
}

function getBoardNodeCount(boardId){
    try{
        const raw=localStorage.getItem(getStorageKey(currentProjectKey,boardId));
        if(!raw) return 0;
        const data=JSON.parse(raw);
        return Array.isArray(data.nodes)?data.nodes.length:0;
    }catch{return 0;}
}

function renderBoardList(){
    if(!boardList) return;
    boardList.innerHTML='';
    boards.forEach(b=>{
        const row=document.createElement('div');
        row.className=`board-item${b.id===currentBoardId?' active':''}`;
        row.dataset.boardId=b.id;

        const name=document.createElement('div');
        name.className='board-item-name';
        name.textContent=b.name;

        const count=document.createElement('div');
        count.className='board-item-count';
        count.textContent=String(getBoardNodeCount(b.id));

        const actions=document.createElement('div');
        actions.className='board-actions';
        actions.innerHTML='<button class="board-action" data-action="rename" title="Rename"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.96 1.96 3.75 3.75 2.12-2.12z"/></svg></button><button class="board-action" data-action="duplicate" title="Duplicate"><svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button><button class="board-action" data-action="delete" title="Delete"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>';

        row.appendChild(name);
        row.appendChild(count);
        row.appendChild(actions);
        boardList.appendChild(row);
    });
    const current=boards.find(b=>b.id===currentBoardId);
    if(boardCurrentName&&current) boardCurrentName.textContent=current.name;
}

function serializeNode(n){
    const base={
        x:parseFloat(n.style.left)||0,
        y:parseFloat(n.style.top)||0,
        transform:n.style.transform||'',
        favorite:n.dataset.favorite==='1',
        mediaKind:n.dataset.mediaKind||''
    };
    const inner=n.querySelector('.node-inner');
    if(!inner) return null;

    if(n.classList.contains('note-card')||n.classList.contains('chat-card')){
        const c=n.querySelector('.note-content');
        return {
            ...base,
            type:n.classList.contains('chat-card')?'chat':'note',
            background:inner.style.background||'',
            width:inner.style.width||'',
            height:inner.style.height||'',
            text:c?c.textContent:'',
            textStyle:c?{
                fontSize:c.style.fontSize||'',
                fontWeight:c.style.fontWeight||'',
                textAlign:c.style.textAlign||'',
                fontFamily:c.style.fontFamily||'',
                color:c.style.color||''
            }:{}
        };
    }

    const media=inner.querySelector('img,video,audio');
    if(!media) return null;
    const mediaWrap=inner.querySelector('.media-player');
    return {
        ...base,
        type:media.tagName==='VIDEO'?'video':(media.tagName==='AUDIO'?'audio':'image'),
        src:media.currentSrc||media.src||'',
        filePath:n.dataset.filePath||'',
        width:(mediaWrap?mediaWrap.style.width:media.style.width)||'',
        height:(mediaWrap?mediaWrap.style.height:media.style.height)||'',
        maxWidth:media.style.maxWidth||'',
        maxHeight:media.style.maxHeight||''
    };
}

function buildBoardPayload(){
    const nodes=allNodes.map(serializeNode).filter(Boolean);
    return {
        version:2,
        projectKey:currentProjectKey,
        boardId:currentBoardId,
        savedAt:Date.now(),
        view:{tx,ty,sc},
        ui:{appMode,currentModel,genW,genH,isDark},
        nodes
    };
}

function saveProjectState(){
    if(!persistenceReady||suppressPersist) return;
    try{
        const payload=buildBoardPayload();
        localStorage.setItem(getStorageKey(currentProjectKey,currentBoardId),JSON.stringify(payload));
        saveBoards(currentProjectKey);
        renderBoardList();
    }catch(err){
        console.warn('persist save failed',err);
    }
}

function clearCanvasNodes(){
    allNodes.forEach(n=>n.remove());
    allNodes=[];
    clearSel();
}

function restoreNode(item){
    const node=makeNode(item.x||0,item.y||0);
    if(item.transform) node.style.transform=item.transform;

    const inner=document.createElement('div');
    inner.className='node-inner';

    if(item.type==='note'||item.type==='chat'){
        node.classList.add(item.type==='chat'?'chat-card':'note-card');
        if(item.background) inner.style.background=item.background;
        if(item.width) inner.style.width=item.width;
        if(item.height) inner.style.height=item.height;
        const c=document.createElement('div');
        c.className='note-content';
        c.textContent=item.text||'';
        const st=item.textStyle||{};
        if(st.fontSize) c.style.fontSize=st.fontSize;
        if(st.fontWeight) c.style.fontWeight=st.fontWeight;
        if(st.textAlign) c.style.textAlign=st.textAlign;
        if(st.fontFamily) c.style.fontFamily=st.fontFamily;
        if(st.color) c.style.color=st.color;
        inner.appendChild(c);
    }else if(item.type==='video'){
        const vsrc=item.filePath?`file://${item.filePath.replace(/\\/g,'/')}`:(item.src||'');
        const w=parseInt(item.width,10)||360;
        inner.appendChild(createMediaPlayer('video',vsrc,w,220));
    }else if(item.type==='audio'){
        const asrc=item.filePath?`file://${item.filePath.replace(/\\/g,'/')}`:(item.src||'');
        const w=parseInt(item.width,10)||492;
        inner.appendChild(createMediaPlayer('audio',asrc,w,44));
    }else{
        const img=document.createElement('img');
        img.src=item.filePath?`file://${item.filePath.replace(/\\/g,'/')}`:(item.src||'');
        if(item.width) img.style.width=item.width;
        if(item.height) img.style.height=item.height;
        if(item.maxWidth) img.style.maxWidth=item.maxWidth;
        if(item.maxHeight) img.style.maxHeight=item.maxHeight;
        if(item.mediaKind==='png'||item.mediaKind==='svg') inner.classList.add('alpha-preview');
        inner.appendChild(img);
    }

    if(item.filePath){
        // Temp-file migration
        if(nodeFs && nodePath && (item.filePath.includes('/var/folders/') || item.filePath.includes('/tmp/'))){
            const expDir = getExportDir();
            if(expDir){
                const newFp = nodePath.join(expDir, nodePath.basename(item.filePath));
                if(nodeFs.existsSync(item.filePath)){
                    try {
                        nodeFs.copyFileSync(item.filePath, newFp);
                        item.filePath = newFp;
                        schedulePersist(500);
                    } catch(err) { console.warn('Migrate failed', err) }
                }
            }
        }
        node.dataset.filePath=item.filePath;
    }
    if(item.favorite) node.dataset.favorite='1';
    if(item.mediaKind) node.dataset.mediaKind=item.mediaKind;
    finishNode(node,inner,false);
}

function loadBoardState(projectKey,boardId){
    try{
        const raw=localStorage.getItem(getStorageKey(projectKey,boardId));
        if(!raw) return false;
        const data=JSON.parse(raw);
        if(!data||!Array.isArray(data.nodes)) return false;

        suppressPersist=true;
        clearCanvasNodes();
        (data.nodes||[]).forEach(restoreNode);
        const v=data.view||{};
        if(typeof v.tx==='number'&&typeof v.ty==='number'&&typeof v.sc==='number'){
            setT(v.tx,v.ty,v.sc);
        }

        const ui=data.ui||{};
        if(typeof ui.isDark==='boolean') applyTheme(ui.isDark);
        if(typeof ui.genW==='number'&&typeof ui.genH==='number'){
            genW=ui.genW;genH=ui.genH;
            sizeLabel.textContent=`${genW} × ${genH}`;
            sizeDD.querySelectorAll('.size-opt').forEach(b=>{
                b.classList.toggle('active',parseInt(b.dataset.w)===genW&&parseInt(b.dataset.h)===genH);
            });
        }
        if(ui.currentModel){currentModel=ui.currentModel;modelLabel.textContent=ui.currentModel;}
        if(ui.appMode) setMode(ui.appMode);
        renderFavoritesStrip();
        return true;
    }catch(err){
        console.warn('persist load failed',err);
        return false;
    }finally{
        suppressPersist=false;
    }
}

async function switchProjectContextIfNeeded(){
    const key=await getActiveProjectKey();
    if(key===currentProjectKey) return;
    saveProjectState();
    currentProjectKey=key;
    const meta=readBoards(currentProjectKey);
    boards=meta.boards;
    currentBoardId=meta.currentBoardId;
    renderBoardList();
    const hasSaved=!!localStorage.getItem(getStorageKey(currentProjectKey,currentBoardId));
    if(hasSaved) loadBoardState(currentProjectKey,currentBoardId);
    else clearCanvasNodes();
    recoverCanvasIfEmpty(currentProjectKey);
    undoStack=[];
    redoStack=[];
    captureHistorySnapshot();
}

async function initPersistence(){
    currentProjectKey=await getActiveProjectKey();
    migrateLegacyProjectStateIfNeeded(currentProjectKey);
    const meta=readBoards(currentProjectKey);
    boards=meta.boards;
    currentBoardId=meta.currentBoardId;
    renderBoardList();
    loadBoardState(currentProjectKey,currentBoardId);
    recoverCanvasIfEmpty(currentProjectKey);
    persistenceReady=true;
    captureHistorySnapshot();

    // Switch project context only on regaining focus (safe, non-destructive).
    window.addEventListener('focus',()=>{switchProjectContextIfNeeded();});
    window.addEventListener('beforeunload',()=>{saveProjectState();if(projectPollTimer)clearInterval(projectPollTimer);});

    // Any canvas/content mutation schedules a debounced save.
    const observer=new MutationObserver(()=>{schedulePersist(350);scheduleHistoryCapture(350);renderFavoritesStrip();});
    observer.observe(canvas,{childList:true,subtree:true,attributes:true,characterData:true});
    aiInput.addEventListener('input',()=>schedulePersist(500));
}

// ── Theme ─────────────────────────────────────────────────────────────────
function applyTheme(dark){isDark=dark;html.setAttribute('data-theme',dark?'dark':'light');iconSun.style.display=dark?'none':'';iconMoon.style.display=dark?'':'none';schedulePersist(250);}
themeToggle.addEventListener('click',()=>applyTheme(!isDark));
document.getElementById('extra-toggle-theme').addEventListener('click',()=>{closeAllDD();applyTheme(!isDark);});
document.getElementById('extra-reset-view').addEventListener('click',()=>{closeAllDD();const r=viewport.getBoundingClientRect();setT(r.width/2,r.height/2,1);});

// ── Transform ─────────────────────────────────────────────────────────────
function setT(x,y,s){
    tx=x;ty=y;sc=Math.max(0.04,Math.min(s,20));
    canvas.style.transform=`translate(${tx}px,${ty}px) scale(${sc})`;
    viewport.style.backgroundPosition=`${tx}px ${ty}px`;
    viewport.style.backgroundSize=`${24*sc}px ${24*sc}px`;
    const inv=1/sc;
    const handleScale=Math.max(1.1,Math.min(3.0,inv));
    const rotateScale=Math.max(1.0,Math.min(2.2,inv));
    document.querySelectorAll('.scale-handle').forEach(h=>{
        h.style.transform=`scale(${handleScale})`;
        h.style.borderWidth=(1.2*handleScale)+'px';
    });
    document.querySelectorAll('.rotate-handle').forEach(h=>h.style.transform=`scale(${rotateScale})`);
    updateCtxPos();
    updateNoteToolbarPos();
    updateMultiSelectionBox();
}
function vToC(vx,vy){return{x:(vx-tx)/sc,y:(vy-ty)/sc};}
function viewCenter(){const r=viewport.getBoundingClientRect();return vToC(r.width/2,r.height/2);}

function fitViewportToVisibleArea(){
    const vv=window.visualViewport;
    const visW=Math.max(1,Math.floor(vv&&vv.width?vv.width:window.innerWidth||0));
    const visH=Math.max(1,Math.floor(vv&&vv.height?vv.height:window.innerHeight||0));
    if(uiContainer){
        uiContainer.style.width=visW+'px';
        uiContainer.style.height=visH+'px';
    }
    if(viewport){
        viewport.style.width=visW+'px';
        viewport.style.height=visH+'px';
    }
}

fitViewportToVisibleArea();
window.addEventListener('resize',()=>fitViewportToVisibleArea());
if(window.visualViewport){
    window.visualViewport.addEventListener('resize',fitViewportToVisibleArea);
    window.visualViewport.addEventListener('scroll',fitViewportToVisibleArea);
}

setTimeout(fitViewportToVisibleArea,120);
setTimeout(fitViewportToVisibleArea,420);
setTimeout(fitViewportToVisibleArea,1200);
setTimeout(()=>{const r=viewport.getBoundingClientRect();setT(r.width/2,r.height/2,1);},0);

// ── Grid placement ─────────────────────────────────────────────────────────
function getGridPos(w,h){const vc=viewCenter();const total=(w+PLACE_GAP)*PLACE_COLS-PLACE_GAP;const x=vc.x-total/2+placeColumn*(w+PLACE_GAP);const y=vc.y-h/2+placeRow*(h+PLACE_GAP*1.5);placeColumn++;if(placeColumn>=PLACE_COLS){placeColumn=0;placeRow++;}return{x,y};}
function resetGrid(){placeColumn=0;placeRow=0;}

function getCenteredSpawnAboveToolbar(w,h){
    // Anchor around current camera center so result appears where the user is looking.
    const vc=viewCenter();
    const yOffset=Math.max(90,h*0.16);
    return {x:vc.x,y:vc.y-yOffset};
}

// ── Selection ─────────────────────────────────────────────────────────────
function syncSelectionMeta(){
    document.body.classList.toggle('multi-select',selectedSet.size>1);
    renderSelectedImageChips();
    updateModelScopeForSelection();
    refreshImageModelDropdownForSelection();
    updateFavoriteButtonsState();
}

function updateFavoriteButtonsState(){
    const nodes=[...selectedSet];
    const hasAnyFavorite=nodes.some(n=>n.dataset.favorite==='1');
    const ctxFav=document.getElementById('ctx-favorite');
    const noteFav=document.getElementById('nt-favorite');
    if(ctxFav) ctxFav.classList.toggle('is-active',hasAnyFavorite&&nodes.length>0);
    if(noteFav) noteFav.classList.toggle('is-active',hasAnyFavorite&&nodes.length>0);
}

function clearSel(){
    selectedSet.forEach(n=>n.classList.remove('selected'));
    selectedSet.clear();
    selectedNote=null;
    updateCtxPos();
    updateMultiSelectionBox();
    updateNoteToolbarPos();
    updateThumbs();
    syncSelectionMeta();
}

function addSel(n){
    selectedSet.add(n);
    n.classList.add('selected');
    updateCtxPos();
    updateMultiSelectionBox();
    updateNoteToolbarPos();
    updateThumbs();
    syncSelectionMeta();
}

function removeSel(n){
    if(!selectedSet.has(n)) return;
    selectedSet.delete(n);
    n.classList.remove('selected');
    updateCtxPos();
    updateMultiSelectionBox();
    updateNoteToolbarPos();
    updateThumbs();
    syncSelectionMeta();
}

function selOnly(n){clearSel();addSel(n);}

function deleteSelected(){
    if(!selectedSet.size) return;
    selectedSet.forEach(n=>{n.remove();allNodes=allNodes.filter(x=>x!==n);});
    selectedSet.clear();
    selectedNote=null;
    updateCtxPos();
    updateMultiSelectionBox();
    updateNoteToolbarPos();
    updateThumbs();
    syncSelectionMeta();
    renderFavoritesStrip();
    captureHistorySnapshot();
    schedulePersist(120);
}

function getSelectedImageNodes(){
    return [...selectedSet].filter(n=>{
        if(!n||n.classList.contains('note-card')||n.classList.contains('chat-card')) return false;
        const media=n.querySelector('.node-inner img');
        const hasVideo=!!n.querySelector('.node-inner video');
        const hasAudio=!!n.querySelector('.node-inner audio');
        return !!media&&!hasVideo&&!hasAudio;
    });
}

function isImageNode(node){
    if(!node) return false;
    const hasImg=!!node.querySelector('.node-inner img');
    const hasVideo=!!node.querySelector('.node-inner video');
    const hasAudio=!!node.querySelector('.node-inner audio');
    return hasImg&&!hasVideo&&!hasAudio;
}

function getPrimarySelectedImageNode(){
    const images=getSelectedImageNodes();
    return images.length===1?images[0]:null;
}

function getPrimarySelectedMediaNode(){
    return [...selectedSet].find(n=>!!getNodeMediaElement(n))||null;
}

function getNodeImageUrl(node){
    if(!node) return '';
    const fp=node.dataset.filePath||'';
    if(fp) return toFileUrl(fp);
    const img=node.querySelector('.node-inner img');
    return img?(img.currentSrc||img.src||''):'';
}

function isMultiImageEditActive(){
    return appMode==='ai'&&getSelectedImageNodes().length>=2;
}

function updateModelScopeForSelection(){
    if(appMode!=='ai') return;
    if(!Array.isArray(modelCatalog.image)||!modelCatalog.image.length) return;
    const editMode=isMultiImageEditActive();
    const allowed=editMode?(modelCatalog.imageVision||[]):modelCatalog.image;
    if(!allowed.length) return;
    if(!allowed.includes(currentModel)){
        currentModel=allowed[0];
        modelLabel.textContent=currentModel;
    }
    genBtn.textContent=editMode?'Edit selected images':'Create image';
}

function setMarqueeBox(x1,y1,x2,y2){
    const left=Math.min(x1,x2),top=Math.min(y1,y2);
    const width=Math.abs(x2-x1),height=Math.abs(y2-y1);
    selBox.style.left=left+'px';
    selBox.style.top=top+'px';
    selBox.style.width=width+'px';
    selBox.style.height=height+'px';
}

function marqueeSelect(x1,y1,x2,y2,append=false){
    const left=Math.min(x1,x2),top=Math.min(y1,y2);
    const right=Math.max(x1,x2),bottom=Math.max(y1,y2);
    if(!append) clearSel();
    allNodes.forEach(n=>{
        const r=n.getBoundingClientRect();
        const hit=!(r.right<left||r.left>right||r.bottom<top||r.top>bottom);
        if(hit) addSel(n);
    });
}

function updateCtxPos(){
    if(drag&&(drag.type==='marquee'||drag.type==='drag'||drag.type==='scale'||drag.type==='rotate'||drag.type==='pan'||drag.type==='cmdZoom')){
        ctxToolbar.classList.add('hidden');
        if(multiToolbar) multiToolbar.classList.add('hidden');
        return;
    }
    const allSel=[...selectedSet];
    if(!allSel.length){
        ctxToolbar.classList.add('hidden');
        if(multiToolbar) multiToolbar.classList.add('hidden');
        return;
    }
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    allSel.forEach(n=>{const r=n.getBoundingClientRect();if(r.left<minX)minX=r.left;if(r.top<minY)minY=r.top;if(r.right>maxX)maxX=r.right;if(r.bottom>maxY)maxY=r.bottom;});
    const mediaSel=allSel.filter(n=>!n.classList.contains('note-card')&&!n.classList.contains('chat-card'));
    const isMulti=allSel.length>1;
    if(isMulti&&multiToolbar){
        ctxToolbar.classList.add('hidden');
        multiToolbar.style.left=`${(minX+maxX)/2}px`;
        multiToolbar.style.top=`${minY}px`;
        multiToolbar.classList.remove('hidden');
    }else{
        if(multiToolbar) multiToolbar.classList.add('hidden');
        if(mediaSel.length===1){
            ctxToolbar.style.left=`${(minX+maxX)/2}px`;
            ctxToolbar.style.top=`${minY}px`;
            ctxToolbar.classList.remove('hidden');
            const imageOnly=isImageNode(mediaSel[0]);
            const regen=document.getElementById('ctx-regenerate');
            const more=document.getElementById('ctx-more-like');
            const batch=document.getElementById('ctx-batch-size');
            if(regen) regen.style.display=imageOnly?'':'none';
            if(more) more.style.display=imageOnly?'':'none';
            if(batch) batch.style.display=imageOnly?'':'none';
        }else{
            ctxToolbar.classList.add('hidden');
        }
    }
}

function updateMultiSelectionBox(){
    if(!multiSelBox) return;
    if(drag&&drag.type==='marquee'){multiSelBox.style.display='none';return;}
    if(selectedSet.size<=1){multiSelBox.style.display='none';return;}
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    selectedSet.forEach(n=>{
        const r=n.getBoundingClientRect();
        if(r.left<minX)minX=r.left;
        if(r.top<minY)minY=r.top;
        if(r.right>maxX)maxX=r.right;
        if(r.bottom>maxY)maxY=r.bottom;
    });
    if(!isFinite(minX)||!isFinite(minY)||!isFinite(maxX)||!isFinite(maxY)){multiSelBox.style.display='none';return;}
    multiSelBox.style.left=minX+'px';
    multiSelBox.style.top=minY+'px';
    multiSelBox.style.width=Math.max(0,maxX-minX)+'px';
    multiSelBox.style.height=Math.max(0,maxY-minY)+'px';
    multiSelBox.style.display='block';
}
function updateNoteToolbarPos(){
    if(drag&&(drag.type==='drag'||drag.type==='scale'||drag.type==='rotate'||drag.type==='pan'||drag.type==='cmdZoom'||drag.type==='marquee')){
        noteToolbar.classList.add('hidden');
        return;
    }
    if(selectedSet.size!==1){noteToolbar.classList.add('hidden');return;}
    const n=[...selectedSet].find(n=>n.classList.contains('note-card')||n.classList.contains('chat-card'));
    selectedNote=n||null;
    if(!n){noteToolbar.classList.add('hidden');return;}
    const r=n.getBoundingClientRect();
    noteToolbar.style.left=`${r.left+r.width/2}px`;noteToolbar.style.top=`${r.top}px`;
    noteToolbar.classList.remove('hidden');
    const inner=n.querySelector('.node-inner');
    if(inner) ntColorSwatch.style.background=inner.style.background||'#fff9c4';
}
function updateThumbs(){
    renderSelectedImageChips();
}

function jumpToNode(node){
    const r=viewport.getBoundingClientRect();
    const nx=parseFloat(node.style.left)||0;
    const ny=parseFloat(node.style.top)||0;
    setT(r.width/2-nx*sc,r.height/2-ny*sc,sc);
    selOnly(node);
}

function renderFavoritesStrip(){
    if(!favoritesStrip) return;
    favoritesStrip.innerHTML='';
    const favs=allNodes.filter(n=>n.dataset.favorite==='1');
    favs.forEach(n=>{
        const media=n.querySelector('img,video');
        if(!media) return;
        const th=document.createElement('img');
        th.className='favorites-thumb';
        th.src=media.currentSrc||media.src||'';
        th.addEventListener('click',()=>jumpToNode(n));
        favoritesStrip.appendChild(th);
    });
}

function toggleFavoriteOnSelection(){
    if(!selectedSet.size) return;
    const shouldSet=[...selectedSet].some(n=>n.dataset.favorite!=='1');
    selectedSet.forEach(n=>{n.dataset.favorite=shouldSet?'1':'0';});
    renderFavoritesStrip();
    schedulePersist(150);
}

// Delete key
window.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){
        e.preventDefault();
        undo();
        return;
    }
    if(((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key.toLowerCase()==='z')||((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='y')){
        e.preventDefault();
        redo();
        return;
    }
    const isPromptTarget=e.target===aiInput;
    if(e.key==='Tab'&&!e.target.isContentEditable&&(isPromptTarget||(e.target.tagName!=='INPUT'&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='SELECT'))){
        e.preventDefault();
        cycleMode(e.shiftKey?-1:1);
        return;
    }
    const tag=e.target.tagName;
    if((e.key==='Backspace'||e.key==='Delete')&&!e.target.isContentEditable&&tag!=='INPUT'&&tag!=='TEXTAREA')deleteSelected();
});

function renderSelectedImageChips(){
    thumbList.innerHTML='';
    const selectedImages=getSelectedImageNodes();
    selectedImages.forEach((n,idx)=>{
        const src=getNodeImageUrl(n);
        if(!src) return;
        const wrap=document.createElement('div');
        wrap.className='prompt-thumb-wrap';
        const t=document.createElement('img');
        t.className='prompt-thumb';
        t.src=src;
        t.title=`Image ${idx+1}`;
        const badge=document.createElement('div');
        badge.className='prompt-thumb-badge';
        badge.textContent=String(idx+1);
        wrap.appendChild(t);
        wrap.appendChild(badge);
        thumbList.appendChild(wrap);
    });
}

// ── Note Toolbar ───────────────────────────────────────────────────────────
function applyNoteStyle(){
    if(!selectedNote) return;
    const c=selectedNote.querySelector('.note-content'); if(!c) return;
    c.style.fontSize=activeFontSize+'px';c.style.fontWeight=activeBold?'bold':'normal';
    c.style.textAlign=activeAlign;c.style.fontFamily=ntFontSel.value;
}

function syncNoteSizeControls(){
    if(ntSizeInput) ntSizeInput.value=String(activeFontSize);
    document.querySelectorAll('.nt-btn[data-size]').forEach(b=>{
        b.classList.toggle('active',parseInt(b.dataset.size,10)===activeFontSize);
    });
}

document.querySelectorAll('.nt-btn[data-size]').forEach(btn=>{
    btn.addEventListener('click',e=>{e.stopPropagation();activeFontSize=parseInt(btn.dataset.size,10);syncNoteSizeControls();applyNoteStyle();});
});
if(ntSizeInput){
    const applyTypedSize=e=>{
        e.stopPropagation();
        const raw=parseInt(ntSizeInput.value,10);
        if(!Number.isFinite(raw)) return;
        activeFontSize=Math.max(8,Math.min(240,raw));
        syncNoteSizeControls();
        applyNoteStyle();
    };
    ntSizeInput.addEventListener('input',applyTypedSize);
    ntSizeInput.addEventListener('change',applyTypedSize);
}
document.getElementById('nt-bold').addEventListener('click',e=>{e.stopPropagation();activeBold=!activeBold;document.getElementById('nt-bold').classList.toggle('active',activeBold);applyNoteStyle();});
['l','c','r'].forEach(d=>{document.getElementById(`nt-align-${d}`).addEventListener('click',e=>{e.stopPropagation();activeAlign=d==='l'?'left':d==='c'?'center':'right';['l','c','r'].forEach(x=>document.getElementById(`nt-align-${x}`).classList.remove('active'));document.getElementById(`nt-align-${d}`).classList.add('active');applyNoteStyle();});});
ntFontSel.addEventListener('change',e=>{e.stopPropagation();applyNoteStyle();});
document.getElementById('nt-delete').addEventListener('click',e=>{e.stopPropagation();deleteSelected();});
ntColorSwatch.addEventListener('click',e=>{e.stopPropagation();colorPopup.classList.toggle('hidden');});
document.querySelectorAll('.color-swatch').forEach(sw=>{
    sw.addEventListener('click',e=>{e.stopPropagation();const col=sw.dataset.color;ntColorSwatch.style.background=col;document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('selected'));sw.classList.add('selected');if(selectedNote){const inner=selectedNote.querySelector('.node-inner');if(inner){inner.style.background=col;const c=selectedNote.querySelector('.note-content');if(c)c.style.color=col==='#2d2d2d'?'#f0f0f0':'#3a3a3a';}}colorPopup.classList.add('hidden');});
});

// ── Navigation ─────────────────────────────────────────────────────────────
// Left-click drag on empty canvas = marquee selection
// Cmd/Ctrl + left drag (or middle drag) = pan
// Option/Alt + left drag (or Cmd/Ctrl+middle drag) = zoom
// Cmd+scroll = zoom; two-finger scroll = pan; pinch = zoom
viewport.addEventListener('mousedown',e=>{
    const navModifier=e.altKey||e.metaKey||e.ctrlKey||e.button===1;
    if(e.target!==viewport&&e.target!==canvas&&!navModifier) return;
    closeAllDD();

    if(e.button===2){
        // Right-click drag is intentionally disabled for pan/zoom.
        e.preventDefault();
        return;
    }
    if(e.button===1){
        e.preventDefault();
        if(e.metaKey||e.ctrlKey||e.altKey){
            drag={type:'cmdZoom',lastY:e.clientY,pivX:e.clientX,pivY:e.clientY};
            viewport.classList.add('is-cmd-zoom');
        }else{
            drag={type:'pan',lastX:e.clientX,lastY:e.clientY};
            viewport.classList.add('is-panning');
        }
        return;
    }
    if(e.button!==0) return;

    if(e.altKey){
        e.preventDefault();
        drag={type:'cmdZoom',lastY:e.clientY,pivX:e.clientX,pivY:e.clientY};
        viewport.classList.add('is-cmd-zoom');
        return;
    }

    if(e.metaKey||e.ctrlKey){
        e.preventDefault();
        drag={type:'pan',lastX:e.clientX,lastY:e.clientY};
        viewport.classList.add('is-panning');
        return;
    }

    drag={type:'marquee',startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,append:e.shiftKey};
    selBox.style.display='block';
    setMarqueeBox(e.clientX,e.clientY,e.clientX,e.clientY);
});
viewport.addEventListener('contextmenu',e=>e.preventDefault());

window.addEventListener('mousemove',e=>{
    if(!drag) return;
    const d=drag;
    if(d.type==='pan'){
        setT(tx+(e.clientX-d.lastX),ty+(e.clientY-d.lastY),sc);
        d.lastX=e.clientX;d.lastY=e.clientY;
    } else if(d.type==='cmdZoom'){
        const dy=d.lastY-e.clientY;d.lastY=e.clientY;
        const f=Math.exp(dy*0.012);
        setT(d.pivX-(d.pivX-tx)*f,d.pivY-(d.pivY-ty)*f,sc*f);
    } else if(d.type==='marquee'){
        d.lastX=e.clientX;d.lastY=e.clientY;
        setMarqueeBox(d.startX,d.startY,d.lastX,d.lastY);
        marqueeSelect(d.startX,d.startY,d.lastX,d.lastY,d.append);
    } else if(d.type==='drag'){
        const dx=(e.clientX-d.startX)/sc,dy=(e.clientY-d.startY)/sc;
        selectedSet.forEach(n=>{n.style.left=(d.origins.get(n).x+dx)+'px';n.style.top=(d.origins.get(n).y+dy)+'px';});
        interactionDirty=true;
        updateCtxPos();updateMultiSelectionBox();updateNoteToolbarPos();
    } else if(d.type==='rotate'){
        const nr=d.node.getBoundingClientRect();
        const cx=nr.left+nr.width/2,cy=nr.top+nr.height/2;
        const now=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;
        const delta=now-d.startMouseAngle;
        d.node.style.transform=`rotate(${d.startNodeAngle+delta}deg)`;
        interactionDirty=true;
        updateMultiSelectionBox();
    } else if(d.type==='scale'){
        const dx=(e.clientX-d.startX)/sc;
        const dy=(e.clientY-d.startY)/sc;
        let sx=1,sy=1;
        if(d.handle==='br'){sx=(d.ow+dx)/d.ow;sy=(d.oh+dy)/d.oh;}
        else if(d.handle==='tr'){sx=(d.ow+dx)/d.ow;sy=(d.oh-dy)/d.oh;}
        else if(d.handle==='bl'){sx=(d.ow-dx)/d.ow;sy=(d.oh+dy)/d.oh;}
        else {sx=(d.ow-dx)/d.ow;sy=(d.oh-dy)/d.oh;}
        const f=Math.max(0.08,Math.min(12,Math.max(sx,sy)));
        const nw=clamp(d.ow*f,d.minW,d.maxW);
        const nh=clamp(d.oh*f,d.minH,d.maxH);
        const mediaEl=d.el.querySelector&&d.el.querySelector('.media-el');
        const isVideoMedia=!!(mediaEl&&mediaEl.tagName==='VIDEO');
        const isAudioMedia=!!(mediaEl&&mediaEl.tagName==='AUDIO');
        if(isVideoMedia){
            d.el.style.width=nw+'px';
            d.el.style.height='';
            mediaEl.style.height='auto';
        }else if(isAudioMedia){
            d.el.style.width=nw+'px';
            d.el.style.height='58px';
        }else{
            d.el.style.width=nw+'px';
            d.el.style.height=nh+'px';
        }
        interactionDirty=true;
        updateMultiSelectionBox();
    }
});

window.addEventListener('mouseup',()=>{
    if(drag&&drag.type==='marquee'){
        const moved=Math.hypot(drag.lastX-drag.startX,drag.lastY-drag.startY);
        if(moved<3&&!drag.append) clearSel();
        selBox.style.display='none';
    }
    if(interactionDirty){
        captureHistorySnapshot();
        schedulePersist(120);
    }
    interactionDirty=false;
    drag=null;
    updateCtxPos();
    updateNoteToolbarPos();
    updateMultiSelectionBox();
    viewport.classList.remove('is-panning','is-cmd-zoom');
});

window.addEventListener('mousedown',e=>{
    if((e.altKey||e.metaKey||e.ctrlKey)&&e.target&&e.target.closest&&e.target.closest('.canvas-node')){
        e.preventDefault();
    }
},true);

// Wheel: two-finger = pan, Cmd+wheel = smooth zoom, Ctrl+wheel/pinch = zoom
let gestureLastScale=1;
let gestureAnchorX=0;
let gestureAnchorY=0;
let pinchSignalUntil=0;

document.addEventListener('gesturestart',e=>{
    e.preventDefault();
    const r=viewport.getBoundingClientRect();
    gestureAnchorX=e.clientX-r.left;
    gestureAnchorY=e.clientY-r.top;
    gestureLastScale=e.scale||1;
    pinchSignalUntil=Date.now()+260;
    viewport.classList.add('is-cmd-zoom');
},{passive:false,capture:true});

document.addEventListener('gesturechange',e=>{
    e.preventDefault();
    const nextScale=e.scale||gestureLastScale||1;
    const factor=Math.max(0.25,Math.min(4,nextScale/Math.max(0.01,gestureLastScale)));
    setT(
        gestureAnchorX-(gestureAnchorX-tx)*factor,
        gestureAnchorY-(gestureAnchorY-ty)*factor,
        sc*factor
    );
    gestureLastScale=nextScale;
    pinchSignalUntil=Date.now()+260;
},{passive:false,capture:true});

document.addEventListener('gestureend',()=>{
    viewport.classList.remove('is-cmd-zoom');
},{capture:true});

function handleViewportWheel(e,pixelDeltaX,pixelDeltaY){
    const target=e.target;
    if(target&&target.closest&&target.closest(
        '#media-browser-modal .mb-main, #media-browser-modal .mb-sidebar, #media-browser-modal .mb-grid, .model-dropdown, .size-dropdown, .bar-extra-menu, #board-panel, .settings-card, .move-board-list'
    )){
        // Let scrollable UI panels use native wheel behavior.
        return;
    }

    e.preventDefault();
    const r=viewport.getBoundingClientRect();
    const vx=(typeof e.clientX==='number'?e.clientX:r.left+r.width/2)-r.left;
    const vy=(typeof e.clientY==='number'?e.clientY:r.top+r.height/2)-r.top;
    const hasExplicitZoomSignal=(
        e.metaKey||
        e.ctrlKey||
        e.altKey||
        e.deltaZ!==0||
        Date.now()<pinchSignalUntil
    );
    if(hasExplicitZoomSignal){
        // Explicit zoom signal from host runtime.
        const f=Math.exp(-pixelDeltaY*0.006);
        setT(vx-(vx-tx)*f,vy-(vy-ty)*f,sc*f);
        viewport.classList.add('is-cmd-zoom');
    } else {
        // Default wheel behavior is always pan (two-finger scroll).
        setT(tx-pixelDeltaX,ty-pixelDeltaY,sc);
        viewport.classList.remove('is-cmd-zoom');
    }
}

window.addEventListener('wheel',e=>{
    const pixelDeltaX=e.deltaMode===1?e.deltaX*16:e.deltaX;
    const pixelDeltaY=e.deltaMode===1?e.deltaY*16:e.deltaY;
    handleViewportWheel(e,pixelDeltaX,pixelDeltaY);
},{passive:false});

// Drag & drop
viewport.addEventListener('dragover',e=>{e.preventDefault();viewport.classList.add('drag-over');});
viewport.addEventListener('dragleave',()=>viewport.classList.remove('drag-over'));
viewport.addEventListener('drop',e=>{e.preventDefault();viewport.classList.remove('drag-over');if(!e.dataTransfer.files.length)return;resetGrid();handleFiles(e.dataTransfer.files);});

// ── File & Note ────────────────────────────────────────────────────────────
document.getElementById('bar-upload-btn').addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',e=>{resetGrid();handleFiles(e.target.files);fileInput.value='';});
async function maybeConvertVideo(file){
    const fp=file.path||'';
    if(!fp||!nodeChildProcess||!nodePath) return file;
    const ext=(nodePath.extname(fp)||'').toLowerCase();
    if(ext==='.mp4'||ext==='.webm') return file;
    try{
        nodeChildProcess.execSync('ffmpeg -version',{stdio:'ignore'});
    }catch{return file;}
    try{
        const out=nodePath.join(nodePath.dirname(fp),`${nodePath.basename(fp,ext)}_asq.mp4`);
        nodeChildProcess.execSync(`ffmpeg -y -i "${fp.replace(/"/g,'\\"')}" -c:v libx264 -preset veryfast -crf 22 -c:a aac "${out.replace(/"/g,'\\"')}"`,{stdio:'ignore'});
        return {path:out,name:file.name.replace(/\.[^/.]+$/,'')+'.mp4',type:'video/mp4'};
    }catch{return file;}
}

async function handleFiles(files){
    const list=[...files];
    for(const f of list){
        if(f.type.startsWith('image/')||/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name||'')){
            spawnMedia(f,'image');
        }else if(f.type.startsWith('video/')||/\.(mp4|mov|m4v|avi|mkv|webm)$/i.test(f.name||'')){
            const vf=await maybeConvertVideo(f);
            spawnMedia(vf,'video');
        }else if(f.type.startsWith('audio/')||/\.(mp3|wav|m4a|aac|ogg)$/i.test(f.name||'')){
            spawnMedia(f,'audio');
        }
    }
}
document.getElementById('bar-note-btn').addEventListener('click',()=>spawnNote(false));

// ── Node Spawning ─────────────────────────────────────────────────────────
function spawnMedia(file,type){
    const fp=file.path||'',src=fp?'file://'+fp.replace(/\\/g,'/'):URL.createObjectURL(file);
    const W=type==='audio'?520:360,H=type==='audio'?120:280;const pos=getGridPos(W,H);
    const node=makeNode(pos.x,pos.y);if(fp)node.dataset.filePath=fp;
    const ext=((file.name||'').split('.').pop()||'').toLowerCase();
    node.dataset.mediaKind=ext;
    const inner=document.createElement('div');inner.className='node-inner';
    if(type==='image'){
        const img=document.createElement('img');img.src=src;img.style.maxWidth='360px';img.style.maxHeight='280px';
        if(ext==='png'||ext==='svg') inner.classList.add('alpha-preview');
        inner.appendChild(img);
    }else if(type==='video'){
        inner.appendChild(createMediaPlayer('video',src,360,220));
    }else{
        inner.appendChild(createMediaPlayer('audio',src,492,44));
    }
    finishNode(node,inner,false);
}

function fmtTime(sec){
    const s=Math.max(0,Math.floor(sec||0));
    const m=Math.floor(s/60);
    const r=s%60;
    return `${m}:${String(r).padStart(2,'0')}`;
}

function createMediaPlayer(kind,src,w,h){
    const wrap=document.createElement('div');
    wrap.className='media-player';
    wrap.style.width=w+'px';
    if(kind==='video') wrap.style.maxWidth=w+'px';
    if(kind==='audio') wrap.style.height='58px';

    const media=document.createElement(kind==='video'?'video':'audio');
    media.className='media-el';
    media.src=src;
    if(kind==='video'){
        media.style.width='100%';
        media.style.height='auto';
    }else{
        media.style.display='none';
    }
    media.preload='metadata';
    wrap.appendChild(media);

    const controls=document.createElement('div');
    controls.className='media-controls';
    const play=document.createElement('button');
    play.className='media-play';
    play.innerHTML='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    const seek=document.createElement('input');
    seek.className='media-seek';
    seek.type='range';
    seek.min='0';
    seek.max='1000';
    seek.value='0';
    const time=document.createElement('div');
    time.className='media-time';
    time.textContent='0:00 / 0:00';
    controls.appendChild(play);
    controls.appendChild(seek);
    controls.appendChild(time);
    wrap.appendChild(controls);

    function update(){
        const d=media.duration||0;
        const c=media.currentTime||0;
        seek.value=d?String(Math.floor((c/d)*1000)):'0';
        time.textContent=`${fmtTime(c)} / ${fmtTime(d)}`;
        play.innerHTML=media.paused?'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>';
    }
    play.addEventListener('click',e=>{e.stopPropagation();if(media.paused)media.play();else media.pause();update();});
    seek.addEventListener('input',e=>{e.stopPropagation();const d=media.duration||0;media.currentTime=d*(parseFloat(seek.value)/1000);update();});
    ['timeupdate','loadedmetadata','play','pause','ended'].forEach(evt=>media.addEventListener(evt,update));
    update();
    return wrap;
}

function getSelectedAlignNodes(){
    return [...selectedSet];
}

function getNodeBox(node){
    const inner=node.querySelector('.node-inner');
    const w=(inner&&inner.offsetWidth)||node.offsetWidth||0;
    const h=(inner&&inner.offsetHeight)||node.offsetHeight||0;
    const x=parseFloat(node.style.left)||0;
    const y=parseFloat(node.style.top)||0;
    return {node,x,y,w,h};
}

function applyMultiAlign(mode){
    const nodes=getSelectedAlignNodes();
    if(nodes.length<2) return;
    const boxes=nodes.map(getNodeBox).filter(b=>b.w>0&&b.h>0);
    if(boxes.length<2) return;

    const left=Math.min(...boxes.map(b=>b.x));
    const right=Math.max(...boxes.map(b=>b.x+b.w));
    const top=Math.min(...boxes.map(b=>b.y));
    const bottom=Math.max(...boxes.map(b=>b.y+b.h));
    const cx=(left+right)/2;
    const cy=(top+bottom)/2;

    if(mode==='left') boxes.forEach(b=>b.node.style.left=left+'px');
    else if(mode==='h-center') boxes.forEach(b=>b.node.style.left=(cx-b.w/2)+'px');
    else if(mode==='right') boxes.forEach(b=>b.node.style.left=(right-b.w)+'px');
    else if(mode==='top') boxes.forEach(b=>b.node.style.top=top+'px');
    else if(mode==='v-center') boxes.forEach(b=>b.node.style.top=(cy-b.h/2)+'px');
    else if(mode==='bottom') boxes.forEach(b=>b.node.style.top=(bottom-b.h)+'px');
    else if(mode==='distribute-h'){
        if(boxes.length<3) return;
        const sorted=[...boxes].sort((a,b)=>a.x-b.x);
        const sumW=sorted.reduce((s,b)=>s+b.w,0);
        const gap=(right-left-sumW)/(sorted.length-1);
        let cur=left;
        sorted.forEach(b=>{b.node.style.left=cur+'px';cur+=b.w+gap;});
    }else if(mode==='distribute-v'){
        if(boxes.length<3) return;
        const sorted=[...boxes].sort((a,b)=>a.y-b.y);
        const sumH=sorted.reduce((s,b)=>s+b.h,0);
        const gap=(bottom-top-sumH)/(sorted.length-1);
        let cur=top;
        sorted.forEach(b=>{b.node.style.top=cur+'px';cur+=b.h+gap;});
    }

    updateCtxPos();
    schedulePersist(80);
    scheduleHistoryCapture(80);
}

function spawnNote(isChat=false){
    const vc=viewCenter();
    const node=makeNode(vc.x-(isChat?280:210),vc.y-110);
    node.classList.add(isChat?'chat-card':'note-card');
    const inner=document.createElement('div');inner.className='node-inner';
    inner.style.background=isChat?'#f0f0f9':'#fff9c4';
    inner.style.width='420px';
    inner.style.height='220px';
    const c=document.createElement('div');c.className='note-content';
    c.textContent=isChat?'Thinking...':'Type your note...';
    c.style.fontSize=activeFontSize+'px';
    c.style.fontWeight=activeBold?'bold':'normal';
    c.style.textAlign=activeAlign;
    c.style.fontFamily=ntFontSel.value;
    inner.appendChild(c);finishNode(node,inner,false);
    return{node,content:c};
}

function clamp(v,min,max){
    return Math.max(min,Math.min(max,v));
}

function makeNode(cx,cy){
    const n=document.createElement('div');n.classList.add('canvas-node');n.style.left=cx+'px';n.style.top=cy+'px';return n;
}

function finishNode(node,inner,autoSelect=false){
    addHandles(node,inner);node.appendChild(inner);canvas.appendChild(node);allNodes.push(node);
    renderFavoritesStrip();
    if(autoSelect)selOnly(node);setT(tx,ty,sc);
}

// ── Handles ───────────────────────────────────────────────────────────────
function addHandles(node,inner){
    // Scale corner handles
    ['tl','tr','bl','br'].forEach(pos=>{
        const h=document.createElement('div');h.className=`scale-handle ${pos}`;
        h.style.cursor=pos==='tl'||pos==='br'?'nwse-resize':'nesw-resize';
        h.addEventListener('mousedown',e=>{
            e.stopPropagation();if(!selectedSet.has(node))selOnly(node);
            const t=inner.querySelector('.media-player,img,video,audio,.ai-placeholder')||inner;if(!t)return;
            const ow=t.offsetWidth||parseFloat(getComputedStyle(t).width)||40;
            const oh=t.offsetHeight||parseFloat(getComputedStyle(t).height)||40;
            const isCard=node.classList.contains('note-card')||node.classList.contains('chat-card');
            drag={
                type:'scale',
                el:t,
                node,
                handle:pos,
                startX:e.clientX,
                startY:e.clientY,
                ow,
                oh,
                minW:isCard?260:40,
                minH:isCard?150:40,
                maxW:isCard?1600:2600,
                maxH:isCard?1200:2200
            };
            updateCtxPos();
            updateNoteToolbarPos();
        });inner.appendChild(h);

    });

    // Dedicated rotate handle (single control instead of corner hover-zones)
    const rh=document.createElement('div');
    rh.className='rotate-handle';
    rh.title='Rotate';
    rh.addEventListener('mousedown',e=>{
        e.stopPropagation();
        if(!selectedSet.has(node))selOnly(node);
        const nr=node.getBoundingClientRect();
        const cx=nr.left+nr.width/2,cy=nr.top+nr.height/2;
        const startMouseAngle=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;
        const m=(node.style.transform||'').match(/rotate\(([-\d.]+)deg\)/);
        const startNodeAngle=m?parseFloat(m[1]):0;
        drag={type:'rotate',node,startMouseAngle,startNodeAngle};
        updateCtxPos();
        updateNoteToolbarPos();
    });
    inner.appendChild(rh);

    if(!node.__asqNodeBound){
        // Node drag / click
        node.addEventListener('mousedown',e=>{
            if(e.altKey||e.metaKey||e.ctrlKey) return;
            if(e.target.classList.contains('scale-handle'))return;
            if(e.target.classList.contains('rotate-handle'))return;
            if(e.target.tagName==='VIDEO'||e.target.tagName==='AUDIO')return;
            if(e.target.closest&&e.target.closest('.media-controls')) return;
            if(e.shiftKey){
                e.stopPropagation();
                if(selectedSet.has(node)) removeSel(node);
                else addSel(node);
                return;
            }
            if(e.target.classList.contains('note-content')&&!e.target.classList.contains('editing')){
                e.preventDefault();
                selOnly(node);
                updateNoteToolbarPos();
                return;
            }
            if(e.target.isContentEditable)return;
            e.stopPropagation();
            if(!selectedSet.has(node)) selOnly(node);
            const origins=new Map();selectedSet.forEach(n=>origins.set(n,{x:parseFloat(n.style.left)||0,y:parseFloat(n.style.top)||0}));
            drag={type:'drag',startX:e.clientX,startY:e.clientY,origins};
            updateCtxPos();
            updateNoteToolbarPos();
        });
        node.__asqNodeBound=true;
    }

    // Double-click on note to activate editing
    if(node.classList.contains('note-card')||node.classList.contains('chat-card')){
        const c=inner.querySelector('.note-content');
        node.addEventListener('dblclick',e=>{
            if(!selectedSet.has(node))selOnly(node);
            c.contentEditable='true';c.classList.add('editing');c.focus();
            if(c.textContent==='Type your note...'||c.textContent==='Thinking...'){c.textContent='';const r=document.createRange();r.selectNodeContents(c);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
        });
        c.addEventListener('blur',()=>{c.contentEditable='false';c.classList.remove('editing');});
    }
}

function openBoardPanel(){
    renderBoardList();
    boardPanel.classList.remove('hidden');
}

function closeBoardPanel(){
    boardPanel.classList.add('hidden');
}

function closeBoardQuickMenu(){
    if(boardQuickMenu) boardQuickMenu.classList.add('hidden');
}

function switchBoard(boardId){
    if(boardId===currentBoardId) return;
    saveProjectState();
    currentBoardId=boardId;
    clearCanvasNodes();
    loadBoardState(currentProjectKey,currentBoardId);
    saveBoards(currentProjectKey);
    renderBoardList();
    undoStack=[];
    redoStack=[];
    captureHistorySnapshot();
}

function newBoard(){
    const id=`board-${Date.now()}`;
    const nextIndex=boards.length+1;
    boards.push({id,name:`Board ${nextIndex}`});
    saveBoards(currentProjectKey);
    renderBoardList();
    switchBoard(id);
}

function renameBoard(boardId){
    const b=boards.find(x=>x.id===boardId); if(!b) return;
    const next=prompt('Rename board',b.name||'Board');
    if(!next) return;
    b.name=next.trim()||b.name;
    saveBoards(currentProjectKey);
    renderBoardList();
}

function duplicateBoard(boardId){
    const src=boards.find(x=>x.id===boardId); if(!src) return;
    const raw=localStorage.getItem(getStorageKey(currentProjectKey,boardId));
    const id=`board-${Date.now()}`;
    boards.push({id,name:`${src.name} Copy`});
    if(raw){
        try{
            const data=JSON.parse(raw);
            data.boardId=id;
            data.savedAt=Date.now();
            localStorage.setItem(getStorageKey(currentProjectKey,id),JSON.stringify(data));
        }catch{}
    }
    saveBoards(currentProjectKey);
    renderBoardList();
}

function deleteBoard(boardId){
    if(boards.length<=1) return;
    const b=boards.find(x=>x.id===boardId); if(!b) return;
    if(!confirm(`Delete board "${b.name}"?`)) return;
    boards=boards.filter(x=>x.id!==boardId);
    localStorage.removeItem(getStorageKey(currentProjectKey,boardId));
    if(currentBoardId===boardId){
        currentBoardId=boards[0].id;
        clearCanvasNodes();
        loadBoardState(currentProjectKey,currentBoardId);
    }
    saveBoards(currentProjectKey);
    renderBoardList();
    captureHistorySnapshot();
}

function openMoveBoardModal(){
    if(!selectedSet.size) return;
    moveBoardList.innerHTML='';
    boards.filter(b=>b.id!==currentBoardId).forEach(b=>{
        const row=document.createElement('button');
        row.className='move-board-item';
        row.textContent=b.name;
        row.addEventListener('click',()=>{
            moveSelectionToBoard(b.id);
            closeMoveBoardModal();
        });
        moveBoardList.appendChild(row);
    });
    moveBoardModal.classList.remove('hidden');
}

function closeMoveBoardModal(){
    moveBoardModal.classList.add('hidden');
}

function moveSelectionToBoard(targetBoardId){
    if(!selectedSet.size||targetBoardId===currentBoardId) return;
    const targetRaw=localStorage.getItem(getStorageKey(currentProjectKey,targetBoardId));
    const target=targetRaw?JSON.parse(targetRaw):{version:2,projectKey:currentProjectKey,boardId:targetBoardId,nodes:[],view:{tx:0,ty:0,sc:1},ui:{appMode:'ai',currentModel:'flux',genW:1024,genH:1024,isDark}};
    const moved=[...selectedSet].map(serializeNode).filter(Boolean);
    target.nodes=(target.nodes||[]).concat(moved);
    target.savedAt=Date.now();
    localStorage.setItem(getStorageKey(currentProjectKey,targetBoardId),JSON.stringify(target));
    deleteSelected();
    saveProjectState();
    renderBoardList();
}

function undo(){
    if(undoStack.length<=1) return;
    const current=undoStack.pop();
    redoStack.push(current);
    const prev=undoStack[undoStack.length-1];
    if(!prev) return;
    historyMute=true;
    suppressPersist=true;
    clearCanvasNodes();
    const data=JSON.parse(prev);
    (data.nodes||[]).forEach(restoreNode);
    const v=data.view||{};
    if(typeof v.tx==='number'&&typeof v.ty==='number'&&typeof v.sc==='number') setT(v.tx,v.ty,v.sc);
    historyMute=false;
    suppressPersist=false;
    updateHistoryButtons();
    renderFavoritesStrip();
}

function redo(){
    if(!redoStack.length) return;
    const next=redoStack.pop();
    undoStack.push(next);
    historyMute=true;
    suppressPersist=true;
    clearCanvasNodes();
    const data=JSON.parse(next);
    (data.nodes||[]).forEach(restoreNode);
    const v=data.view||{};
    if(typeof v.tx==='number'&&typeof v.ty==='number'&&typeof v.sc==='number') setT(v.tx,v.ty,v.sc);
    historyMute=false;
    suppressPersist=false;
    updateHistoryButtons();
    renderFavoritesStrip();
}

// ── Context + Extra ────────────────────────────────────────────────────────
document.getElementById('ctx-delete').addEventListener('click',deleteSelected);
document.getElementById('ctx-duplicate').addEventListener('click',()=>{
    const toDup=[...selectedSet];clearSel();
    toDup.forEach(n=>{const cl=n.cloneNode(true);cl.style.left=(parseFloat(n.style.left)+20)+'px';cl.style.top=(parseFloat(n.style.top)+20)+'px';const ci=cl.querySelector('.node-inner');if(ci)addHandles(cl,ci);canvas.appendChild(cl);allNodes.push(cl);addSel(cl);});setT(tx,ty,sc);
});
const ctxPreviewBtn = document.getElementById('ctx-preview');
if(ctxPreviewBtn) {
    ctxPreviewBtn.addEventListener('click',async()=>{
        const node=getPrimarySelectedMediaNode();
        if(!node||typeof openPreviewOverlay!=='function') return;
        let ref=node.dataset.filePath||'';
        if(!ref) ref=await ensureNodeHasLocalFile(node,'preview');
        if(!ref) ref=getNodeMediaSrc(node);
        if(ref) openPreviewOverlay(ref);
    });
}
const ctxSendAeBtn=document.getElementById('ctx-send-ae');
if(ctxSendAeBtn) ctxSendAeBtn.addEventListener('click',async()=>{
    if(!window.__adobe_cep__) return;
    const cs=new CSInterface();
    for(const n of [...selectedSet]){
        if(!getNodeMediaElement(n)) continue;
        const fp=await ensureNodeHasLocalFile(n,'ae_import');
        if(fp) cs.evalScript(`importFileToAE("${fp.replace(/\\/g,'\\\\')}")`,r=>console.log('AE',r));
    }
});
const ctxSendCompBtn=document.getElementById('ctx-send-comp');
if(ctxSendCompBtn) ctxSendCompBtn.addEventListener('click',async()=>{
    if(!window.__adobe_cep__) return;
    const cs=new CSInterface();
    for(const n of [...selectedSet]){
        if(!getNodeMediaElement(n)) continue;
        const fp=await ensureNodeHasLocalFile(n,'ae_comp');
        if(fp) cs.evalScript(`importFileToAESelectedComp("${fp.replace(/\\/g,'\\\\')}")`,r=>console.log('AE comp',r));
    }
});
const ctxShowFinderBtn=document.getElementById('ctx-show-finder');
if(ctxShowFinderBtn) ctxShowFinderBtn.addEventListener('click',async()=>{
    const node=getPrimarySelectedMediaNode();
    if(!node||!nodeChildProcess) return;
    const fp=(node.dataset.filePath||'')||await ensureNodeHasLocalFile(node,'finder');
    if(!fp) return;
    nodeChildProcess.exec(`open -R "${fp.replace(/"/g,'\\"')}"`);
});
const ctxRegenBtn=document.getElementById('ctx-regenerate');
if(ctxRegenBtn) ctxRegenBtn.addEventListener('click',()=>{regenerateSelectedImage().catch(err=>console.warn('regen failed',err));});
const ctxMoreLikeBtn=document.getElementById('ctx-more-like');
if(ctxMoreLikeBtn) ctxMoreLikeBtn.addEventListener('click',()=>{moreLikeSelectedImage().catch(err=>console.warn('more-like failed',err));});
const ctxBatchBtn=document.getElementById('ctx-batch-size');
if(ctxBatchBtn){
    ctxBatchBtn.textContent=`${imageBatchSize}x`;
    ctxBatchBtn.title=`Batch size: ${imageBatchSize}`;
    ctxBatchBtn.addEventListener('click',e=>{e.stopPropagation();cycleImageBatchSize();});
}
document.getElementById('ctx-move-board').addEventListener('click',openMoveBoardModal);
document.getElementById('nt-move-board').addEventListener('click',openMoveBoardModal);
document.getElementById('ctx-favorite').addEventListener('click',toggleFavoriteOnSelection);
document.getElementById('nt-favorite').addEventListener('click',toggleFavoriteOnSelection);

barExtraBtn.addEventListener('click',e=>{e.stopPropagation();barExtraMenu.classList.toggle('hidden');});
function closeAllDD(){barExtraMenu.classList.add('hidden');modelDD.classList.add('hidden');sizeDD.classList.add('hidden');colorPopup.classList.add('hidden');closeBoardPanel();closeBoardQuickMenu();}
window.addEventListener('click',closeAllDD);

if(boardMenuTrigger){
    boardMenuTrigger.addEventListener('click',e=>{
        e.stopPropagation();
        if(boardQuickMenu) boardQuickMenu.classList.toggle('hidden');
        closeBoardPanel();
    });
}
if(boardQuickMenu){
    boardQuickMenu.addEventListener('click',e=>e.stopPropagation());
}
if(boardToggleBtn){
    boardToggleBtn.addEventListener('click',e=>{
        e.stopPropagation();
        boardPanel.classList.toggle('hidden');
        if(!boardPanel.classList.contains('hidden')) renderBoardList();
    });
}
if(boardPanel){
    boardPanel.addEventListener('click',e=>e.stopPropagation());
}
boardNewBtn.addEventListener('click',e=>{e.stopPropagation();newBoard();});
boardList.addEventListener('click',e=>{
    const action=e.target.closest('.board-action');
    const row=e.target.closest('.board-item');
    if(!row) return;
    const id=row.dataset.boardId;
    if(action){
        e.stopPropagation();
        const a=action.dataset.action;
        if(a==='rename') renameBoard(id);
        else if(a==='duplicate') duplicateBoard(id);
        else if(a==='delete') deleteBoard(id);
        return;
    }
    switchBoard(id);
});

if(moveBoardCancel) moveBoardCancel.addEventListener('click',e=>{e.stopPropagation();closeMoveBoardModal();});
moveBoardModal.addEventListener('click',e=>{if(e.target===moveBoardModal) closeMoveBoardModal();});

if(undoBtn) undoBtn.addEventListener('click',undo);
if(redoBtn) redoBtn.addEventListener('click',redo);
if(favoritesToggleBtn) favoritesToggleBtn.addEventListener('click',e=>{
    e.stopPropagation();
    favoritesVisible=!favoritesVisible;
    favoritesPanel.classList.toggle('hidden',!favoritesVisible);
    renderFavoritesStrip();
    closeAllDD();
});

function updateGeminiToggleUI(){
    if(!geminiToggleBtn) return;
    geminiToggleBtn.textContent=geminiEnabled?'Unhook':'Hook';
}

function openSettings(){
    geminiKeyInput.value=geminiApiKey;
    updateGeminiToggleUI();
    if(geminiStatus){
        if(!geminiEnabled) geminiStatus.textContent='Google Gemini is unhooked.';
        else geminiStatus.textContent=geminiApiKey?'Refreshing Gemini models...':'No Gemini key saved.';
    }
    settingsModal.classList.remove('hidden');
    if(geminiEnabled&&geminiApiKey){
        refreshGeminiCatalog(true).then(()=>{
            if(geminiStatus&&settingsModal&&!settingsModal.classList.contains('hidden')){
                if(geminiLastError) geminiStatus.textContent=`Gemini discovery failed: ${geminiLastError.slice(0,220)}`;
                else geminiStatus.textContent=`Google Gemini models loaded (text ${geminiCatalog.text.length}, image ${geminiCatalog.image.length}, video ${geminiCatalog.video.length}, audio ${geminiCatalog.audio.length}).`;
            }
        });
    }
}
function closeSettings(){
    settingsModal.classList.add('hidden');
}
if(settingsBtn) settingsBtn.addEventListener('click',e=>{e.stopPropagation();closeAllDD();openSettings();});
if(settingsCancel) settingsCancel.addEventListener('click',e=>{e.stopPropagation();closeSettings();});
if(settingsSave) settingsSave.addEventListener('click',e=>{
    e.stopPropagation();
    geminiApiKey=(geminiKeyInput.value||'').trim();
    localStorage.setItem('asq.gemini.api.key',geminiApiKey);
    if(geminiStatus) geminiStatus.textContent='Refreshing Gemini models...';
    closeSettings();
    refreshGeminiCatalog(true).finally(()=>{
        if(appMode==='ai'||appMode==='video') loadImageModels();
        if(appMode==='chat'||appMode==='audio') loadTextModels();
    });
});
if(geminiToggleBtn) geminiToggleBtn.addEventListener('click',e=>{
    e.stopPropagation();
    geminiEnabled=!geminiEnabled;
    localStorage.setItem('asq.gemini.enabled',geminiEnabled?'1':'0');
    if(!geminiEnabled){
        geminiCatalog={text:[],image:[],video:[],audio:[]};
        geminiCatalogLoadedAt=0;
        geminiLastError='';
    }
    updateGeminiToggleUI();
    if(geminiStatus){
        geminiStatus.textContent=geminiEnabled?'Gemini hooked. Refreshing...':'Google Gemini is unhooked.';
    }
    refreshGeminiCatalog(true).finally(()=>{
        if(appMode==='ai'||appMode==='video') loadImageModels();
        if(appMode==='chat'||appMode==='audio') loadTextModels();
    });
});
settingsModal.addEventListener('click',e=>{if(e.target===settingsModal) closeSettings();});

// ── Mode Switching (floating pill switcher) ────────────────────────────────
// Slider pill animation
function updateSlider(){
    const active=document.querySelector('.mode-sw-btn.active');
    const slider=document.getElementById('mode-slider');
    const container=document.getElementById('mode-switcher');
    if(!active||!slider||!container) return;
    slider.style.left=active.offsetLeft+'px';
    slider.style.width=active.offsetWidth+'px';
}

['ai','video','audio','search','chat'].forEach(m=>{
    const btn=document.getElementById(`sw-${m}`); if(!btn) return;
    btn.addEventListener('click',e=>{e.stopPropagation();setMode(m);});
});

function setMode(m){
    appMode=m;
    ['ai','video','audio','search','chat'].forEach(t=>{
        const btn=document.getElementById(`sw-${t}`); if(btn) btn.classList.toggle('active',t===m);
    });
    // Animate slider
    requestAnimationFrame(updateSlider);
    sizeWrapper.style.display=(m==='ai'||m==='video')?'':'none';
    genBtn.textContent=m==='ai'?'Create image':m==='video'?'Create video':m==='audio'?'Create audio':m==='search'?'Search images':'Ask AI';
    aiInput.placeholder=m==='ai'?'Describe what to generate...':m==='video'?'Describe the video to generate...':m==='audio'?'Describe the audio to generate...':m==='search'?'Search DuckDuckGo for images...':'Ask the AI anything...';
    if(m==='ai'||m==='video') loadImageModels();
    else if(m==='chat'||m==='audio') loadTextModels();
    modelWrapper.style.display=m==='search'?'none':'';
    schedulePersist(250);
}

function cycleMode(step){
    const modes=['ai','video','audio','search','chat'];
    const idx=modes.indexOf(appMode);
    const next=(idx+step+modes.length)%modes.length;
    setMode(modes[next]);
}
// Init slider position after fonts load
window.addEventListener('load',()=>requestAnimationFrame(updateSlider));
window.addEventListener('resize',()=>requestAnimationFrame(updateSlider));
setTimeout(updateSlider,200);

// ── Models ─────────────────────────────────────────────────────────────────
function jsonReq(url,extra={}){
    return new Promise((ok,fail)=>{
        if(nodeHttps){
            let data='';
            nodeHttps.get(url,{headers:{'User-Agent':'Mozilla/5.0',...(extra.headers||{})}},res=>{
                res.on('data',c=>data+=c);
                res.on('end',()=>{
                    try{ok(JSON.parse(data));}catch(e){fail(e);}
                });
            }).on('error',fail);
            return;
        }
        fetch(url,extra).then(r=>r.json()).then(ok).catch(fail);
    });
}

function nodeHttpsJson(url,headers={}){
    return new Promise((resolve,reject)=>{
        if(!nodeHttps){reject(new Error('node https unavailable'));return;}
        let data='';
        nodeHttps.get(url,{headers:{'User-Agent':'Mozilla/5.0',...headers}},res=>{
            res.on('data',c=>data+=c);
            res.on('end',()=>{
                let parsed=null;
                try{parsed=JSON.parse(data);}catch{}
                resolve({ok:res.statusCode>=200&&res.statusCode<300,status:res.statusCode||0,data:parsed,raw:data});
            });
        }).on('error',reject);
    });
}

async function fetchJsonStatus(url,headers={}){
    if(nodeHttps){
        try{return await nodeHttpsJson(url,headers);}catch{}
    }
    const res=await fetch(url,{headers});
    const raw=await res.text();
    let parsed=null;
    try{parsed=JSON.parse(raw);}catch{}
    return {ok:res.ok,status:res.status,data:parsed,raw};
}

async function refreshGeminiCatalog(force=false){
    if(!geminiEnabled){
        geminiCatalog={text:[],image:[],video:[],audio:[]};
        if(geminiStatus) geminiStatus.textContent='Google Gemini is unhooked.';
        return;
    }
    if(!geminiApiKey){geminiCatalog={text:[],image:[],video:[],audio:[]};if(geminiStatus) geminiStatus.textContent='No Gemini key set.';return;}
    if(!force&&Date.now()-geminiCatalogLoadedAt<5*60*1000) return;
    try{
        geminiLastError='';
        const qUrl=`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}&pageSize=1000`;
        const hUrl='https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000';
        const attempts=[];
        attempts.push(await fetchJsonStatus(qUrl));
        if(!attempts[0].ok||!attempts[0].data||!Array.isArray(attempts[0].data.models)) attempts.push(await fetchJsonStatus(hUrl,{'x-goog-api-key':geminiApiKey}));

        const success=attempts.find(a=>a.ok&&a.data&&Array.isArray(a.data.models));
        if(!success){
            const errMsg=attempts.map(a=>{
                const em=a?.data?.error?.message||a?.raw||'';
                return `HTTP ${a?.status||0}${em?`: ${String(em).slice(0,220)}`:''}`;
            }).join(' | ');
            throw new Error(errMsg||'No successful Gemini model response');
        }
        const data=success.data;
        const models=(data.models||[]).map(m=>({
            name:m.name,
            methods:Array.isArray(m.supportedGenerationMethods)?m.supportedGenerationMethods:[]
        })).filter(m=>m.name);
        const text=[];
        const image=[];
        const video=[];
        const audio=[];
        models.forEach(({name,methods})=>{
            const m=methods.map(x=>String(x||'').toLowerCase());
            const hasImage=m.some(x=>x.includes('image'));
            const hasVideo=m.some(x=>x.includes('video'));
            const hasAudio=m.some(x=>x.includes('audio')||x.includes('speech')||x.includes('tts'));
            const hasText=m.some(x=>x.includes('content')||x.includes('text'));
            if(hasImage) image.push(name);
            if(hasVideo) video.push(name);
            if(hasAudio) audio.push(name);
            if(hasText||(!hasImage&&!hasVideo&&!hasAudio)) text.push(name);
        });
        geminiCatalog={
            text:[...new Set(text)],
            image:[...new Set(image)],
            video:[...new Set(video)],
            audio:[...new Set(audio)]
        };
        geminiCatalogLoadedAt=Date.now();
        if(geminiStatus){
            geminiStatus.textContent=`Google Gemini models loaded (text ${geminiCatalog.text.length}, image ${geminiCatalog.image.length}, video ${geminiCatalog.video.length}, audio ${geminiCatalog.audio.length}).`;
        }
    }catch(err){
        console.warn('Gemini model discovery failed',err);
        geminiCatalog={text:[],image:[],video:[],audio:[]};
        geminiLastError=String(err&&err.message?err.message:err||'Unknown error');
        if(geminiStatus) geminiStatus.textContent=`Gemini discovery failed: ${geminiLastError.slice(0,220)}`;
    }
}

function normalizeModelList(raw){
    const list=Array.isArray(raw)?raw:(raw?.data||[]);
    return list.map(m=>({
        name:(m?.name||m?.id||'').toString(),
        paid_only:!!m?.paid_only,
        output_modalities:Array.isArray(m?.output_modalities)?m.output_modalities:[],
        input_modalities:Array.isArray(m?.input_modalities)?m.input_modalities:[],
        supported_endpoints:Array.isArray(m?.supported_endpoints)?m.supported_endpoints:[],
        description:(m?.description||'').toString()
    })).filter(m=>m.name);
}

function renderModelGroups(groups){
    modelDD.innerHTML='';
    const available=[];
    groups.forEach(group=>{
        if(!group.models.length) return;
        group.models.forEach(name=>available.push(name));
    });
    if(!available.length){
        const fallback=appMode==='chat'?'openai':appMode==='audio'?'openai-audio':'flux';
        const btn=buildModelBtn(fallback,true);
        modelDD.appendChild(btn);
        currentModel=fallback;
        modelLabel.textContent=fallback;
        return;
    }

    const chosen=available.includes(currentModel)?currentModel:available[0];
    currentModel=chosen;
    modelLabel.textContent=chosen;

    let inserted=0;
    groups.forEach(group=>{
        if(!group.models.length) return;
        if(inserted>0){
            const div=document.createElement('div');
            div.className='model-divider';
            modelDD.appendChild(div);
        }
        if(group.label){
            const lbl=document.createElement('div');
            lbl.className='model-group-label';
            lbl.textContent=group.label;
            modelDD.appendChild(lbl);
        }
        group.models.forEach(name=>modelDD.appendChild(buildModelBtn(name,name===chosen)));
        inserted++;
    });
}

async function loadImageModels(){
    modelLabel.textContent='Loading...';modelDD.innerHTML='';
    try{
        const res=await fetch(`${API_BASE}/image/models`,{headers:{Authorization:`Bearer ${API_KEY}`}});
        const list=normalizeModelList(await res.json()).filter(m=>!m.paid_only);
        modelMetaByName={};
        list.forEach(m=>{modelMetaByName[m.name]=m;});
        const freeImage=list.filter(m=>!m.output_modalities.includes('video')).map(m=>m.name);
        const freeVideo=list.filter(m=>m.output_modalities.includes('video')).map(m=>m.name);
        const freeVisionImage=list.filter(m=>{
            const inMods=(m.input_modalities||[]).map(v=>String(v).toLowerCase());
            const outMods=(m.output_modalities||[]).map(v=>String(v).toLowerCase());
            const supportsEndpoint=(m.supported_endpoints||[]).some(ep=>String(ep).includes('/v1/images/edits'));
            const desc=(m.description||'').toLowerCase();
            const hint=desc.includes('image-to-image')||desc.includes('editing')||desc.includes('edit');
            return inMods.includes('image')&&outMods.includes('image')||supportsEndpoint||hint;
        }).map(m=>m.name);
        modelCatalog.image=freeImage;
        modelCatalog.video=freeVideo;
        modelCatalog.imageVision=freeVisionImage;
        const groups=[];
        if(appMode==='video') groups.push({label:'Free Video Models',models:freeVideo});
        else if(isMultiImageEditActive()) groups.push({label:'Image Edit Models (Vision)',models:freeVisionImage});
        else groups.push({label:'Free Image Models',models:freeImage});
        await refreshGeminiCatalog();
        const gm=appMode==='video'?geminiCatalog.video:geminiCatalog.image;
        if(gm.length&&!isMultiImageEditActive()) groups.push({label:'Google Gemini Models',models:gm});
        renderModelGroups(groups);
        updateModelScopeForSelection();
    }catch{
        const fallback=appMode==='video'?'veo':'flux';
        modelLabel.textContent=fallback;currentModel=fallback;
    }
}

async function loadTextModels(){
    modelLabel.textContent='Loading...';modelDD.innerHTML='';
    try{
        const res=await fetch(`${API_BASE}/text/models`,{headers:{Authorization:`Bearer ${API_KEY}`}});
        const list=normalizeModelList(await res.json()).filter(m=>!m.paid_only);
        const freeText=list.filter(m=>m.output_modalities.includes('text')||!m.output_modalities.length).map(m=>m.name);
        const freeAudio=list.filter(m=>m.output_modalities.includes('audio')||m.name==='openai-audio').map(m=>m.name);
        modelCatalog.text=freeText;
        modelCatalog.audio=freeAudio;
        const groups=[];
        if(appMode==='audio') groups.push({label:'Free Audio Models',models:freeAudio});
        else groups.push({label:'Free Text Models',models:freeText});
        await refreshGeminiCatalog();
        const gm=appMode==='audio'?geminiCatalog.audio:geminiCatalog.text;
        if(gm.length) groups.push({label:'Google Gemini Models',models:gm});
        renderModelGroups(groups);
    }catch{
        const fallback=appMode==='audio'?'openai-audio':'openai';
        const btn=buildModelBtn(fallback,true);modelDD.appendChild(btn);
    }
}

function buildModelBtn(name,isFirst){
    const btn=document.createElement('button');btn.className='model-opt';btn.textContent=name;
    if(isFirst){btn.classList.add('active');}
    btn.addEventListener('click',e=>{e.stopPropagation();currentModel=name;modelLabel.textContent=name;modelDD.querySelectorAll('.model-opt').forEach(b=>b.classList.remove('active'));btn.classList.add('active');modelDD.classList.add('hidden');schedulePersist(250);});
    return btn;
}

function refreshImageModelDropdownForSelection(){
    if(appMode!=='ai') return;
    if(!Array.isArray(modelCatalog.image)||!modelCatalog.image.length) return;
    const editMode=isMultiImageEditActive();
    const vision=(modelCatalog.imageVision||[]);
    const base=(modelCatalog.image||[]);
    const allowed=editMode?vision:base;
    if(!allowed.length) return;
    const groups=[];
    groups.push({label:editMode?'Image Edit Models (Vision)':'Free Image Models',models:allowed});
    if(!editMode&&Array.isArray(geminiCatalog.image)&&geminiCatalog.image.length){
        groups.push({label:'Google Gemini Models',models:geminiCatalog.image});
    }
    renderModelGroups(groups);
}

function buildAuthHeaders(extra){
    return {Authorization:`Bearer ${API_KEY}`,...(extra||{})};
}

function guessImageExtFromBlob(blob,src=''){
    const t=((blob&&blob.type)||'').toLowerCase();
    if(t.includes('png')) return 'png';
    if(t.includes('webp')) return 'webp';
    if(t.includes('gif')) return 'gif';
    if(t.includes('svg')) return 'svg';
    if(t.includes('jpeg')||t.includes('jpg')) return 'jpg';
    const m=(src||'').match(/\.([a-z0-9]+)(?:[?#]|$)/i);
    return m?m[1].toLowerCase():'jpg';
}

async function uploadBlobToCatbox(blob,fileName){
    const fd=new FormData();
    fd.append('reqtype','fileupload');
    fd.append('fileToUpload',blob,fileName||`asq_${Date.now()}.jpg`);
    const res=await fetch('https://catbox.moe/user/api.php',{method:'POST',body:fd});
    const txt=(await res.text()).trim();
    if(!res.ok||!/^https?:\/\//i.test(txt)){
        throw new Error(`Catbox upload failed (${res.status}): ${txt.slice(0,180)}`);
    }
    return txt;
}

async function getPublicUrlForNodeImage(node,idx){
    if(!node) throw new Error('Missing image node');
    if(node.dataset.publicImageUrl&&/^https?:\/\//i.test(node.dataset.publicImageUrl)) return node.dataset.publicImageUrl;

    let src=getNodeImageUrl(node);
    if(!src) throw new Error('Image has no source URL');
    if(/^https?:\/\//i.test(src)){
        const localFp=await ensureNodeHasLocalFile(node,`ref_${idx+1}`);
        if(localFp) src=toFileUrl(localFp);
        else return src;
    }

    let blob=null;
    if(src.startsWith('file://')&&nodeFs){
        const filePath=filePathFromFileUrl(src);
        const bytes=nodeFs.readFileSync(filePath);
        const arr=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
        const ext=(nodePath&&nodePath.extname(filePath)||'').replace('.','').toLowerCase();
        const mime=mimeFromExt(ext)||'image/jpeg';
        blob=new Blob([arr],{type:mime});
    }else{
        const r=await fetch(src);
        if(!r.ok) throw new Error(`Failed to read image source (${r.status})`);
        blob=await r.blob();
    }

    const ext=guessImageExtFromBlob(blob,src);
    const uploaded=await uploadBlobToCatbox(blob,`asq_ref_${idx+1}_${Date.now()}.${ext}`);
    node.dataset.publicImageUrl=uploaded;
    return uploaded;
}

function extractImageUrlFromCompletion(data){
    const msg=data&&data.choices&&data.choices[0]&&data.choices[0].message?data.choices[0].message:null;
    if(!msg) return '';
    if(Array.isArray(msg.content)){
        for(const part of msg.content){
            if(part&&part.type==='image_url'&&part.image_url&&part.image_url.url) return part.image_url.url;
        }
    }
    const blocks=Array.isArray(msg.content_blocks)?msg.content_blocks:[];
    for(const b of blocks){
        if(b&&b.type==='image_url'&&b.image_url&&b.image_url.url) return b.image_url.url;
        if(b&&b.type==='image_url'&&typeof b.url==='string') return b.url;
    }
    if(typeof msg.content==='string'){
        const md=msg.content.match(/\((https?:\/\/[^)\s]+)\)/i);
        if(md&&md[1]) return md[1];
        const raw=msg.content.match(/https?:\/\/\S+/i);
        if(raw&&raw[0]) return raw[0].replace(/[),.;]+$/,'');
    }
    const txt=(data&&typeof data.output==='string')?data.output:'';
    if(txt){
        const m=txt.match(/https?:\/\/\S+/i);
        if(m&&m[0]) return m[0].replace(/[),.;]+$/,'');
    }
    return '';
}

async function generateAIImageEdit(prompt){
    const selectedImages=getSelectedImageNodes();
    if(selectedImages.length<2) return false;
    const model=currentModel||'gptimage';

    const pos=getCenteredSpawnAboveToolbar(genW,genH);
    const node=makeNode(pos.x,pos.y);
    const ph=createLoadingPlaceholder(genW,genH,'Editing selected images');
    finishNode(node,ph,false);selOnly(node);

    try{
        const publicUrls=[];
        for(let i=0;i<selectedImages.length;i++){
            publicUrls.push(await getPublicUrlForNodeImage(selectedImages[i],i));
        }
        if(publicUrls.length<2) throw new Error('Need at least two valid image URLs for edit');

        const seed=Math.floor(Math.random()*1e6);
        const imageParam=publicUrls.join('|');
        const editPrompt=[
            'Use the provided reference images in order as image 1, image 2, etc.',
            prompt
        ].join('\n\n');
        const url=`${API_BASE}/image/${encodeURIComponent(editPrompt)}?model=${encodeURIComponent(model)}&width=${genW}&height=${genH}&seed=${seed}&enhance=true&image=${encodeURIComponent(imageParam)}`;
        const res=await fetch(url,{headers:buildAuthHeaders()});
        if(!res.ok) throw new Error(`Image edit failed (${res.status})`);
        const blob=await res.blob();
        const fp=await persistGeneratedBlob(blob,'image_edit');

        node.innerHTML='';
        const inner=document.createElement('div');
        inner.className='node-inner';
        const img=document.createElement('img');
        img.src=fp?`file://${fp}`:URL.createObjectURL(blob);
        img.style.width=genW+'px';
        img.style.height=genH+'px';
        img.classList.add('gen-reveal');
        if(fp) node.dataset.filePath=fp;
        inner.appendChild(img);
        addHandles(node,inner);
        node.appendChild(inner);
        selOnly(node);
        setT(tx,ty,sc);
        return true;
    }catch(err){
        console.error('AI image edit',err);
        node.remove();
        allNodes=allNodes.filter(n=>n!==node);
        clearSel();
        return false;
    }
}

async function generateImageBatch(prompt,refUrls=[],opts={}){
    const model=currentModel||'flux';
    const count=Math.max(1,Math.min(8,parseInt(imageBatchSize,10)||1));
    const created=[];
    for(let i=0;i<count;i++){
        const pos=getCenteredSpawnAboveToolbar(genW,genH);
        const node=makeNode(pos.x+((i%3)*36),pos.y+(Math.floor(i/3)*30));
        const ph=createLoadingPlaceholder(genW,genH,opts.label||'Generating image');
        finishNode(node,ph,false);
        created.push(node);
    }
    if(created[0]) selOnly(created[0]);

    for(let i=0;i<created.length;i++){
        const node=created[i];
        try{
            const seed=Math.floor(Math.random()*1e6);
            const imageParam=refUrls.length?`&image=${encodeURIComponent(refUrls.join('|'))}`:'';
            const url=`${API_BASE}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&width=${genW}&height=${genH}&seed=${seed}&enhance=true${imageParam}`;
            const res=await fetch(url,{headers:buildAuthHeaders()});
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob=await res.blob();
            const fp=await persistGeneratedBlob(blob,opts.prefix||'image');

            node.innerHTML='';
            const inner=document.createElement('div');
            inner.className='node-inner';
            const img=document.createElement('img');
            img.src=fp?`file://${fp}`:URL.createObjectURL(blob);
            img.style.width=genW+'px';
            img.style.height=genH+'px';
            img.classList.add('gen-reveal');
            if(fp) node.dataset.filePath=fp;
            node.dataset.genPrompt=prompt;
            node.dataset.genModel=model;
            inner.appendChild(img);
            addHandles(node,inner);
            node.appendChild(inner);
        }catch(err){
            console.error('AI image batch item failed',err);
            node.remove();
            allNodes=allNodes.filter(n=>n!==node);
        }
    }
    setT(tx,ty,sc);
    schedulePersist(140);
    scheduleHistoryCapture(140);
}

async function regenerateSelectedImage(){
    const node=getPrimarySelectedImageNode();
    if(!node) return;
    const basePrompt=(node.dataset.genPrompt||'').trim()||(aiInput.value||'').trim()||'Regenerate this image with similar composition and style.';
    const ref=await getPublicUrlForNodeImage(node,0);
    await generateImageBatch(basePrompt,[ref],{prefix:'image_regen',label:'Regenerating image'});
}

async function moreLikeSelectedImage(){
    const node=getPrimarySelectedImageNode();
    if(!node) return;
    const userPrompt=(aiInput.value||'').trim();
    const base=(node.dataset.genPrompt||'').trim();
    const moreLikePrompt=userPrompt||(
        base
            ? `${base}. Create a new variation with different composition while preserving style and color mood from image 1.`
            : 'Create a new image variation inspired by image 1. Keep style and palette but change composition.'
    );
    const ref=await getPublicUrlForNodeImage(node,0);
    await generateImageBatch(moreLikePrompt,[ref],{prefix:'image_morelike',label:'Generating similar images'});
}

function cycleImageBatchSize(){
    const options=[1,2,3,4];
    const idx=options.indexOf(imageBatchSize);
    imageBatchSize=options[(idx+1)%options.length];
    const btn=document.getElementById('ctx-batch-size');
    if(btn){
        btn.textContent=`${imageBatchSize}x`;
        btn.title=`Batch size: ${imageBatchSize}`;
    }
}

loadPromptHistory();
loadImageModels(); // default
if(geminiEnabled&&geminiApiKey){
    refreshGeminiCatalog(true).finally(()=>{
        if(appMode==='ai'||appMode==='video') loadImageModels();
        else if(appMode==='chat'||appMode==='audio') loadTextModels();
    });
}
modelBtn.addEventListener('click',e=>{e.stopPropagation();modelDD.classList.toggle('hidden');sizeDD.classList.add('hidden');});
sizeBtn.addEventListener('click',e=>{e.stopPropagation();sizeDD.classList.toggle('hidden');modelDD.classList.add('hidden');});
sizeDD.querySelectorAll('.size-opt').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();genW=parseInt(btn.dataset.w);genH=parseInt(btn.dataset.h);sizeLabel.textContent=`${genW} × ${genH}`;sizeDD.querySelectorAll('.size-opt').forEach(b=>b.classList.remove('active'));btn.classList.add('active');sizeDD.classList.add('hidden');schedulePersist(250);});});

// ── Actions ─────────────────────────────────────────────────────────────────
genBtn.addEventListener('click',()=>{
    if(appMode==='ai') generateAIImage();
    else if(appMode==='video') generateAIVideo();
    else if(appMode==='audio') generateAIAudio();
    else if(appMode==='search') searchDDG();
    else askAI();
});

function getModePromptSpec(mode){
    if(mode==='ai') return 'Generate one highly creative, visually rich image prompt. Include composition, lighting, style, camera/framing, color palette, material details, and quality cues. Keep it concise but vivid.';
    if(mode==='video') return 'Generate one highly creative cinematic video prompt. Include subject motion, camera movement, scene evolution, duration feel, lighting, atmosphere, style, pacing, and quality cues suitable for AI video generation.';
    if(mode==='audio') return 'Generate one highly creative audio prompt. Include sonic texture, instruments/sound sources, rhythm, mood progression, production style, and clarity constraints suitable for AI audio generation.';
    if(mode==='chat') return 'Generate one interesting text prompt or question that is unique, thought-provoking, and likely to produce a rich answer. Avoid generic wording.';
    if(mode==='search') return 'Generate one concise but effective image search query with strong keywords and optional style qualifiers.';
    return 'Generate one creative high-quality AI prompt.';
}

async function autoGeneratePrompt(){
    const seed=(aiInput.value||'').trim();
    const mode=appMode;
    const userReq=`Mode: ${mode}. ${getModePromptSpec(mode)}${seed?` Existing idea to build on: ${seed}`:''}`;
    const res=await fetch(`${API_BASE}/v1/chat/completions`,{
        method:'POST',
        headers:buildAuthHeaders({'Content-Type':'application/json'}),
        body:JSON.stringify({
            model:'gemini-fast',
            stream:false,
            messages:[
                {role:'system',content:'You are a world-class creative prompt engineer. Output exactly one polished prompt only. No preface, no bullets, no quotes.'},
                {role:'user',content:userReq}
            ]
        })
    });
    if(!res.ok) throw new Error(`Prompt generation failed (${res.status})`);
    const data=await res.json();
    const text=(data?.choices?.[0]?.message?.content||'').trim();
    if(!text) throw new Error('No prompt text returned');
    aiInput.value=text;
    aiInput.dispatchEvent(new Event('input'));
    aiInput.focus();
    aiInput.setSelectionRange(aiInput.value.length,aiInput.value.length);
}

if(promptMagicBtn) promptMagicBtn.addEventListener('click',e=>{
    e.stopPropagation();
    autoGeneratePrompt().catch(err=>{
        console.warn('auto prompt failed',err);
    });
});

aiInput.addEventListener('keydown',e=>{
    if(e.key==='ArrowUp'){
        e.preventDefault();
        navigatePromptHistory(-1);
        return;
    }
    if(e.key==='ArrowDown'){
        e.preventDefault();
        navigatePromptHistory(1);
        return;
    }
    if(e.key==='Enter'&&!e.shiftKey){
        e.preventDefault();
        if(appMode==='ai') generateAIImage();
        else if(appMode==='video') generateAIVideo();
        else if(appMode==='audio') generateAIAudio();
        else if(appMode==='search') searchDDG();
        else askAI();
    }
});
aiInput.addEventListener('input',()=>{
    if(promptHistoryIndex!==-1) promptHistoryIndex=-1;
    aiInput.style.height = '22px';
    aiInput.style.height = Math.min(aiInput.scrollHeight, 62) + 'px';
});

// ── AI Image ─────────────────────────────────────────────────────────────────
async function generateAIImage(){
    const prompt=aiInput.value.trim();if(!prompt)return;aiInput.value='';
    addPromptToHistory(prompt);
    if(isMultiImageEditActive()){
        const ok=await generateAIImageEdit(prompt);
        if(ok) return;
    }
    await generateImageBatch(prompt,[],{prefix:'image',label:'Generating image'});
}

async function generateAIVideo(){
    const prompt=aiInput.value.trim();if(!prompt)return;aiInput.value='';
    addPromptToHistory(prompt);
    const model=currentModel||'veo',seed=Math.floor(Math.random()*1e6);
    const aspect=genW>=genH?'16:9':'9:16';
    const W=Math.min(960,Math.max(640,genW||640));
    const H=Math.min(720,Math.max(360,genH||360));
    const pos=getCenteredSpawnAboveToolbar(W,H);
    const node=makeNode(pos.x,pos.y);
    const ph=createLoadingPlaceholder(W,H,'Rendering video');
    finishNode(node,ph,false);selOnly(node);
    try{
        const qAudio=model.toLowerCase().includes('veo')?'&audio=true':'';
        const url=`${API_BASE}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(model)}&seed=${seed}&duration=6&aspectRatio=${encodeURIComponent(aspect)}&width=${W}&height=${H}${qAudio}`;
        const res=await fetch(url,{headers:buildAuthHeaders()});
        if(!res.ok)throw new Error(res.statusText);
        const blob=await res.blob();
        let fp=await persistGeneratedBlob(blob,'video');
        node.innerHTML='';
        const inner=document.createElement('div');inner.className='node-inner';
        const vsrc=fp?`file://${fp}`:URL.createObjectURL(blob);
        if(fp)node.dataset.filePath=fp;
        const player=createMediaPlayer('video',vsrc,W,H);
        player.classList.add('gen-reveal');
        inner.appendChild(player);addHandles(node,inner);node.appendChild(inner);selOnly(node);setT(tx,ty,sc);
    }catch(err){console.error('AI video',err);node.remove();allNodes=allNodes.filter(n=>n!==node);clearSel();}
}

async function generateAIAudio(){
    const prompt=aiInput.value.trim();if(!prompt)return;aiInput.value='';
    addPromptToHistory(prompt);
    const model=currentModel||'openai-audio';
    const pos=getCenteredSpawnAboveToolbar(520,120);
    const node=makeNode(pos.x,pos.y);
    const ph=createLoadingPlaceholder(520,120,'Designing audio');
    finishNode(node,ph,false);selOnly(node);
    try{
        const res=await fetch(`${API_BASE}/v1/chat/completions`,{
            method:'POST',
            headers:buildAuthHeaders({'Content-Type':'application/json'}),
            body:JSON.stringify({
                model,
                modalities:['audio','text'],
                audio:{voice:'alloy',format:'mp3'},
                messages:[{role:'user',content:prompt}],
                stream:false
            })
        });
        if(!res.ok) throw new Error(res.statusText);
        const data=await res.json();
        const base64=data?.choices?.[0]?.message?.audio?.data;
        if(!base64) throw new Error('No audio payload');
        const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
        const blob=new Blob([bytes],{type:'audio/mpeg'});
        let fp=await persistGeneratedBlob(blob,'audio');
        node.innerHTML='';
        const inner=document.createElement('div');inner.className='node-inner';
        const asrc=fp?`file://${fp}`:URL.createObjectURL(blob);
        if(fp)node.dataset.filePath=fp;
        const player=createMediaPlayer('audio',asrc,492,44);
        player.classList.add('gen-reveal');
        inner.appendChild(player);addHandles(node,inner);node.appendChild(inner);selOnly(node);setT(tx,ty,sc);
    }catch(err){console.error('AI audio',err);node.remove();allNodes=allNodes.filter(n=>n!==node);clearSel();}
}

// ── DDG Search ─────────────────────────────────────────────────────────────
function ddgReq(url,extra={}){
    return new Promise((ok,fail)=>{
        if(!nodeHttps){fail('no https');return;}
        let data='';
        nodeHttps.get(url,{headers:{'User-Agent':'Mozilla/5.0','Accept-Language':'en-US,en;q=0.9',...(extra.headers||{})}},res=>{res.on('data',c=>data+=c);res.on('end',()=>ok({status:res.statusCode,body:data}));}).on('error',fail);
    });
}
async function searchDDG(){
    const query=aiInput.value.trim();if(!query)return;aiInput.value='';resetGrid();
    addPromptToHistory(query);
    try{
        const {body:init}=await ddgReq(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=images`);
        const vm=init.match(/vqd=['"]([^'"]+)['"]/);if(!vm)throw new Error('No VQD');
        const {body:imgB}=await ddgReq(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${encodeURIComponent(vm[1])}&f=,,,,,&p=1`,{headers:{Referer:'https://duckduckgo.com/'}});
        const results=(JSON.parse(imgB).results||[]).slice(0,8);
        results.forEach(r=>{
            if(!r.image)return;
            const W=Math.min(r.width||360,360),H=Math.min(r.height||280,280);
            const pos=getGridPos(W,H);const node=makeNode(pos.x,pos.y);
            const inner=document.createElement('div');inner.className='node-inner';
            const img=document.createElement('img');img.src=r.image;img.crossOrigin='anonymous';img.style.maxWidth='360px';img.style.maxHeight='280px';
            inner.appendChild(img);finishNode(node,inner,false);
            ensureNodeHasLocalFile(node,'ddg').catch(()=>{});
        });setT(tx,ty,sc);
    }catch(err){console.error('DDG',err);}
}

function createLoadingPlaceholder(w,h,label){
    const ph=document.createElement('div');
    ph.className='node-inner ai-placeholder';
    ph.style.width=w+'px';
    ph.style.height=h+'px';
    ph.appendChild(Object.assign(document.createElement('div'),{className:'sheen'}));
    ph.appendChild(Object.assign(document.createElement('div'),{className:'sheen sheen-2'}));
    return ph;
}

const mtLeft=document.getElementById('mt-align-left');
const mtHCenter=document.getElementById('mt-align-h-center');
const mtRight=document.getElementById('mt-align-right');
const mtTop=document.getElementById('mt-align-top');
const mtVCenter=document.getElementById('mt-align-v-center');
const mtBottom=document.getElementById('mt-align-bottom');
const mtDistH=document.getElementById('mt-distribute-h');
const mtDistV=document.getElementById('mt-distribute-v');
const mtDelete=document.getElementById('mt-delete');

if(mtLeft) mtLeft.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('left');});
if(mtHCenter) mtHCenter.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('h-center');});
if(mtRight) mtRight.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('right');});
if(mtTop) mtTop.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('top');});
if(mtVCenter) mtVCenter.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('v-center');});
if(mtBottom) mtBottom.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('bottom');});
if(mtDistH) mtDistH.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('distribute-h');});
if(mtDistV) mtDistV.addEventListener('click',e=>{e.stopPropagation();applyMultiAlign('distribute-v');});
if(mtDelete) mtDelete.addEventListener('click',e=>{e.stopPropagation();deleteSelected();});

// ── AI Chat (streaming) ────────────────────────────────────────────────────
function wait(ms){
    return new Promise(resolve=>setTimeout(resolve,ms));
}

async function flushStreamQueue(el,state){
    while(state.open||state.queue.length){
        if(state.queue.length){
            const chars=Math.min(2,state.queue.length);
            el.textContent+=state.queue.slice(0,chars);
            state.queue=state.queue.slice(chars);
        }
        await wait(20);
    }
}

function enqueueFromSSEEvent(evt,state){
    const dataLines=evt.split(/\r?\n/).filter(line=>line.startsWith('data:'));
    if(!dataLines.length) return false;
    const payload=dataLines.map(line=>line.slice(5).trim()).join('\n');
    if(payload==='[DONE]') return true;
    try{
        const delta=JSON.parse(payload)?.choices?.[0]?.delta?.content;
        if(delta) state.queue+=delta;
    }catch{}
    return false;
}

async function askAI(){
    const question=aiInput.value.trim();if(!question)return;aiInput.value='';
    addPromptToHistory(question);
    const{node,content}=spawnNote(true);content.textContent='';selOnly(node);
    if(currentModel.startsWith('models/')){
        try{
            if(!geminiApiKey) throw new Error('Missing Gemini API key');
            const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/${currentModel}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({contents:[{parts:[{text:question}]}]})
            });
            if(!res.ok) throw new Error(res.statusText);
            const data=await res.json();
            const txt=(data?.candidates||[]).flatMap(c=>c?.content?.parts||[]).map(p=>p?.text||'').join('').trim();
            content.textContent=txt||'No response text returned.';
        }catch(err){
            console.error('Gemini chat',err);
            content.textContent='Gemini request failed. Check API key/model.';
        }
        return;
    }
    const streamState={queue:'',open:true};
    const flushTask=flushStreamQueue(content,streamState);
    try{
        const res=await fetch(`${API_BASE}/v1/chat/completions`,{
            method:'POST',
            headers:buildAuthHeaders({'Content-Type':'application/json'}),
            body:JSON.stringify({model:currentModel||'openai',messages:[{role:'system',content:'You are a helpful creative assistant. Be concise.'},{role:'user',content:question}],stream:true})
        });
        if(!res.ok)throw new Error(res.statusText);

        if(res.body){
            const reader=res.body.getReader();
            const decoder=new TextDecoder();
            let sseBuffer='';
            while(true){
                const{done,value}=await reader.read();
                if(done) break;
                sseBuffer+=decoder.decode(value,{stream:true});
                const events=sseBuffer.split(/\r?\n\r?\n/);
                sseBuffer=events.pop()||'';
                for(const evt of events){
                    const shouldEnd=enqueueFromSSEEvent(evt,streamState);
                    if(shouldEnd){
                        sseBuffer='';
                        break;
                    }
                }
            }
            if(sseBuffer.trim()) enqueueFromSSEEvent(sseBuffer,streamState);
        }

        if(!content.textContent.trim()&&!streamState.queue.trim()){
            const data=await fetch(`${API_BASE}/v1/chat/completions`,{
                method:'POST',
                headers:buildAuthHeaders({'Content-Type':'application/json'}),
                body:JSON.stringify({model:currentModel||'openai',messages:[{role:'system',content:'You are a helpful creative assistant. Be concise.'},{role:'user',content:question}],stream:false})
            }).then(r=>r.json()).catch(()=>null);
            const full=data?.choices?.[0]?.message?.content;
            if(full) streamState.queue+=full;
        }
    }catch(err){
        console.error('Chat',err);
        if(!content.textContent.trim()&&!streamState.queue.trim()) streamState.queue='Could not get a response.';
    }finally{
        streamState.open=false;
        await flushTask;
    }
}

if(ENABLE_PROJECT_PERSISTENCE){
    initPersistence().catch(err=>console.warn('persistence init failed',err));
}

// ── Media Browser ──
const mbModal = document.getElementById('media-browser-modal');
const mbToggleBtn = document.getElementById('media-browser-toggle-btn');
const mbCloseBtn = document.getElementById('mb-close-btn');
const mbGrid = document.getElementById('mb-grid');
let mbFiles = [];
let mbSelected = new Set();
const mbSelCount = document.getElementById('mb-sel-count');
const mbClearSel = document.getElementById('mb-clear-sel');
const mbAddToCanvas = document.getElementById('mb-add-to-canvas');
const mbShowFinder = document.getElementById('mb-show-finder');
const mbDeleteFiles = document.getElementById('mb-delete-files');
const navAssetsLocal = document.getElementById('nav-assets-local');
const mbSearchInput = document.getElementById('mb-search');
const mbGridSize = document.getElementById('mb-grid-size');

function openMediaBrowser() {
    mbModal.classList.remove('hidden');
    closeBoardQuickMenu();
    closeBoardPanel();
    loadLocalAssets();
}
function closeMediaBrowser() {
    mbModal.classList.add('hidden');
}
if(mbToggleBtn) mbToggleBtn.addEventListener('click', openMediaBrowser);
if(mbCloseBtn) mbCloseBtn.addEventListener('click', closeMediaBrowser);
if(mbClearSel) mbClearSel.addEventListener('click', () => { mbSelected.clear(); renderMBGrid(); });
if(mbModal) mbModal.addEventListener('click', e => { if(e.target === mbModal) closeMediaBrowser(); });

function formatBytes(bytes) {
    if(bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function loadLocalAssets() {
    mbFiles = [];
    mbSelected.clear();
    const dir = getExportDir();
    if(!dir || !nodeFs || !nodePath) {
        renderMBGrid();
        return;
    }
    try {
        const files = nodeFs.readdirSync(dir);
        files.forEach(f => {
            if(f.startsWith('.')) return;
            const fp = nodePath.join(dir, f);
            const stat = nodeFs.statSync(fp);
            if(!stat.isFile()) return;
            const ext = nodePath.extname(f).slice(1).toLowerCase();
            const kind = (ext==='png'||ext==='jpg'||ext==='jpeg'||ext==='webp'||ext==='gif') ? 'image' : 
                         (ext==='mp4'||ext==='webm'||ext==='mov') ? 'video' : 
                         (ext==='mp3'||ext==='wav') ? 'audio' : 'unknown';
            mbFiles.push({ name: f, path: fp, ext: ext.toUpperCase(), size: stat.size, time: stat.mtimeMs, kind });
        });
        mbFiles.sort((a,b) => b.time - a.time);
    } catch(err) { console.warn('Failed to load local assets', err); }
    renderMBGrid();
}

function renderMBGrid() {
    if(!mbGrid) return;
    mbGrid.innerHTML = '';
    const q = (mbSearchInput && mbSearchInput.value ? mbSearchInput.value : '').toLowerCase();
    const filtered = mbFiles.filter(f => !q || f.name.toLowerCase().includes(q));
    
    filtered.forEach(f => {
        const item = document.createElement('div');
        item.className = 'mb-item' + (mbSelected.has(f.path) ? ' selected' : '');
        item.innerHTML = `
            <div class="mb-thumb-wrap">
                <div class="mb-check">
                    <svg viewBox="0 0 24 24" style="fill:#fff;width:14px;height:14px;margin:2px;"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                </div>
                ${f.kind === 'image' ? `<img class="mb-thumb" src="file://${f.path.replace(/\\/g,'/')}">` : 
                  f.kind === 'video' ? `<video class="mb-thumb" src="file://${f.path.replace(/\\/g,'/')}" muted loop preload="metadata"></video>` :
                  `<div class="mb-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-mid);font-size:24px;">Audio</div>`}
            </div>
            <div class="mb-details">
                <div class="mb-filename" title="${f.name}">${f.name}</div>
                <div class="mb-meta"><span>${f.ext}</span><span>${formatBytes(f.size)}</span></div>
            </div>
        `;
        item.addEventListener('click', (e) => {
            if(mbSelected.has(f.path)) mbSelected.delete(f.path);
            else mbSelected.add(f.path);
            renderMBGrid();
        });
        const thumbWrap = item.querySelector('.mb-thumb-wrap');
        thumbWrap.addEventListener('mouseenter', () => {
            const v = thumbWrap.querySelector('video');
            if(v) v.play().catch(()=>{});
        });
        thumbWrap.addEventListener('mouseleave', () => {
            const v = thumbWrap.querySelector('video');
            if(v) { v.pause(); v.currentTime = 0; }
        });
        thumbWrap.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            addAssetToCanvas(f);
            closeMediaBrowser();
        });
        mbGrid.appendChild(item);
    });
    
    if(mbSelCount) mbSelCount.textContent = `${mbSelected.size} item${mbSelected.size===1?'':'s'} selected`;
    
    if(mbGridSize) {
        const zoomSize = parseInt(mbGridSize.value, 10);
        const w = zoomSize === 1 ? 120 : zoomSize === 2 ? 140 : zoomSize === 3 ? 180 : zoomSize === 4 ? 220 : 280;
        mbGrid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${w}px, 1fr))`;
    }
}

if(mbSearchInput) mbSearchInput.addEventListener('input', renderMBGrid);
if(mbGridSize) mbGridSize.addEventListener('input', renderMBGrid);
if(navAssetsLocal) navAssetsLocal.addEventListener('click', loadLocalAssets);

function addAssetToCanvas(f) {
    const pos = getCenteredSpawnAboveToolbar(520, 320);
    const node = makeNode(pos.x, pos.y);
    node.dataset.filePath = f.path;
    const inner = document.createElement('div');
    inner.className = 'node-inner';
    if(f.kind === 'image') {
        const img = document.createElement('img');
        img.src = `file://${f.path.replace(/\\/g,'/')}`;
        img.style.maxWidth = '360px';
        img.style.maxHeight = '280px';
        inner.appendChild(img);
    } else if(f.kind === 'video') {
        inner.appendChild(createMediaPlayer('video', `file://${f.path.replace(/\\/g,'/')}`, 520, 300));
    } else if(f.kind === 'audio') {
        inner.appendChild(createMediaPlayer('audio', `file://${f.path.replace(/\\/g,'/')}`, 492, 44));
    } else {
        const img = document.createElement('img');
        img.src = `file://${f.path.replace(/\\/g,'/')}`;
        img.style.maxWidth = '360px';
        inner.appendChild(img);
    }
    finishNode(node, inner, false);
}

if(mbAddToCanvas) mbAddToCanvas.addEventListener('click', () => {
    const targets = mbFiles.filter(f => mbSelected.has(f.path));
    targets.forEach(f => addAssetToCanvas(f));
    mbSelected.clear();
    renderMBGrid();
    closeMediaBrowser();
});

if(mbShowFinder) mbShowFinder.addEventListener('click', () => {
    if(!mbSelected.size || !nodeChildProcess) return;
    const first = [...mbSelected][0];
    nodeChildProcess.exec(`open -R "${first.replace(/"/g,'\\"')}"`);
});

if(mbDeleteFiles) mbDeleteFiles.addEventListener('click', () => {
    if(!mbSelected.size || !nodeFs) return;
    if(!confirm(`Delete ${mbSelected.size} file(s) permanently?`)) return;
    mbSelected.forEach(p => {
        try { nodeFs.unlinkSync(p); } catch(err) { console.warn('Delete fail', err); }
});
    mbSelected.clear();
    loadLocalAssets();
});

// ── Preview Overlay ──
const previewOverlay = document.getElementById('preview-overlay');
const previewCloseBtn = document.getElementById('preview-close-btn');
const previewContent = document.getElementById('preview-content');

function openPreviewOverlay(p) {
    if(!p || !previewOverlay) return;
    const src=normalizePreviewSource(p);
    if(!src) return;
    previewOverlay.classList.remove('hidden');
    previewContent.innerHTML = '';
    const ext = mediaExtFromSource(src);
    const isVideo = ['mp4','webm','mov','m4v'].includes(ext);
    const isAudio = ['mp3','wav','m4a','aac','ogg'].includes(ext);
    if(isVideo) {
        const v = document.createElement('video');
        v.src = src;
        v.controls = true;
        v.autoplay = true;
        previewContent.appendChild(v);
    } else if(isAudio) {
        const a = document.createElement('audio');
        a.src = src;
        a.controls = true;
        a.autoplay = true;
        previewContent.appendChild(a);
    } else {
        const img = document.createElement('img');
        img.src = src;
        previewContent.appendChild(img);
    }
}
function closePreviewOverlay() {
    if(!previewOverlay) return;
    previewOverlay.classList.add('hidden');
    previewContent.innerHTML = '';
}
if(previewCloseBtn) previewCloseBtn.addEventListener('click', closePreviewOverlay);
if(previewOverlay) previewOverlay.addEventListener('click', (e) => {
    if(e.target === previewOverlay) closePreviewOverlay();
});

const mbPreviewBtn = document.getElementById('mb-preview-file');
if(mbPreviewBtn) mbPreviewBtn.addEventListener('click', () => {
    if(!mbSelected.size) return;
    const first = [...mbSelected][0];
    openPreviewOverlay(first);
});

// ── Mac App Workflows ──────────────────────────────────────────────────────
(function initMacWorkflows(){
    const dock=document.getElementById('workflow-dock');
    const launch=document.getElementById('workflow-launch-btn');
    const stack=document.getElementById('workflow-stack');
    const thumbCard=document.getElementById('workflow-thumb-card');
    const activeCard=document.getElementById('workflow-active-card');
    const activeClose=document.getElementById('workflow-active-close');
    if(!dock||!launch||!stack||!thumbCard||!activeCard||!activeClose||!canvas) return;

    if(!IS_MAC_APP){
        dock.classList.add('hidden');
        return;
    }
    dock.classList.remove('hidden');

    const wfNodes=[
        {id:'character',title:'Character',kind:'image',x:0,y:0,enabled:true},
        {id:'expression',title:'Expression',kind:'expression',x:0,y:0,enabled:true},
        {id:'thumbRef',title:'Thumbnail Reference',kind:'image',x:0,y:0,enabled:true},
        {id:'backgroundRef',title:'Background',kind:'image',x:0,y:0,enabled:true},
        {id:'palette',title:'Color Palette',kind:'palette',x:0,y:0,enabled:true},
        {id:'thumbText',title:'Thumbnail Text',kind:'text',x:0,y:0,enabled:true},
        {id:'prompt',title:'Prompt',kind:'prompt',x:0,y:0,enabled:true},
        {id:'model',title:'Model',kind:'model',x:0,y:0,enabled:true},
        {id:'create',title:'Create',kind:'action',x:0,y:0,enabled:true}
    ];
    const wfState={
        images:{character:null,thumbRef:null,backgroundRef:null},
        imageFromNode:{character:null,thumbRef:null,backgroundRef:null},
        palette:['#ef4027','#101317','#f5f2ec'],
        text:'',
        font:'American Typewriter, serif',
        expression:'confident smile',
        prompt:'',
        model:'flux',
        aspect:'16:9'
    };
    const connections={
        expression:'character',
        thumbRef:'expression',
        backgroundRef:'thumbRef',
        palette:'backgroundRef',
        thumbText:'palette',
        prompt:'thumbText',
        model:'prompt',
        create:'model'
    };
    const expressionOptions=[
        'confident smile','serious focus','surprised wow','excited shout','curious look','skeptical glance','angry intensity','calm neutral','laughing joy','determined grit'
    ];
    const fallbackFonts=[
        'American Typewriter, serif','Helvetica Neue, sans-serif','Futura, sans-serif','Avenir Next, sans-serif','Georgia, serif',"Times New Roman, serif",'Impact, sans-serif','Bebas Neue, sans-serif'
    ];
    const aspectOptions=['16:9','1:1','9:16','4:5','3:2','2:3'];
    let wfFontOptions=[...fallbackFonts];
    const wfEls={};
    const WF_SVG_OFFSET=50000;
    let wfActive=false;
    let linesLayer=null;
    let hoverDropNodeId='';
    let dragImageSourceNode=null;

    function setDragSourceVisual(node){
        if(dragImageSourceNode===node) return;
        if(dragImageSourceNode) dragImageSourceNode.classList.remove('wf-drag-source');
        dragImageSourceNode=node||null;
        if(dragImageSourceNode) dragImageSourceNode.classList.add('wf-drag-source');
    }

    function clearDragSourceVisual(){
        if(dragImageSourceNode) dragImageSourceNode.classList.remove('wf-drag-source');
        dragImageSourceNode=null;
    }

    let connectFrom='';

    function ensureLinesLayer(){
        if(linesLayer&&linesLayer.isConnected) return linesLayer;
        linesLayer=document.createElementNS('http://www.w3.org/2000/svg','svg');
        linesLayer.classList.add('wf-lines-layer');
        linesLayer.setAttribute('viewBox','0 0 100000 100000');
        canvas.appendChild(linesLayer);
        return linesLayer;
    }

    function clearDropdowns(){
        canvas.querySelectorAll('.wf-dd .model-dropdown').forEach(dd=>dd.classList.add('hidden'));
    }

    function getWorkflowModelOptions(){
        const vision=(modelCatalog.imageVision||[]).filter(Boolean);
        if(vision.length) return vision;
        const base=(modelCatalog.image||[]).filter(Boolean);
        return base.length?base:['flux'];
    }

    function syncMainModelSelectorToWorkflow(){
        const vision=getWorkflowModelOptions();
        if(!vision.length) return;
        if(!vision.includes(wfState.model)) wfState.model=vision[0];
        currentModel=wfState.model;
        modelLabel.textContent=currentModel;
        renderModelGroups([{label:'Image Edit Models (Vision)',models:vision}]);
    }

    async function ensureWorkflowModelCatalog(){
        if(!Array.isArray(modelCatalog.imageVision)||!modelCatalog.imageVision.length){
            try{ await loadImageModels(); }catch{}
        }
        const options=getWorkflowModelOptions();
        wfState.model=options.includes(currentModel)?currentModel:options[0];
        syncMainModelSelectorToWorkflow();
    }

    function setDetachedVisual(node,el){
        if(el) el.classList.toggle('detached',!node.enabled);
    }

    function getAspectDimensions(aspect){
        const v=String(aspect||'16:9').trim();
        if(v==='1:1') return {w:1024,h:1024};
        if(v==='9:16') return {w:864,h:1536};
        if(v==='4:5') return {w:1024,h:1280};
        if(v==='3:2') return {w:1200,h:800};
        if(v==='2:3') return {w:800,h:1200};
        return {w:1536,h:864};
    }

    function clearDropTargets(){
        Object.values(wfEls).forEach(el=>el.classList.remove('wf-drop-target'));
        hoverDropNodeId='';
    }

    function setWorkflowImageSource(nodeId,src,fromNode){
        if(!wfState.images.hasOwnProperty(nodeId)) return;
        wfState.images[nodeId]=src||'';
        wfState.imageFromNode[nodeId]=fromNode||null;
        const n=wfEls[nodeId];
        const preview=n&&n.querySelector('[data-role="preview"]');
        if(!preview) return;
        preview.innerHTML=src?`<img src="${src}">`:'Drop image here';
    }

    function findNearestImageDropTarget(clientX,clientY){
        const candidates=wfNodes.filter(n=>n.kind==='image'&&n.enabled).map(n=>n.id);
        let best='';
        let bestScore=Infinity;
        candidates.forEach(id=>{
            const el=wfEls[id];
            if(!el) return;
            const r=el.getBoundingClientRect();
            const cx=r.left+r.width/2;
            const cy=r.top+r.height/2;
            const dist=Math.hypot(clientX-cx,clientY-cy);
            const inHalo=(clientX>=r.left-44&&clientX<=r.right+44&&clientY>=r.top-44&&clientY<=r.bottom+44);
            if(!inHalo&&dist>130) return;
            if(dist<bestScore){bestScore=dist;best=id;}
        });
        return best;
    }

    async function openWorkflowGraph(){
        if(wfActive) return;
        wfActive=true;
        await ensureWorkflowModelCatalog();
        const vc=viewCenter();
        const startX=vc.x-320;
        const startY=vc.y-240;
        const grid=[
            ['character',startX,startY],
            ['expression',startX+270,startY],
            ['thumbRef',startX+540,startY],
            ['backgroundRef',startX,startY+250],
            ['palette',startX+270,startY+250],
            ['thumbText',startX+540,startY+250],
            ['prompt',startX,startY+500],
            ['model',startX+270,startY+500],
            ['create',startX+540,startY+500]
        ];
        grid.forEach(([id,x,y])=>{
            const n=wfNodes.find(v=>v.id===id);
            if(!n) return;
            n.x=x;n.y=y;
        });
        ensureLinesLayer();
        renderWorkflow();
        activeCard.classList.remove('hidden');
    }

    function closeWorkflowGraph(){
        Object.values(wfEls).forEach(el=>{if(el&&el.parentNode) el.parentNode.removeChild(el);});
        Object.keys(wfEls).forEach(k=>delete wfEls[k]);
        if(linesLayer){
            linesLayer.innerHTML='';
            if(linesLayer.parentNode) linesLayer.parentNode.removeChild(linesLayer);
            linesLayer=null;
        }
        wfActive=false;
        connectFrom='';
        clearDragSourceVisual();
        clearDropTargets();
        activeCard.classList.add('hidden');
    }

    launch.addEventListener('click',e=>{
        e.stopPropagation();
        stack.classList.toggle('hidden');
    });
    window.addEventListener('click',e=>{
        if(!dock.contains(e.target)){
            stack.classList.add('hidden');
            clearDropdowns();
        }
    });
    thumbCard.addEventListener('click',()=>{
        stack.classList.add('hidden');
        openWorkflowGraph().catch(err=>console.warn('workflow open failed',err));
    });
    activeClose.addEventListener('click',e=>{
        e.stopPropagation();
        closeWorkflowGraph();
    });

    function createNodeElement(node){
        const el=document.createElement('div');
        el.className='wf-node';
        el.dataset.nodeId=node.id;
        el.style.left=node.x+'px';
        el.style.top=node.y+'px';
        el.innerHTML=`
            <div class="wf-port in" data-port="in" data-node="${node.id}"></div>
            <div class="wf-port out" data-port="out" data-node="${node.id}"></div>
            <div class="wf-node-header">
                <div class="wf-node-title">${node.title}</div>
                <button class="wf-node-detach ${node.enabled?'':'active'}" data-role="detach" title="Detach/attach node">−</button>
            </div>
            <div class="wf-node-body">${nodeBody(node)}</div>
        `;
        setDetachedVisual(node,el);
        el.addEventListener('mousedown',e=>e.stopPropagation());
        el.addEventListener('click',e=>e.stopPropagation());
        makeDraggable(el,node);
        bindNodeInputs(el,node);
        return el;
    }

    function nodeBody(node){
        if(node.kind==='image'){
            const imgSrc=wfState.images[node.id]||'';
            return `
                <div class="wf-preview" data-role="preview">${imgSrc?`<img src="${imgSrc}">`:'Drop image here'}</div>
                <button class="wf-upload" data-role="upload">Upload Image</button>
                <input type="file" accept="image/*" hidden data-role="file">
            `;
        }
        if(node.kind==='palette'){
            return `
                <div class="wf-colors">
                    <input type="color" data-role="color" data-idx="0" value="${wfState.palette[0]}">
                    <input type="color" data-role="color" data-idx="1" value="${wfState.palette[1]}">
                    <input type="color" data-role="color" data-idx="2" value="${wfState.palette[2]}">
                </div>
            `;
        }
        if(node.kind==='text'){
            return `
                <input class="wf-input" data-role="thumb-text" placeholder="Text on thumbnail" value="${escapeHtml(wfState.text)}">
                ${dropdownMarkup('font-dd',wfState.font)}
            `;
        }
        if(node.kind==='expression'){
            return `${dropdownMarkup('expression-dd',wfState.expression)}`;
        }
        if(node.kind==='prompt'){
            return `
                <textarea class="wf-textarea wf-prompt-ta" data-role="prompt" placeholder="Style, composition, expression, lighting...">${escapeHtml(wfState.prompt)}</textarea>
                <div class="wf-prompt-row">
                    <button class="wf-prompt-magic" data-role="prompt-magic" title="Enhance prompt">
                        <span class="magic-wand-icon"></span>
                    </button>
                </div>
            `;
        }
        if(node.kind==='model'){
            return `
                ${dropdownMarkup('model-dd',wfState.model)}
                ${dropdownMarkup('aspect-dd',wfState.aspect)}
            `;
        }
        return `<button class="wf-action-btn" data-role="create">Create Thumbnail</button>`;
    }

    function dropdownMarkup(role,label){
        return `
            <div class="wf-dd" data-role="${role}">
                <button class="wf-dd-btn" data-role="dd-btn">
                    <span data-role="dd-label">${escapeHtml(label)}</span>
                    <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                </button>
                <div class="model-dropdown hidden" data-role="dd-menu"></div>
            </div>
        `;
    }

    function fillDropdownMenu(menu,options,current,onPick){
        menu.innerHTML='';
        options.forEach(opt=>{
            const b=document.createElement('button');
            b.className='model-opt'+(opt===current?' active':'');
            b.textContent=opt;
            b.addEventListener('click',e=>{
                e.preventDefault();
                e.stopPropagation();
                onPick(opt);
                menu.classList.add('hidden');
            });
            menu.appendChild(b);
        });
    }

    function bindNodeInputs(el,node){
        const detachBtn=el.querySelector('[data-role="detach"]');
        if(detachBtn){
            detachBtn.addEventListener('click',e=>{
                e.preventDefault();
                e.stopPropagation();
                node.enabled=!node.enabled;
                detachBtn.classList.toggle('active',!node.enabled);
                setDetachedVisual(node,el);
                drawLinks();
            });
        }
        const inPort=el.querySelector('.wf-port.in');
        const outPort=el.querySelector('.wf-port.out');
        if(outPort){
            outPort.addEventListener('click',e=>{
                e.stopPropagation();
                connectFrom=node.id;
                Object.values(wfEls).forEach(nodeEl=>{
                    nodeEl.querySelectorAll('.wf-port').forEach(p=>p.classList.remove('active'));
                });
                outPort.classList.add('active');
            });
        }
        if(inPort){
            inPort.addEventListener('click',e=>{
                e.stopPropagation();
                if(!connectFrom){
                    delete connections[node.id];
                }else if(connectFrom!==node.id){
                    connections[node.id]=connectFrom;
                    connectFrom='';
                }
                Object.values(wfEls).forEach(nodeEl=>{
                    nodeEl.querySelectorAll('.wf-port').forEach(p=>p.classList.remove('active'));
                });
                drawLinks();
            });
        }

        if(node.kind==='image'){
            const upload=el.querySelector('[data-role="upload"]');
            const file=el.querySelector('[data-role="file"]');
            const preview=el.querySelector('[data-role="preview"]');
            if(upload&&file){
                upload.addEventListener('click',()=>file.click());
                file.addEventListener('change',()=>{
                    const f=file.files&&file.files[0];
                    if(!f) return;
                    const src=URL.createObjectURL(f);
                    wfState.imageFromNode[node.id]=null;
                    wfState.images[node.id]=src;
                    preview.innerHTML=`<img src="${src}">`;
                });
            }
        }else if(node.kind==='palette'){
            el.querySelectorAll('[data-role="color"]').forEach(inp=>{
                inp.addEventListener('input',()=>{wfState.palette[parseInt(inp.dataset.idx,10)] = inp.value;});
            });
        }else if(node.kind==='text'){
            const txt=el.querySelector('[data-role="thumb-text"]');
            const fontDD=el.querySelector('[data-role="font-dd"]');
            if(txt) txt.addEventListener('input',()=>{wfState.text=txt.value||'';});
            if(fontDD){
                bindWorkflowDropdown(fontDD,()=>wfFontOptions,()=>wfState.font,v=>{wfState.font=v;});
            }
        }else if(node.kind==='expression'){
            const expDD=el.querySelector('[data-role="expression-dd"]');
            if(expDD){
                bindWorkflowDropdown(expDD,()=>expressionOptions,()=>wfState.expression,v=>{wfState.expression=v;});
            }
        }else if(node.kind==='prompt'){
            const ta=el.querySelector('[data-role="prompt"]');
            if(ta) ta.addEventListener('input',()=>{wfState.prompt=ta.value||'';});
            const magic=el.querySelector('[data-role="prompt-magic"]');
            if(magic){
                magic.addEventListener('click',e=>{
                    e.preventDefault();
                    e.stopPropagation();
                    enhanceWorkflowPrompt().catch(err=>console.warn('workflow prompt enhance failed',err));
                });
            }
        }else if(node.kind==='model'){
            const modelDD=el.querySelector('[data-role="model-dd"]');
            const aspectDD=el.querySelector('[data-role="aspect-dd"]');
            if(modelDD){
                bindWorkflowDropdown(modelDD,()=>getWorkflowModelOptions(),()=>wfState.model,v=>{
                    wfState.model=v;
                    currentModel=v;
                    modelLabel.textContent=v;
                    syncMainModelSelectorToWorkflow();
                });
            }
            if(aspectDD){
                bindWorkflowDropdown(aspectDD,()=>aspectOptions,()=>wfState.aspect,v=>{wfState.aspect=v;});
            }
        }else if(node.kind==='action'){
            const btn=el.querySelector('[data-role="create"]');
            if(btn) btn.addEventListener('click',()=>createThumbnailFromWorkflow().catch(err=>console.warn('workflow create failed',err)));
        }
    }

    function bindWorkflowDropdown(root,getOptions,getValue,setValue){
        const btn=root.querySelector('[data-role="dd-btn"]');
        const label=root.querySelector('[data-role="dd-label"]');
        const menu=root.querySelector('[data-role="dd-menu"]');
        if(!btn||!label||!menu) return;
        const render=()=>{
            label.textContent=getValue()||'';
            fillDropdownMenu(menu,getOptions(),getValue(),v=>{setValue(v);render();});
        };
        render();
        btn.addEventListener('click',e=>{
            e.preventDefault();
            e.stopPropagation();
            const wasOpen=!menu.classList.contains('hidden');
            clearDropdowns();
            if(!wasOpen){
                render();
                menu.classList.remove('hidden');
            }
        });
    }

    function escapeHtml(s){
        return String(s||'').replace(/[&<>\"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
    }

    async function hydrateFontOptions(){
        let fonts=[...fallbackFonts];
        if(window.queryLocalFonts){
            try{
                const local=await window.queryLocalFonts();
                const names=[...new Set(local.map(f=>f.family).filter(Boolean))].slice(0,80).map(f=>`${f}, sans-serif`);
                fonts=[...new Set([...names,...fallbackFonts])];
            }catch{}
        }
        wfFontOptions=fonts;
        if(!fonts.includes(wfState.font)) wfState.font=fonts[0]||fallbackFonts[0];
    }

    async function enhanceWorkflowPrompt(){
        const src=(wfState.prompt||'').trim();
        const req=src
            ? `Rewrite and improve this YouTube thumbnail prompt while keeping intent and constraints: ${src}`
            : 'Generate one fresh, high-conversion YouTube thumbnail prompt with bold composition, emotion, and click-worthy visual contrast.';
        const res=await fetch(`${API_BASE}/v1/chat/completions`,{
            method:'POST',
            headers:buildAuthHeaders({'Content-Type':'application/json'}),
            body:JSON.stringify({
                model:'gemini-fast',
                stream:false,
                messages:[
                    {role:'system',content:'Output exactly one polished prompt only. No bullets. No quotes. Keep it concise and production-ready for image generation.'},
                    {role:'user',content:req}
                ]
            })
        });
        if(!res.ok) throw new Error(`Enhance failed (${res.status})`);
        const data=await res.json();
        const out=(data?.choices?.[0]?.message?.content||'').trim();
        if(!out) return;
        wfState.prompt=out;
        const ta=wfEls.prompt&&wfEls.prompt.querySelector('[data-role="prompt"]');
        if(ta) ta.value=out;
    }

    function makeDraggable(el,node){
        const head=el.querySelector('.wf-node-header');
        let st=null;
        head.addEventListener('mousedown',e=>{
            if(e.target&&e.target.closest('input,button,select,textarea,label')) return;
            e.preventDefault();
            clearDropdowns();
            st={sx:e.clientX,sy:e.clientY,ox:node.x,oy:node.y};
            const move=ev=>{
                if(!st) return;
                node.x=st.ox+((ev.clientX-st.sx)/sc);
                node.y=st.oy+((ev.clientY-st.sy)/sc);
                el.style.left=node.x+'px';
                el.style.top=node.y+'px';
                drawLinks();
            };
            const up=()=>{st=null;window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};
            window.addEventListener('mousemove',move);
            window.addEventListener('mouseup',up);
        });
    }

    function portCenter(nodeId,type){
        const n=wfEls[nodeId];
        const p=n&&n.querySelector(`.wf-port.${type}`);
        if(!p) return null;
        const x=parseFloat(n.style.left)||0;
        const y=parseFloat(n.style.top)||0;
        const nx=x+(type==='out'?n.offsetWidth:0);
        const ny=y+(n.offsetHeight/2);
        return {x:nx+WF_SVG_OFFSET,y:ny+WF_SVG_OFFSET};
    }

    function drawLinks(){
        if(!linesLayer) return;
        linesLayer.innerHTML='';
        Object.keys(connections).forEach(target=>{
            const from=connections[target];
            const a=portCenter(from,'out');
            const b=portCenter(target,'in');
            if(!a||!b) return;
            const src=wfNodes.find(n=>n.id===from);
            const dst=wfNodes.find(n=>n.id===target);
            const active=!!(src&&dst&&src.enabled&&dst.enabled);
            const c1x=a.x+Math.max(30,(b.x-a.x)*0.35);
            const c2x=b.x-Math.max(30,(b.x-a.x)*0.35);
            const d=`M ${a.x} ${a.y} C ${c1x} ${a.y}, ${c2x} ${b.y}, ${b.x} ${b.y}`;
            const path=document.createElementNS('http://www.w3.org/2000/svg','path');
            path.setAttribute('d',d);
            path.setAttribute('class',`wf-link${active?'':' inactive'}`);
            linesLayer.appendChild(path);
        });
    }

    function renderWorkflow(){
        Object.values(wfEls).forEach(el=>{if(el&&el.parentNode) el.parentNode.removeChild(el);});
        Object.keys(wfEls).forEach(k=>delete wfEls[k]);
        wfNodes.forEach(n=>{
            const el=createNodeElement(n);
            wfEls[n.id]=el;
            canvas.appendChild(el);
        });
        drawLinks();
        hydrateFontOptions().then(()=>{
            const textNode=wfEls.thumbText;
            if(!textNode) return;
            const fontDD=textNode.querySelector('[data-role="font-dd"]');
            if(fontDD){
                const label=fontDD.querySelector('[data-role="dd-label"]');
                if(label) label.textContent=wfState.font;
            }
        });
    }

    function workflowBounds(){
        const vals=Object.values(wfEls);
        if(!vals.length) return null;
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        vals.forEach(el=>{
            const x=parseFloat(el.style.left)||0;
            const y=parseFloat(el.style.top)||0;
            const w=el.offsetWidth||220;
            const h=el.offsetHeight||180;
            minX=Math.min(minX,x);
            minY=Math.min(minY,y);
            maxX=Math.max(maxX,x+w);
            maxY=Math.max(maxY,y+h);
        });
        return {minX,minY,maxX,maxY};
    }

    async function createWorkflowResultNode(prompt,refUrls){
        const bounds=workflowBounds();
        const ax=bounds?bounds.maxX+42:viewCenter().x+80;
        const ay=bounds?bounds.minY+96:viewCenter().y-120;
        const dims=(wfNodes.find(n=>n.id==='model')?.enabled)?getAspectDimensions(wfState.aspect):{w:genW,h:genH};
        const selectedModel=(wfNodes.find(n=>n.id==='model')?.enabled?wfState.model:currentModel)||'flux';
        const node=makeNode(ax,ay);
        const ph=createLoadingPlaceholder(dims.w,dims.h,'Creating thumbnail');
        finishNode(node,ph,false);
        try{
            const seed=Math.floor(Math.random()*1e6);
            const imageParam=refUrls.length?`&image=${encodeURIComponent(refUrls.join('|'))}`:'';
            const url=`${API_BASE}/image/${encodeURIComponent(prompt)}?model=${encodeURIComponent(selectedModel)}&width=${dims.w}&height=${dims.h}&seed=${seed}&enhance=true${imageParam}`;
            const res=await fetch(url,{headers:buildAuthHeaders()});
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob=await res.blob();
            const fp=await persistGeneratedBlob(blob,'thumbnail_workflow');
            node.innerHTML='';
            const inner=document.createElement('div');
            inner.className='node-inner';
            const img=document.createElement('img');
            img.src=fp?`file://${fp}`:URL.createObjectURL(blob);
            img.style.width=dims.w+'px';
            img.style.height=dims.h+'px';
            img.classList.add('gen-reveal');
            if(fp) node.dataset.filePath=fp;
            node.dataset.genPrompt=prompt;
            node.dataset.genModel=selectedModel;
            inner.appendChild(img);
            addHandles(node,inner);
            node.appendChild(inner);
            selOnly(node);
            setT(tx,ty,sc);
            schedulePersist(140);
        }catch(err){
            console.error('Workflow create failed',err);
            node.remove();
            allNodes=allNodes.filter(n=>n!==node);
        }
    }

    async function createThumbnailFromWorkflow(){
        const activeImgs=[];
        const imageNodes=wfNodes.filter(n=>n.kind==='image'&&n.enabled);
        for(let i=0;i<imageNodes.length;i++){
            const n=imageNodes[i];
            const src=wfState.images[n.id];
            if(!src) continue;
            const linkedNode=wfState.imageFromNode[n.id];
            if(linkedNode&&document.body.contains(linkedNode)){
                const url=await getPublicUrlForNodeImage(linkedNode,i);
                activeImgs.push(url);
            }else{
                const blob=await fetch(src).then(r=>r.blob());
                const ext=guessImageExtFromBlob(blob,src);
                const url=await uploadBlobToCatbox(blob,`workflow_${n.id}_${Date.now()}.${ext}`);
                activeImgs.push(url);
            }
            if(activeImgs.length>=3) break;
        }

        const expressionPart=wfNodes.find(n=>n.id==='expression')?.enabled
            ? `Primary character expression: ${wfState.expression}.`
            : '';
        const palettePart=wfNodes.find(n=>n.id==='palette')?.enabled
            ? `Color palette priority: ${wfState.palette.join(', ')}.`
            : '';
        const textPart=wfNodes.find(n=>n.id==='thumbText')?.enabled
            ? `Text to include on thumbnail: "${wfState.text||''}". Typography direction: use an ${wfState.font||'bold sans-serif'} style with strong legibility.`
            : '';
        const userPrompt=(wfState.prompt||'').trim();

        const basePrompt=[
            'Design a high-conversion YouTube thumbnail with clean composition, strong visual hierarchy, and crisp contrast.',
            expressionPart,
            palettePart,
            textPart,
            wfNodes.find(n=>n.id==='model')?.enabled?`Use model profile: ${wfState.model}.`: '',
            wfNodes.find(n=>n.id==='model')?.enabled?`Target aspect ratio: ${wfState.aspect}.`: '',
            userPrompt
        ].filter(Boolean).join(' ');

        let finalPrompt=basePrompt;
        try{
            const enhanceRes=await fetch(`${API_BASE}/v1/chat/completions`,{
                method:'POST',
                headers:buildAuthHeaders({'Content-Type':'application/json'}),
                body:JSON.stringify({
                    model:'gemini-fast',
                    stream:false,
                    messages:[
                        {role:'system',content:'Rewrite into one concise but powerful AI image prompt for a YouTube thumbnail. Keep all constraints and avoid extra commentary.'},
                        {role:'user',content:basePrompt}
                    ]
                })
            });
            if(enhanceRes.ok){
                const data=await enhanceRes.json();
                const txt=(data?.choices?.[0]?.message?.content||'').trim();
                if(txt) finalPrompt=txt;
            }
        }catch{}

        const refs=activeImgs.slice(0,3);
        await createWorkflowResultNode(finalPrompt,refs);
    }

    window.addEventListener('mousemove',e=>{
        if(!wfActive||!drag||drag.type!=='drag'){
            if(hoverDropNodeId) clearDropTargets();
            clearDragSourceVisual();
            return;
        }
        const source=[...selectedSet].find(n=>isImageNode(n));
        if(!source){
            if(hoverDropNodeId) clearDropTargets();
            clearDragSourceVisual();
            return;
        }
        setDragSourceVisual(source);
        const r=source.getBoundingClientRect();
        const targetId=findNearestImageDropTarget(r.left+r.width/2,r.top+r.height/2);
        if(targetId===hoverDropNodeId) return;
        clearDropTargets();
        hoverDropNodeId=targetId;
        if(targetId&&wfEls[targetId]) wfEls[targetId].classList.add('wf-drop-target');
    });

    window.addEventListener('mouseup',()=>{
        if(!wfActive||!hoverDropNodeId||!dragImageSourceNode) return;
        const src=getNodeImageUrl(dragImageSourceNode);
        if(src) setWorkflowImageSource(hoverDropNodeId,src,dragImageSourceNode);
        clearDropTargets();
        clearDragSourceVisual();
    });

    window.addEventListener('resize',()=>{if(wfActive) drawLinks();});
})();
