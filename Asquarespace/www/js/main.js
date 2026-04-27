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
const electron = safeNodeRequire('electron');
const electronShell = electron&&electron.shell?electron.shell:null;
const electronSystemPreferences = electron&&electron.systemPreferences?electron.systemPreferences:null;
const APP_QUERY = new URLSearchParams(window.location.search);
const IS_MAC_APP = APP_QUERY.get('app') === 'mac';

const API_KEY  = 'sk_CpXbaZAa5rqnfaDUxTtFrw4rVsOjtc7m';
const API_BASE = 'https://gen.pollinations.ai';
const SUPABASE_URL = 'https://idnuatrmilkjwcmqgysg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0fFfKFkffH43-8vX97na7A_H3mKg3K7';
const APP_WEB_URL = 'https://space.asquareportal.com';
const APP_PASSCODE = '24176882';
const SUPABASE_MEDIA_BUCKET = 'asq-media';
const SUPABASE_STATE_TABLE = 'user_workspace_state';
const SPACE2_SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 14;
const SPACE2_SIGNED_URL_REFRESH_GRACE_SEC = 60 * 60 * 6;

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
const authScreen  = document.getElementById('auth-screen');
const authPasscodeForm = document.getElementById('auth-passcode-form');
const authEmailForm = document.getElementById('auth-email-form');
const authOtpForm = document.getElementById('auth-otp-form');
const authPasscodeInput = document.getElementById('auth-passcode-input');
const authEmailInput = document.getElementById('auth-email-input');
const authOtpInput = document.getElementById('auth-otp-input');
const authChangeEmailBtn = document.getElementById('auth-change-email-btn');
const authStatus = document.getElementById('auth-status');
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
const boardMenuTrigger = document.getElementById('board-menu-trigger');
const boardQuickMenu = document.getElementById('board-quick-menu');
const boardFanGrid = document.getElementById('board-fan-grid');
const boardManageBtn = document.getElementById('board-manage-btn');
const boardPanel    = document.getElementById('board-panel');
const boardList     = document.getElementById('board-list');
const boardNewBtn   = document.getElementById('board-new-btn');
const moveBoardModal= document.getElementById('move-board-modal');
const moveBoardList = document.getElementById('move-board-list');
const moveBoardCancel = document.getElementById('move-board-cancel');
const extraMediaBrowserBtn = document.getElementById('extra-media-browser');
const space2TopCorner = document.getElementById('space2-top-corner');

const spaceSwitcher = document.getElementById('space-switcher');
const spaceSlider = document.getElementById('space-slider');
const spaceBtn1 = document.getElementById('space-btn-1');
const spaceBtn2 = document.getElementById('space-btn-2');
const space2Panel = document.getElementById('space2-panel');
const space2ModeDock = document.getElementById('space2-mode-dock');
const space2Search = document.getElementById('space2-search');
const space2NewCollection = document.getElementById('space2-new-collection');
const space2CameraBtn = document.getElementById('space2-camera-btn');
const space2UploadBtn = document.getElementById('space2-upload-btn');
const space2CameraInput = document.getElementById('space2-camera-input');
const space2FileInput = document.getElementById('space2-file-input');
const space2ViewToggle = document.getElementById('space2-view-toggle');
const space2GridAdd = document.getElementById('space2-grid-add');
const space2DiscoverPanel = document.getElementById('space2-discover');
const space2DiscoverControls = document.getElementById('space2-discover-controls');
const space2ViewSwitch = document.getElementById('space2-view-switch');
const space2SearchWrap = document.querySelector('#space2-sidebar .space2-search-wrap');
const space2Sash = document.getElementById('space2-sash');
const space2Sidebar = document.getElementById('space2-sidebar');
const space2SettingsBtn = document.getElementById('space2-settings-btn');
const space2SettingsModal = document.getElementById('space2-settings-modal');
const space2SettingsClose = document.getElementById('space2-settings-close');
const space2CapturePermissionBtn = document.getElementById('space2-capture-permission-btn');
const space2CaptureStatus = document.getElementById('space2-capture-status');
const space2LayoutGridBtn = document.getElementById('space2-layout-grid-btn');
const space2LayoutFeedBtn = document.getElementById('space2-layout-feed-btn');
const space2ColumnsSelect = document.getElementById('space2-columns-select');
const space2AutoMetaToggle = document.getElementById('space2-auto-meta-toggle');
const space2AutoMetaRun = document.getElementById('space2-auto-meta-run');
const space2AutoMetaStatus = document.getElementById('space2-auto-meta-status');
const space2Collections = document.getElementById('space2-collections');
const space2Grid = document.getElementById('space2-grid');
const space2ItemModal = document.getElementById('space2-item-modal');
const space2ItemPreview = document.getElementById('space2-item-preview');
const space2ItemTitle = document.getElementById('space2-item-title');
const space2ItemDesc = document.getElementById('space2-item-desc');
const space2AssignList = document.getElementById('space2-assign-list');
const space2ItemDelete = document.getElementById('space2-item-delete');
const space2ItemCancel = document.getElementById('space2-item-cancel');
const space2ItemSave = document.getElementById('space2-item-save');
const space2CollectionModal = document.getElementById('space2-collection-modal');
let space2LayoutFrame=0;
let space2LazyImageObserver=null;
const space2CollectionModalTitle = document.getElementById('space2-collection-modal-title');
const space2CollectionNameInput = document.getElementById('space2-collection-name');
const space2CollectionCancel = document.getElementById('space2-collection-cancel');
const space2CollectionSave = document.getElementById('space2-collection-save');
const space2AiHub = document.getElementById('space2-ai-hub');
const space2AiBar = document.getElementById('space2-ai-bar');
const space2AiInput = document.getElementById('space2-ai-input');
const space2AiEye = document.getElementById('space2-ai-eye');
const space2AiSend = document.getElementById('space2-ai-send');
const space2AiOutput = document.getElementById('space2-ai-output');
const space2AiModelBtn = document.getElementById('space2-ai-model-btn');
const space2AiModelLabel = document.getElementById('space2-ai-model-label');
const space2AiModelDropdown = document.getElementById('space2-ai-model-dropdown');
const space2AiAttachChip = document.getElementById('space2-ai-attach-chip');
const space2AiAttachThumb = document.getElementById('space2-ai-attach-thumb');
const space2AiDetach = document.getElementById('space2-ai-detach');
const space2AiCapturePreview = document.getElementById('space2-ai-capture-preview');
const space2AiCaptureImg = document.getElementById('space2-ai-capture-img');
const space2AiCaptureCancel = document.getElementById('space2-ai-capture-cancel');
const space2AiCaptureConfirm = document.getElementById('space2-ai-capture-confirm');
const space2CaptureOverlay = document.getElementById('space2-capture-overlay');
const space2CaptureBox = document.getElementById('space2-capture-box');

// ── State ─────────────────────────────────────────────────────────────────
let tx=0, ty=0, sc=1;
let allNodes    = [];
let selectedSet = new Set();
let drag        = null;
let activeCanvasPointerId = null;
let lastNoteTap = { node: null, time: 0, pointerType: '' };
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
let currentSpace='space1';
let space2ActiveCollection='all';
let space2SearchText='';
let space2State={items:[],collections:[]};
let space2ActiveItemId='';
let space2CollectionsOpen=false;
let space2View='grid';
let space2SidebarWidth=parseInt(localStorage.getItem('asq.space2.sidebar.width')||'264',10)||264;
let space2LayoutMode=(localStorage.getItem('asq.space2.layout.mode')||'grid')==='feed'?'feed':'grid';
let space2ColumnsSetting=localStorage.getItem('asq.space2.layout.columns')||'auto';
let space2AutoMetaEnabled=(localStorage.getItem('asq.space2.autoMeta')||'0')==='1';
let space2AutoMetaRunning=false;
const space2SidebarHead=document.querySelector('#space2-sidebar .space2-sidebar-head');
const space2MobileLayoutSlots=new Map();
[space2ViewSwitch,space2SearchWrap].forEach(el=>{
    if(el&&el.parentElement) space2MobileLayoutSlots.set(el,{parent:el.parentElement,next:el.nextElementSibling});
});
let space2AiModels=[];
let space2AiModel='openai';
let space2AiCaptureArmed=false;
let space2AiCaptureDrag=null;
let space2AiPendingCapture='';
let space2AiAttachedCapture='';
let space2CapturePermissionBootAttempted=false;
let discoverItems = [];
let discoverVisibleCount = 0;
let discoverLoading = false;
let space2CollectionModalMode='create';
let space2CollectionEditingId='';
let activeCollectionMenu=null;
let supabaseClient=null;
let currentSupabaseUser=null;
let currentAuthEmail='';
let cloudSyncTimer=null;
let appBootstrapped=false;
let pendingSpace2CloudLoad=false;
const DISCOVER_PAGE_SIZE = 18;

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

function getSpace2Key(projectKey,boardId){
    return `asq.space2.v1.${projectKey||'local-default'}.${boardId||'board-1'}`;
}

function defaultSpace2State(){
    return {items:[],collections:[]};
}

function initSupabaseClient(){
    if(supabaseClient) return supabaseClient;
    if(!window.supabase||!window.supabase.createClient) return null;
    supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    return supabaseClient;
}

function setAuthStatus(message,isError=false){
    if(!authStatus) return;
    authStatus.textContent=message||'';
    authStatus.classList.toggle('error',!!isError);
}

function showAuthStep(step){
    if(!authPasscodeForm||!authEmailForm||!authOtpForm) return;
    authPasscodeForm.classList.toggle('hidden',step!=='passcode');
    authEmailForm.classList.toggle('hidden',step!=='email');
    authOtpForm.classList.toggle('hidden',step!=='otp');
}

function getCloudBoardKey(projectKey=currentProjectKey,boardId=currentBoardId){
    return `${projectKey||'local-default'}::${boardId||'board-1'}`;
}

function nowEpochSec(){
    return Math.floor(Date.now()/1000);
}

function shouldRefreshSpace2SignedUrl(item){
    if(!item||!item.cloudPath) return false;
    if(!item.src) return true;
    const exp=parseInt(item.signedUrlExpiresAt||0,10)||0;
    if(!exp) return true;
    return (exp-nowEpochSec())<=SPACE2_SIGNED_URL_REFRESH_GRACE_SEC;
}

// ── Image compression (Canvas API — works in browser + Capacitor WebView) ──
// maxPx: longest side cap. quality: 0-1 for WebP/JPEG. Returns compressed Blob.
// Falls back to original blob if canvas/WebP unavailable.
const IMG_COMPRESS_MAX_PX = 2048;
const IMG_COMPRESS_QUALITY = 0.88;
const IMG_COMPRESS_FORMAT  = 'image/webp';
const IMG_COMPRESS_MIN_BYTES = 80 * 1024; // skip compression for images already < 80 KB

function _compressImageBlob(blob, {maxPx=IMG_COMPRESS_MAX_PX, quality=IMG_COMPRESS_QUALITY, format=IMG_COMPRESS_FORMAT}={}){
    return new Promise(resolve=>{
        if(!blob||!blob.type||!blob.type.startsWith('image/')){resolve(blob);return;}
        // skip tiny images — compression won't help much
        if(blob.size < IMG_COMPRESS_MIN_BYTES){resolve(blob);return;}
        const url=URL.createObjectURL(blob);
        const img=new Image();
        img.onload=()=>{
            URL.revokeObjectURL(url);
            let {naturalWidth:w, naturalHeight:h}=img;
            if(w>maxPx||h>maxPx){
                if(w>=h){h=Math.round(h*(maxPx/w));w=maxPx;}
                else{w=Math.round(w*(maxPx/h));h=maxPx;}
            }
            const canvas=document.createElement('canvas');
            canvas.width=w; canvas.height=h;
            const ctx=canvas.getContext('2d');
            ctx.drawImage(img,0,0,w,h);
            canvas.toBlob(compressed=>{
                // only use compressed if it's actually smaller
                resolve(compressed&&compressed.size<blob.size?compressed:blob);
            },format,quality);
        };
        img.onerror=()=>{URL.revokeObjectURL(url);resolve(blob);};
        img.src=url;
    });
}

async function uploadBlobToSupabase(blob,{folder='uploads',nameHint='image'}={}){
    const client=initSupabaseClient();
    if(!client||!currentSupabaseUser||!blob) return null;
    // compress before upload — reduces Supabase storage + all future egress
    blob=await _compressImageBlob(blob).catch(()=>blob);
    const ext=extFromMime(blob.type||'image/png');
    const cleanHint=(nameHint||'image').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,28)||'image';
    const path=`${currentSupabaseUser.id}/${folder}/${Date.now()}_${Math.floor(Math.random()*100000)}_${cleanHint}.${ext}`;
    const upload=await client.storage.from(SUPABASE_MEDIA_BUCKET).upload(path,blob,{upsert:false,contentType:blob.type||'image/png',cacheControl:'31536000'});
    if(upload.error){
        console.warn('supabase storage upload failed',upload.error.message||upload.error);
        return null;
    }
    const signed=await client.storage.from(SUPABASE_MEDIA_BUCKET).createSignedUrl(path,SPACE2_SIGNED_URL_TTL_SEC);
    if(signed.error){
        console.warn('supabase signed url failed',signed.error.message||signed.error);
        return {path,url:'',expiresAt:0};
    }
    return {path,url:signed.data?.signedUrl||'',expiresAt:nowEpochSec()+SPACE2_SIGNED_URL_TTL_SEC};
}

async function refreshSpace2SignedUrls(){
    const client=initSupabaseClient();
    if(!client||!currentSupabaseUser||!space2State||!Array.isArray(space2State.items)) return;
    const targets=space2State.items.filter(shouldRefreshSpace2SignedUrl);
    if(!targets.length) return;
    await Promise.all(targets.map(async item=>{
        const signed=await client.storage.from(SUPABASE_MEDIA_BUCKET).createSignedUrl(item.cloudPath,SPACE2_SIGNED_URL_TTL_SEC);
        if(!signed.error&&signed.data&&signed.data.signedUrl){
            item.src=signed.data.signedUrl;
            item.signedUrlExpiresAt=nowEpochSec()+SPACE2_SIGNED_URL_TTL_SEC;
        }
    }));
}

function scheduleCloudSync(delay=700){
    if(!currentSupabaseUser) return;
    if(cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer=setTimeout(()=>{cloudSyncTimer=null;syncStateToSupabase().catch(err=>console.warn('cloud sync failed',err));},delay);
}

async function syncStateToSupabase(){
    const client=initSupabaseClient();
    if(!client||!currentSupabaseUser) return;
    const boardPayload=buildBoardPayload();
    const spacePayload=JSON.parse(JSON.stringify(space2State||defaultSpace2State()));
    const payload={
        user_id:currentSupabaseUser.id,
        board_key:getCloudBoardKey(),
        project_key:currentProjectKey||'local-default',
        board_id:currentBoardId||'board-1',
        canvas_state:boardPayload,
        space2_state:spacePayload,
        updated_at:new Date().toISOString()
    };
    const {error}=await client.from(SUPABASE_STATE_TABLE).upsert(payload,{onConflict:'user_id,board_key'});
    if(error) console.warn('supabase state upsert failed',error.message||error);
}

async function restoreStateFromSupabase(){
    const client=initSupabaseClient();
    if(!client||!currentSupabaseUser) return;
    const {data,error}=await client
        .from(SUPABASE_STATE_TABLE)
        .select('canvas_state,space2_state')
        .eq('user_id',currentSupabaseUser.id)
        .eq('board_key',getCloudBoardKey())
        .maybeSingle();
    if(error){
        console.warn('supabase state fetch failed',error.message||error);
        return;
    }
    if(!data) return;
    if(data.canvas_state){
        try{ localStorage.setItem(getStorageKey(currentProjectKey,currentBoardId),JSON.stringify(data.canvas_state)); }catch{}
    }
    if(data.space2_state){
        try{ localStorage.setItem(getSpace2Key(currentProjectKey,currentBoardId),JSON.stringify(data.space2_state)); }catch{}
    }
    if(data.canvas_state&&Array.isArray(data.canvas_state.nodes)) loadBoardState(currentProjectKey,currentBoardId);
    if(data.space2_state){
        loadSpace2State(currentProjectKey,currentBoardId);
        await refreshSpace2SignedUrls();
        renderSpace2Grid();
    }
}

function loadSpace2State(projectKey=currentProjectKey,boardId=currentBoardId){
    try{
        const raw=localStorage.getItem(getSpace2Key(projectKey,boardId));
        const parsed=raw?JSON.parse(raw):null;
        const items=Array.isArray(parsed&&parsed.items)?parsed.items.filter(i=>i&&i.id&&(i.src||i.cloudPath)):[];
        const collections=Array.isArray(parsed&&parsed.collections)?parsed.collections.filter(c=>c&&c.id&&c.name):[];
        space2State={items,collections};
    }catch{
        space2State=defaultSpace2State();
    }
    if(!space2State.collections.some(c=>c.id===space2ActiveCollection)) space2ActiveCollection='all';
    if(currentSupabaseUser&&space2State.items.some(shouldRefreshSpace2SignedUrl)){
        refreshSpace2SignedUrls().then(()=>{
            saveSpace2State(projectKey,boardId);
            renderSpace2Grid();
        }).catch(err=>console.warn('space2 signed url refresh failed',err));
    }
    renderSpace2Collections();
    renderSpace2Grid();
}

function saveSpace2State(projectKey=currentProjectKey,boardId=currentBoardId){
    localStorage.setItem(getSpace2Key(projectKey,boardId),JSON.stringify(space2State));
    scheduleCloudSync(760);
}

function getFilteredSpace2Items(){
    const q=(space2SearchText||'').trim().toLowerCase();
    return space2State.items.filter(item=>{
        if(space2ActiveCollection!=='all'&&!((item.collectionIds||[]).includes(space2ActiveCollection))) return false;
        if(!q) return true;
        const title=(item.title||'').toLowerCase();
        const desc=(item.description||'').toLowerCase();
        return title.includes(q)||desc.includes(q);
    });
}

function escapeHtml(value=''){
    return String(value)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
}

function setSpace2AutoMetaStatus(message,isError=false){
    if(!space2AutoMetaStatus) return;
    space2AutoMetaStatus.textContent=message||'';
    space2AutoMetaStatus.style.color=isError?'#d25a5a':'';
}

function sanitizeMetaTitle(value=''){
    const cleaned=String(value||'').replace(/\s+/g,' ').trim();
    if(!cleaned) return 'Untitled';
    return cleaned.slice(0,42);
}

function sanitizeMetaDescription(value=''){
    const cleaned=String(value||'').replace(/\s+/g,' ').trim();
    if(!cleaned) return 'Image';
    return cleaned.slice(0,160);
}

function extractJsonObject(text=''){
    const raw=String(text||'').trim();
    if(!raw) return null;
    try{return JSON.parse(raw);}catch{}
    const first=raw.indexOf('{');
    const last=raw.lastIndexOf('}');
    if(first===-1||last===-1||last<=first) return null;
    try{return JSON.parse(raw.slice(first,last+1));}catch{return null;}
}

function blobToDataUrl(blob){
    return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result||''));
        reader.onerror=()=>reject(reader.error||new Error('Unable to read image blob'));
        reader.readAsDataURL(blob);
    });
}

async function resolveSpace2AnalysisImageUrl(item,analysisBlob){
    if(analysisBlob){
        const dataUrl=await blobToDataUrl(analysisBlob);
        if(dataUrl) return dataUrl;
    }
    const src=(item&&item.src||'').trim();
    if(/^https?:\/\//i.test(src)||/^data:image\//i.test(src)) return src;
    if(src){
        try{
            const res=await fetch(src);
            if(res.ok){
                const blob=await res.blob();
                const dataUrl=await blobToDataUrl(blob);
                if(dataUrl) return dataUrl;
            }
        }catch{}
    }
    if(item&&item.filePath){
        try{
            const res=await fetch(toFileUrl(item.filePath));
            if(res.ok){
                const blob=await res.blob();
                const dataUrl=await blobToDataUrl(blob);
                if(dataUrl) return dataUrl;
            }
        }catch{}
    }
    throw new Error('No analyzable image source available');
}

async function requestSpace2AutoMetadata(item,{analysisBlob=null}={}){
    const imageUrl=await resolveSpace2AnalysisImageUrl(item,analysisBlob);
    const titleHint=(item&&item.title||'').trim();
    const prompt=[
        'Analyze this image and return JSON only.',
        'Return exactly this shape: {"title":"...","description":"..."}',
        'Rules:',
        '- title: short, specific, max 6 words',
        '- description: max 2 lines of plain text, concise visual summary',
        '- no markdown, no extra keys'
    ].join('\n');
    const body={
        model:'gemini-fast',
        stream:false,
        temperature:0.2,
        messages:[
            {role:'system',content:'You generate concise visual metadata for images.'},
            {role:'user',content:[
                {type:'text',text:`${prompt}\nCurrent title hint: ${titleHint||'none'}`},
                {type:'image_url',image_url:{url:imageUrl}}
            ]}
        ]
    };
    const res=await fetch(`${API_BASE}/v1/chat/completions`,{
        method:'POST',
        headers:buildAuthHeaders({'Content-Type':'application/json'}),
        body:JSON.stringify(body)
    });
    if(!res.ok) throw new Error(`Metadata request failed (${res.status})`);
    const data=await res.json();
    const text=data?.choices?.[0]?.message?.content||'';
    const parsed=extractJsonObject(typeof text==='string'?text:JSON.stringify(text));
    if(!parsed) throw new Error('Invalid metadata response');
    return {
        title:sanitizeMetaTitle(parsed.title||titleHint||'Untitled'),
        description:sanitizeMetaDescription(parsed.description||'Image')
    };
}

async function autoGenerateSpace2Metadata(item,{analysisBlob=null,force=false,silent=false}={}){
    if(!item||!item.id) return false;
    if(item.aiMetaState==='loading') return false;
    if(!force&&item.title&&item.description) return false;

    item.aiMetaState='loading';
    item.updatedAt=Date.now();
    saveSpace2State();
    renderSpace2Grid();
    if(space2ItemModal&&space2ActiveItemId===item.id&&!space2ItemModal.classList.contains('hidden')){
        if(space2ItemTitle) space2ItemTitle.value='Generating...';
        if(space2ItemDesc) space2ItemDesc.value='Generating description...';
    }

    try{
        const meta=await requestSpace2AutoMetadata(item,{analysisBlob});
        item.title=meta.title;
        item.description=meta.description;
        item.aiMetaState='ready';
        item.updatedAt=Date.now();
        if(!silent) setSpace2AutoMetaStatus('Image metadata generated.');
        saveSpace2State();
        renderSpace2Grid();
        if(space2ItemModal&&space2ActiveItemId===item.id&&!space2ItemModal.classList.contains('hidden')){
            if(space2ItemTitle) space2ItemTitle.value=item.title||'';
            if(space2ItemDesc) space2ItemDesc.value=item.description||'';
        }
        return true;
    }catch(err){
        console.warn('space2 auto metadata failed',err);
        item.aiMetaState='error';
        item.updatedAt=Date.now();
        if(!silent) setSpace2AutoMetaStatus((err&&err.message)||'Metadata generation failed.',true);
        saveSpace2State();
        renderSpace2Grid();
        return false;
    }
}

async function runBatchAutoMetadata(){
    if(space2AutoMetaRunning) return;
    const items=(space2State&&Array.isArray(space2State.items)?space2State.items:[]).slice();
    if(!items.length){
        setSpace2AutoMetaStatus('No items available for metadata generation.',true);
        return;
    }
    space2AutoMetaRunning=true;
    if(space2AutoMetaRun){
        space2AutoMetaRun.disabled=true;
        space2AutoMetaRun.textContent='Generating...';
    }
    let success=0;
    let failed=0;
    for(let i=0;i<items.length;i++){
        setSpace2AutoMetaStatus(`Generating metadata ${i+1}/${items.length}...`);
        const ok=await autoGenerateSpace2Metadata(items[i],{force:true,silent:true});
        if(ok) success++; else failed++;
    }
    setSpace2AutoMetaStatus(`Done: ${success} updated${failed?`, ${failed} failed`:''}.`,failed>0&&success===0);
    if(space2AutoMetaRun){
        space2AutoMetaRun.disabled=false;
        space2AutoMetaRun.textContent='Regenerate All Items';
    }
    space2AutoMetaRunning=false;
}

function closeCollectionMenu(){
    if(activeCollectionMenu){
        activeCollectionMenu.remove();
        activeCollectionMenu=null;
    }
}

function openCollectionMenu(anchor,{itemId='',discoverItem=null,allowGrid=false,allowDismiss=false,onDismiss=null}={}){
    closeCollectionMenu();
    const menu=document.createElement('div');
    menu.className='collection-dropdown-menu';

    const addOption=(label,action,{active=false,danger=false}={})=>{
        const btn=document.createElement('button');
        btn.type='button';
        btn.className=`collection-dropdown-item${active?' active':''}${danger?' danger':''}`;
        btn.textContent=label;
        btn.addEventListener('click',e=>{
            e.stopPropagation();
            action();
            closeCollectionMenu();
        });
        menu.appendChild(btn);
    };

    if(allowGrid && discoverItem){
        addOption('Add to Grid',()=>{sendDiscoverItem(discoverItem,'grid');});
    }

    if(space2State.collections.length){
        space2State.collections.forEach(col=>{
            const assigned=itemId
                ? !!(space2State.items.find(i=>i.id===itemId)?.collectionIds||[]).includes(col.id)
                : false;
            addOption(col.name,()=>{
                if(itemId){
                    toggleItemCollection(itemId,col.id);
                }else if(discoverItem){
                    sendDiscoverItem(discoverItem,'collection',col.id);
                }
            },{active:assigned});
        });
    }else{
        const empty=document.createElement('div');
        empty.className='collection-dropdown-empty';
        empty.textContent='No collections yet';
        menu.appendChild(empty);
    }

    addOption('+ New Collection',()=>openCollectionModal('create','',discoverItem));

    if(allowDismiss && onDismiss){
        const sep=document.createElement('div');
        sep.className='collection-dropdown-sep';
        menu.appendChild(sep);
        addOption('Dismiss',onDismiss,{danger:true});
    }

    document.body.appendChild(menu);
    const rect=anchor.getBoundingClientRect();
    menu.style.left=`${Math.max(10,rect.left)}px`;
    menu.style.top=`${Math.min(window.innerHeight-10,rect.bottom+8)}px`;
    activeCollectionMenu=menu;
}

function toggleItemCollection(itemId,colId){
    const item=space2State.items.find(i=>i.id===itemId);
    if(!item) return;
    const ids=new Set(item.collectionIds||[]);
    if(ids.has(colId)) ids.delete(colId);
    else ids.add(colId);
    item.collectionIds=[...ids];
    item.updatedAt=Date.now();
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
}

function removeSpace2Collection(colId){
    space2State.collections=space2State.collections.filter(c=>c.id!==colId);
    space2State.items.forEach(item=>{
        item.collectionIds=(item.collectionIds||[]).filter(id=>id!==colId);
    });
    if(space2ActiveCollection===colId) space2ActiveCollection='all';
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
}

function removeItemFromSpace2View(itemId){
    if(!itemId) return;
    if(space2ActiveCollection==='all'){
        space2State.items=space2State.items.filter(i=>i.id!==itemId);
    }else{
        const item=space2State.items.find(i=>i.id===itemId);
        if(!item) return;
        item.collectionIds=(item.collectionIds||[]).filter(id=>id!==space2ActiveCollection);
        item.updatedAt=Date.now();
    }
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
}

function openCollectionModal(mode='create',collectionId='',discoverItem=null){
    space2CollectionModalMode=mode;
    space2CollectionEditingId=collectionId||'';
    if(space2CollectionModalTitle){
        space2CollectionModalTitle.textContent=mode==='rename'?'Rename Collection':'New Collection';
    }
    if(space2CollectionNameInput){
        const existing=space2State.collections.find(c=>c.id===collectionId);
        space2CollectionNameInput.value=existing?.name||'';
        space2CollectionNameInput.dataset.discoverPayload=discoverItem?JSON.stringify({
            src:discoverItem.image||'',
            url:discoverItem.url||'',
            title:discoverItem.title||'',
            desc:discoverItem.desc||''
        }):'';
        requestAnimationFrame(()=>space2CollectionNameInput.focus());
    }
    if(space2CollectionModal) space2CollectionModal.classList.remove('hidden');
}

function closeCollectionModal(){
    if(space2CollectionModal) space2CollectionModal.classList.add('hidden');
    if(space2CollectionNameInput) space2CollectionNameInput.dataset.discoverPayload='';
}

function saveCollectionModal(){
    const name=(space2CollectionNameInput?.value||'').trim();
    if(!name) return;
    if(space2CollectionModalMode==='rename'){
        const col=space2State.collections.find(c=>c.id===space2CollectionEditingId);
        if(col) col.name=name;
    }else{
        const col={id:`col-${Date.now()}-${Math.floor(Math.random()*99999)}`,name};
        space2State.collections.push(col);
        space2ActiveCollection=col.id;
        const payloadRaw=space2CollectionNameInput?.dataset.discoverPayload||'';
        if(payloadRaw){
            try{
                const payload=JSON.parse(payloadRaw);
                sendDiscoverItem({
                    image:payload.src,
                    url:payload.url,
                    title:payload.title,
                    desc:payload.desc,
                },'collection',col.id);
            }catch{}
        }
    }
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
    closeCollectionModal();
}

function renderSpace2Collections(){
    if(!space2Collections) return;
    const allCount=space2State.items.length;
    space2Collections.innerHTML='';

    const allBtn=document.createElement('button');
    allBtn.className=`space2-col-item${space2ActiveCollection==='all'?' active':''}`;
    allBtn.innerHTML=`<span>All Items</span><span>${allCount}</span>`;
    allBtn.addEventListener('click',()=>{
        space2ActiveCollection='all';
        renderSpace2Collections();
        renderSpace2Grid();
    });
    space2Collections.appendChild(allBtn);

    space2State.collections.forEach(col=>{
        const count=space2State.items.filter(i=>(i.collectionIds||[]).includes(col.id)).length;
        const row=document.createElement('div');
        row.className=`space2-col-row${space2ActiveCollection===col.id?' active':''}`;

        const pick=document.createElement('button');
        pick.type='button';
        pick.className=`space2-col-item${space2ActiveCollection===col.id?' active':''}`;
        pick.innerHTML=`<span>${escapeHtml(col.name)}</span><span>${count}</span>`;
        pick.addEventListener('click',()=>{
            space2ActiveCollection=col.id;
            renderSpace2Collections();
            renderSpace2Grid();
        });

        const rename=document.createElement('button');
        rename.type='button';
        rename.className='space2-col-action';
        rename.title='Rename collection';
        rename.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 000-1.42L18.37 3.29a1.003 1.003 0 00-1.42 0l-1.13 1.13 3.75 3.75 1.14-1.13z"/></svg>';
        rename.addEventListener('click',e=>{e.stopPropagation();openCollectionModal('rename',col.id);});

        const remove=document.createElement('button');
        remove.type='button';
        remove.className='space2-col-action';
        remove.title='Delete collection';
        remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3 3v8h2v-8H9zm4 0v8h2v-8h-2zM9 3h6l1 2h4v2H4V5h4l1-2z"/></svg>';
        remove.addEventListener('click',e=>{e.stopPropagation();removeSpace2Collection(col.id);});

        row.appendChild(pick);
        row.appendChild(rename);
        row.appendChild(remove);
        space2Collections.appendChild(row);
    });
}

function renderSpace2Grid(){
    if(!space2Grid) return;
    space2Grid.classList.toggle('feed-mode',space2LayoutMode==='feed');
    const list=getFilteredSpace2Items();
    if(!list.length){
        space2Grid.innerHTML='';
        space2Grid.style.setProperty('--space2-grid-content-height','0px');
        return;
    }
    space2Grid.innerHTML='';
    list.forEach(item=>{
        const isGenerating=item.aiMetaState==='loading';
        const thumbSrc=String(item.src||'').trim();
        const card=document.createElement('button');
        card.type='button';
        card.className='space2-item img-pending';
        card.innerHTML=`
            <img class="space2-thumb" data-src="${escapeHtml(thumbSrc)}" data-cache-key="${escapeHtml(item.id||thumbSrc)}" alt="" loading="lazy" decoding="async">
            <div class="space2-card-action-left">
                <button class="space2-card-action" data-action="meta" title="Regenerate metadata" aria-label="Regenerate metadata">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6V3L8 7l4 4V8c2.21 0 4 1.79 4 4a4 4 0 0 1-6.87 2.83l-1.42 1.42A6 6 0 1 0 12 6zm-4 4a4 4 0 0 1 6.87-2.83l1.42-1.42A6 6 0 1 0 12 18v3l4-4-4-4v3a4 4 0 0 1-4-4z"/></svg>
                </button>
            </div>
            <div class="space2-card-actions">
                <button class="space2-card-action" data-action="collection" title="Add to collection" aria-label="Add to collection">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4l2 2h8a2 2 0 0 1 2 2v2H2V6a2 2 0 0 1 2-2h6zm12 8v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8h20zm-10 2v2H10v2h2v2h2v-2h2v-2h-2v-2h-2z"/></svg>
                </button>
                <button class="space2-card-action" data-action="remove" title="Remove" aria-label="Remove">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3 3v8h2v-8H9zm4 0v8h2v-8h-2zM9 3h6l1 2h4v2H4V5h4l1-2z"/></svg>
                </button>
            </div>
            <div class="space2-meta">
                <div class="space2-name${isGenerating?' is-generating':''}">${isGenerating?'Generating...':(item.title||'Untitled').replace(/</g,'&lt;')}</div>
                <div class="space2-desc${isGenerating?' is-generating':''}">${isGenerating?'Generating description...':((item.description||'').replace(/</g,'&lt;')||'Image')}</div>
            </div>
        `;
        const img=card.querySelector('.space2-thumb');
        const desc=card.querySelector('.space2-desc');
        if(img){
            const onLoaded=()=>{
                card.classList.remove('img-pending');
                card.classList.add('img-loaded');
                if(desc&&!item.description&&item.aiMetaState!=='loading'&&img.naturalWidth&&img.naturalHeight){
                    desc.textContent=`${img.naturalWidth} x ${img.naturalHeight}`;
                }
                scheduleSpace2GridLayout();
            };
            if(img.dataset.loaded==='1'&&img.complete&&img.naturalWidth) onLoaded();
            else img.addEventListener('load',onLoaded,{once:true});
            img.addEventListener('error',()=>{
                card.classList.remove('img-pending');
                card.classList.add('img-loaded');
                scheduleSpace2GridLayout();
            },{once:true});
            observeSpace2LazyImage(img);
        }
        card.addEventListener('click',()=>openSpace2Item(item.id));
        const collectionBtn=card.querySelector('[data-action="collection"]');
        if(collectionBtn){
            collectionBtn.addEventListener('click',e=>{
                e.stopPropagation();
                openCollectionMenu(collectionBtn,{itemId:item.id});
            });
        }
        const removeBtn=card.querySelector('[data-action="remove"]');
        if(removeBtn){
            const removeTitle=space2ActiveCollection==='all'?'Delete from all items':'Remove from this collection';
            removeBtn.title=removeTitle;
            removeBtn.setAttribute('aria-label',removeTitle);
            removeBtn.addEventListener('click',e=>{
                e.stopPropagation();
                removeItemFromSpace2View(item.id);
            });
        }
        const metaBtn=card.querySelector('[data-action="meta"]');
        if(metaBtn){
            metaBtn.addEventListener('click',async e=>{
                e.stopPropagation();
                await autoGenerateSpace2Metadata(item,{force:true});
            });
        }
        space2Grid.appendChild(card);
    });
    layoutSpace2Grid();         // sync pass: cards at correct positions from frame 0
    scheduleSpace2GridLayout(); // RAF pass: re-measures after browser layout pass
}

function getSpace2GridColumnCount(){
    if(space2LayoutMode==='feed') return 1;
    if(space2ColumnsSetting!=='auto'){
        const manual=Math.max(1,Math.min(5,parseInt(space2ColumnsSetting,10)||2));
        return manual;
    }
    if(window.innerWidth<=760) return 2;
    if(window.innerWidth<=1180) return 2;
    if(window.innerWidth<=1560) return 3;
    if(window.innerWidth<=1980) return 4;
    return 5;
}

function scheduleSpace2GridLayout(){
    if(!space2Grid) return;
    if(space2LayoutFrame) cancelAnimationFrame(space2LayoutFrame);
    space2LayoutFrame=requestAnimationFrame(()=>{
        space2LayoutFrame=0;
        layoutSpace2Grid();
    });
}

function layoutSpace2Grid(){
    if(!space2Grid) return;
    const cards=[...space2Grid.querySelectorAll('.space2-item')];
    if(!cards.length){
        space2Grid.style.setProperty('--space2-grid-content-height','0px');
        return;
    }
    const styles=window.getComputedStyle(space2Grid);
    const paddingLeft=parseFloat(styles.paddingLeft)||0;
    const paddingRight=parseFloat(styles.paddingRight)||0;
    const paddingTop=parseFloat(styles.paddingTop)||0;
    const paddingBottom=parseFloat(styles.paddingBottom)||0;
    const gap=parseFloat(styles.getPropertyValue('--space2-grid-gap'))||16;
    const columnCount=getSpace2GridColumnCount();
    const innerWidth=Math.max(0,space2Grid.clientWidth-paddingLeft-paddingRight);
    const cardWidth=Math.max(0,(innerWidth-gap*(columnCount-1))/columnCount);
    const columnHeights=Array(columnCount).fill(paddingTop);

    cards.forEach(card=>{
        card.style.width=`${cardWidth}px`;
        let targetColumn=0;
        for(let idx=1;idx<columnHeights.length;idx++){
            if(columnHeights[idx]<columnHeights[targetColumn]) targetColumn=idx;
        }
        const left=paddingLeft+targetColumn*(cardWidth+gap);
        const top=columnHeights[targetColumn];
        card.style.left=`${left}px`;
        card.style.top=`${top}px`;
        columnHeights[targetColumn]=top+card.offsetHeight+gap;
    });

    const contentHeight=Math.max(...columnHeights)-gap+paddingBottom;
    space2Grid.style.setProperty('--space2-grid-content-height',`${Math.max(contentHeight,0)}px`);
}

// ── IndexedDB image blob cache — prevents re-downloading images on every reload ──
const _IMG_CACHE_DB='asq-img-cache';
const _IMG_CACHE_STORE='blobs';
let _imgCacheDb=null;
function _openImgCacheDb(){
    if(_imgCacheDb) return Promise.resolve(_imgCacheDb);
    return new Promise((resolve,reject)=>{
        const req=indexedDB.open(_IMG_CACHE_DB,1);
        req.onupgradeneeded=e=>{
            const db=e.target.result;
            if(!db.objectStoreNames.contains(_IMG_CACHE_STORE)) db.createObjectStore(_IMG_CACHE_STORE);
        };
        req.onsuccess=e=>{_imgCacheDb=e.target.result;resolve(_imgCacheDb);};
        req.onerror=()=>reject(req.error);
    });
}
async function _getCachedImgBlob(key){
    try{
        const db=await _openImgCacheDb();
        return new Promise(resolve=>{
            const req=db.transaction(_IMG_CACHE_STORE,'readonly').objectStore(_IMG_CACHE_STORE).get(key);
            req.onsuccess=()=>resolve(req.result||null);
            req.onerror=()=>resolve(null);
        });
    }catch{return null;}
}
async function _setCachedImgBlob(key,blob){
    try{
        const db=await _openImgCacheDb();
        return new Promise(resolve=>{
            const tx=db.transaction(_IMG_CACHE_STORE,'readwrite');
            tx.objectStore(_IMG_CACHE_STORE).put(blob,key);
            tx.oncomplete=()=>resolve();
            tx.onerror=()=>resolve();
        });
    }catch{}
}
async function _loadImgWithBlobCache(img,url,cacheKey){
    if(!url) return;
    const cached=await _getCachedImgBlob(cacheKey);
    if(cached){
        img.src=URL.createObjectURL(cached);
        return;
    }
    try{
        const resp=await fetch(url);
        if(!resp.ok){img.src=url;return;}
        const rawBlob=await resp.blob();
        // compress on first fetch before caching — existing cloud images get compressed locally
        const blob=await _compressImageBlob(rawBlob).catch(()=>rawBlob);
        _setCachedImgBlob(cacheKey,blob).catch(()=>{});
        img.src=URL.createObjectURL(blob);
    }catch{
        img.src=url;
    }
}

function ensureSpace2LazyImageObserver(){
    if(space2LazyImageObserver||typeof IntersectionObserver==='undefined') return;
    space2LazyImageObserver=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
            if(!entry.isIntersecting) return;
            const img=entry.target;
            const src=(img&&img.dataset&&img.dataset.src||'').trim();
            if(src&&img.dataset.loaded!=='1'){
                img.dataset.loaded='1';
                const cacheKey=img.dataset.cacheKey||src;
                _loadImgWithBlobCache(img,src,cacheKey).catch(()=>{img.src=src;});
            }
            space2LazyImageObserver.unobserve(img);
        });
    },{
        root:space2Grid||null,
        rootMargin:'460px 0px',
        threshold:0.01
    });
}

function observeSpace2LazyImage(img){
    if(!img) return;
    const src=(img.dataset&&img.dataset.src||'').trim();
    if(!src) return;
    if(typeof IntersectionObserver==='undefined'){
        img.dataset.loaded='1';
        const cacheKey=img.dataset.cacheKey||src;
        _loadImgWithBlobCache(img,src,cacheKey).catch(()=>{img.src=src;});
        return;
    }
    ensureSpace2LazyImageObserver();
    if(space2LazyImageObserver) space2LazyImageObserver.observe(img);
}

function openSpace2Item(itemId){
    const item=space2State.items.find(i=>i.id===itemId);
    if(!item) return;
    space2ActiveItemId=itemId;
    if(space2ItemPreview) space2ItemPreview.innerHTML=`<img src="${item.src}" alt="">`;
    if(space2ItemTitle) space2ItemTitle.value=item.title||'';
    if(space2ItemDesc) space2ItemDesc.value=item.description||'';
    if(space2AssignList){
        space2AssignList.innerHTML='';
        space2State.collections.forEach(col=>{
            const label=document.createElement('button');
            label.type='button';
            label.className='space2-check';
            label.dataset.colId=col.id;
            const checked=(item.collectionIds||[]).includes(col.id);
            if(checked) label.classList.add('active');
            label.innerHTML=`<span class="space2-check-ind">✓</span><span>${col.name}</span>`;
            label.addEventListener('click',()=>label.classList.toggle('active'));
            space2AssignList.appendChild(label);
        });
    }
    if(space2ItemModal) space2ItemModal.classList.remove('hidden');
}

function closeSpace2Item(){
    space2ActiveItemId='';
    if(space2ItemModal) space2ItemModal.classList.add('hidden');
}

function saveSpace2Item(){
    const item=space2State.items.find(i=>i.id===space2ActiveItemId);
    if(!item) return;
    item.title=(space2ItemTitle&&space2ItemTitle.value||'').trim()||'Untitled';
    item.description=(space2ItemDesc&&space2ItemDesc.value||'').trim();
    const selectedCols=space2AssignList
        ? [...space2AssignList.querySelectorAll('.space2-check.active')].map(i=>i.dataset.colId).filter(Boolean)
        : [];
    item.collectionIds=selectedCols;
    item.updatedAt=Date.now();
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
    closeSpace2Item();
}

function deleteSpace2Item(){
    if(!space2ActiveItemId) return;
    space2State.items=space2State.items.filter(i=>i.id!==space2ActiveItemId);
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
    closeSpace2Item();
}

function createSpace2Collection(){
    openCollectionModal('create');
}

function insertSpace2Item(item,{collectionIds}={}){
    const src=item&&item.src||'';
    if(!src) return {item:null,added:false,changed:false};
    const filePath=item.filePath||'';
    const cloudPath=item.cloudPath||'';
    const signedUrlExpiresAt=parseInt(item.signedUrlExpiresAt||0,10)||0;
    const existing=space2State.items.find(i=>(filePath&&i.filePath===filePath)||i.src===src);
    const normalizedCollectionIds=Array.isArray(collectionIds)
        ? [...new Set(collectionIds.filter(Boolean))]
        : (space2ActiveCollection==='all'?[]:[space2ActiveCollection]);
    if(existing){
        const currentIds=Array.isArray(existing.collectionIds)?existing.collectionIds:[];
        const mergedIds=[...new Set([...currentIds,...normalizedCollectionIds])];
        const hasCloudUpdate=!!(cloudPath&&existing.cloudPath!==cloudPath);
        const hasExpUpdate=!!(signedUrlExpiresAt&&existing.signedUrlExpiresAt!==signedUrlExpiresAt);
        const changed=mergedIds.length!==currentIds.length||hasCloudUpdate||hasExpUpdate;
        if(changed){
            existing.collectionIds=mergedIds;
            if(hasCloudUpdate) existing.cloudPath=cloudPath;
            if(hasExpUpdate) existing.signedUrlExpiresAt=signedUrlExpiresAt;
            existing.updatedAt=Date.now();
        }
        return {item:existing,added:false,changed};
    }
    const now=Date.now();
    const created={
        id:`item-${now}-${Math.floor(Math.random()*99999)}`,
        src,
        filePath,
        cloudPath,
        signedUrlExpiresAt,
        title:item.title||(filePath?filePath.split('/').pop():'Untitled'),
        description:item.description||'',
        collectionIds:normalizedCollectionIds,
        createdAt:now,
        updatedAt:now
    };
    space2State.items.unshift(created);
    return {item:created,added:true,changed:true};
}

function upsertSpace2Items(items,{openEditor=false}={}){
    if(!Array.isArray(items)||!items.length) return 0;
    let added=0;
    let changed=false;
    let firstAddedItemId='';
    const autoMetaQueue=[];
    items.forEach((item,idx)=>{
        const inserted=insertSpace2Item({
            ...item,
            title:item.title||((item.filePath||'').split('/').pop()||`Image ${idx+1}`)
        });
        if(inserted.added){
            added++;
            if(!firstAddedItemId&&inserted.item&&inserted.item.id) firstAddedItemId=inserted.item.id;
            if(space2AutoMetaEnabled&&inserted.item){
                autoMetaQueue.push({item:inserted.item,analysisBlob:item.analysisBlob||null});
            }
        }
        if(inserted.changed) changed=true;
    });
    if(!changed) return 0;
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
    if(autoMetaQueue.length){
        setSpace2AutoMetaStatus(`Generating metadata for ${autoMetaQueue.length} new item${autoMetaQueue.length>1?'s':''}...`);
        autoMetaQueue.forEach(({item,analysisBlob})=>{
            autoGenerateSpace2Metadata(item,{analysisBlob,force:true,silent:true})
                .finally(()=>{
                    const pending=space2State.items.filter(i=>i.aiMetaState==='loading').length;
                    if(!pending) setSpace2AutoMetaStatus('Auto metadata complete.');
                });
        });
    }
    if(openEditor&&firstAddedItemId) openSpace2Item(firstAddedItemId);
    return added;
}

function sendDiscoverItem(item,target,collectionId=''){
    if(!item||!item.image) return 'idle';
    const payload={
        src:item.image,
        filePath:item.url||'',
        title:item.title||'Discover item',
        description:item.desc||''
    };
    if(target==='grid'){
        const inserted=insertSpace2Item(payload,{collectionIds:[]});
        if(!inserted.changed) return 'grid';
        saveSpace2State();
        renderSpace2Collections();
        renderSpace2Grid();
        return 'grid';
    }
    const activeCollectionIds=collectionId
        ? [collectionId]
        : (space2ActiveCollection!=='all'?[space2ActiveCollection]:[]);
    const inserted=insertSpace2Item(payload,{collectionIds:activeCollectionIds});
    saveSpace2State();
    renderSpace2Collections();
    renderSpace2Grid();
    if(activeCollectionIds.length) return inserted.added?'collection':'collection';
    if(inserted.item) openSpace2Item(inserted.item.id);
    return 'collections';
}

function importSelectionToSpace2(silent=false){
    const nodes=getSelectedImageNodes();
    if(!nodes.length){
        if(!silent) window.alert('Select one or more image nodes first.');
        return 0;
    }
    const items=nodes.map((node,idx)=>({
        src:getNodeImageUrl(node),
        filePath:node.dataset.filePath||'',
        title:(node.dataset.filePath||'').split('/').pop()||`Image ${idx+1}`
    }));
    return upsertSpace2Items(items);
}

async function importFilesToSpace2(files,{openEditor=false}={}){
    const list=[...(files||[])].filter(f=>f&&f.type&&f.type.startsWith('image/'));
    if(!list.length) return;
    const items=[];
    for(const f of list){
        let src='';
        let filePath='';
        let cloudPath='';
        let signedUrlExpiresAt=0;
        if(f.path){
            filePath=f.path;
            src=toFileUrl(f.path);
        }else{
            const persisted=await persistGeneratedBlob(f,'grid_upload').catch(()=> '');
            if(persisted){
                filePath=persisted;
                src=toFileUrl(persisted);
            }else{
                src=URL.createObjectURL(f);
            }
        }
        if(currentSupabaseUser){
            try{
                const uploaded=await uploadBlobToSupabase(f,{folder:'space2',nameHint:f.name||'capture'});
                if(uploaded&&uploaded.path){
                    cloudPath=uploaded.path;
                    if(uploaded.url) src=uploaded.url;
                }
                if(uploaded&&uploaded.expiresAt) signedUrlExpiresAt=uploaded.expiresAt;
            }catch(err){
                console.warn('space2 upload sync failed',err);
            }
        }
        if(!src) continue;
        items.push({src,filePath,title:f.name||'Upload',cloudPath,signedUrlExpiresAt,analysisBlob:f});
    }
    upsertSpace2Items(items,{openEditor});
}

function initSpace2GridDropzone(){
    if(!space2Grid) return;

    const setDragState=(active)=>{
        if(space2View!=='grid') return;
        space2Grid.classList.toggle('is-drag-over',!!active);
    };

    space2Grid.addEventListener('dragenter',e=>{
        if(space2View!=='grid') return;
        e.preventDefault();
        setDragState(true);
    });

    space2Grid.addEventListener('dragover',e=>{
        if(space2View!=='grid') return;
        e.preventDefault();
        e.dataTransfer.dropEffect='copy';
        setDragState(true);
    });

    space2Grid.addEventListener('dragleave',e=>{
        if(space2View!=='grid') return;
        if(space2Grid.contains(e.relatedTarget)) return;
        setDragState(false);
    });

    space2Grid.addEventListener('drop',async e=>{
        if(space2View!=='grid') return;
        e.preventDefault();
        setDragState(false);
        const files=e.dataTransfer?.files;
        if(files&&files.length) await importFilesToSpace2(files);
    });
}

function setSpace2SidebarWidth(width,{persist=true}={}){
    const clamped=Math.max(170,Math.min(380,Math.round(width||238)));
    space2SidebarWidth=clamped;
    if(space2Panel) space2Panel.style.setProperty('--space2-sidebar-width',`${clamped}px`);
    if(persist) localStorage.setItem('asq.space2.sidebar.width',String(clamped));
    if(currentSpace==='space2'&&space2View==='grid'){
        scheduleSpace2GridLayout();
        setTimeout(scheduleSpace2GridLayout,190);
    }
}

function setSpace2CollectionsOpen(open,{skipPersist=false}={}){
    space2CollectionsOpen=!!open;
    if(space2Panel) space2Panel.classList.toggle('sidebar-collapsed',!space2CollectionsOpen);
    if(space2Sidebar) space2Sidebar.setAttribute('aria-hidden',space2CollectionsOpen?'false':'true');
    if(!skipPersist) localStorage.setItem('asq.space2.sidebar.open',space2CollectionsOpen?'1':'0');
    if(space2CollectionsOpen) setSpace2SidebarWidth(space2SidebarWidth,{persist:!skipPersist});
    if(currentSpace==='space2'&&space2View==='grid'){
        scheduleSpace2GridLayout();
        setTimeout(scheduleSpace2GridLayout,220);
    }
}

function updateControlCornerState(){
    const workflowDock=document.getElementById('workflow-dock');
    const boardDock=document.getElementById('board-dock');
    if(workflowDock){
        workflowDock.classList.toggle('hidden',currentSpace!=='space1');
    }
    if(boardDock){
        boardDock.classList.toggle('hidden',currentSpace==='space2');
    }
    if(space2ViewSwitch){
        space2ViewSwitch.classList.toggle('hidden',currentSpace!=='space2');
    }
}

function initSpace2SidebarSizing(){
    if(!space2Sash||!space2Panel) return;
    setSpace2SidebarWidth(space2SidebarWidth,{persist:false});
    const restoreOpen=window.innerWidth>760&&((localStorage.getItem('asq.space2.sidebar.open')||'0')==='1');
    setSpace2CollectionsOpen(restoreOpen,{skipPersist:true});
    space2Sash.addEventListener('click',(e)=>{
        e.preventDefault();
        setSpace2CollectionsOpen(!space2CollectionsOpen);
    });
}

function restoreSpace2MobileLayoutSlot(el){
    if(!el) return;
    const slot=space2MobileLayoutSlots.get(el);
    if(!slot||!slot.parent) return;
    if(slot.next&&slot.next.parentElement===slot.parent) slot.parent.insertBefore(el,slot.next);
    else slot.parent.appendChild(el);
}

function applySpace2MobileHeaderLayout(){
    const isMobile=window.innerWidth<=760;
    const inSpace2=currentSpace==='space2';

    if(isMobile&&inSpace2){
        if(space2SidebarHead&&space2ViewSwitch&&space2ViewSwitch.parentElement!==space2SidebarHead){
            space2SidebarHead.appendChild(space2ViewSwitch);
        }
        if(space2SidebarHead&&space2SearchWrap&&space2SearchWrap.parentElement!==space2SidebarHead){
            space2SidebarHead.appendChild(space2SearchWrap);
        }
    }else{
        [space2ViewSwitch,space2SearchWrap].forEach(restoreSpace2MobileLayoutSlot);
    }

    // Theme toggle always visible, regardless of space
}

function openSpace2SettingsModal(){
    if(space2CaptureStatus) space2CaptureStatus.textContent='';
    updateSpace2LayoutSettingsUI();
    if(space2AutoMetaToggle) space2AutoMetaToggle.checked=space2AutoMetaEnabled;
    setSpace2AutoMetaStatus(space2AutoMetaEnabled?'Auto metadata is enabled for new uploads.':'Auto metadata is disabled.');
    if(space2SettingsModal) space2SettingsModal.classList.remove('hidden');
}

function closeSpace2SettingsModal(){
    if(space2SettingsModal) space2SettingsModal.classList.add('hidden');
}

function updateSpace2LayoutSettingsUI(){
    if(space2LayoutGridBtn) space2LayoutGridBtn.classList.toggle('primary',space2LayoutMode==='grid');
    if(space2LayoutFeedBtn) space2LayoutFeedBtn.classList.toggle('primary',space2LayoutMode==='feed');
    if(space2ColumnsSelect) space2ColumnsSelect.value=space2ColumnsSetting;
}

function applySpace2LayoutSettings({persist=true}={}){
    if(space2ColumnsSetting!=='auto'&&!/^[1-5]$/.test(String(space2ColumnsSetting))){
        space2ColumnsSetting='auto';
    }
    if(persist){
        localStorage.setItem('asq.space2.layout.mode',space2LayoutMode);
        localStorage.setItem('asq.space2.layout.columns',space2ColumnsSetting);
    }
    updateSpace2LayoutSettingsUI();
    if(space2Grid) space2Grid.classList.toggle('feed-mode',space2LayoutMode==='feed');
    renderSpace2Grid();
}

async function requestSpace2CapturePermission({silent=false}={}){
    if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){
        if(!silent&&space2CaptureStatus) space2CaptureStatus.textContent='Screen capture is not available in this environment.';
        return false;
    }
    if(!silent&&space2CaptureStatus) space2CaptureStatus.textContent='Requesting macOS screen capture access...';

    const openMacScreenSettings=()=>{
        if(!IS_MAC_APP) return;
        const deepLink='x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';
        try{
            if(electronShell&&typeof electronShell.openExternal==='function'){
                electronShell.openExternal(deepLink);
                return;
            }
        }catch{}
        try{ nodeChildProcess && nodeChildProcess.exec(`open \"${deepLink}\"`); }catch{}
    };

    try{
        if(IS_MAC_APP && electronSystemPreferences && typeof electronSystemPreferences.getMediaAccessStatus==='function'){
            const status=String(electronSystemPreferences.getMediaAccessStatus('screen')||'').toLowerCase();
            if(status==='granted'){
                if(!silent&&space2CaptureStatus) space2CaptureStatus.textContent='Access already granted.';
                return true;
            }
        }
    }catch{}

    let stream=null;
    try{
        stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
        stream.getTracks().forEach(t=>t.stop());
        if(!silent&&space2CaptureStatus) space2CaptureStatus.textContent='Access granted. You can now use region capture.';
        return true;
    }catch(err){
        console.warn('space2 capture permission request failed',err);
        if(!silent&&space2CaptureStatus){
            space2CaptureStatus.textContent='Permission denied. Opening macOS Screen Recording settings...';
        }
        openMacScreenSettings();
        return false;
    }finally{
        if(stream) stream.getTracks().forEach(t=>t.stop());
    }
}

function maybeAutoRequestSpace2CapturePermission(){
    if(space2CapturePermissionBootAttempted) return;
    space2CapturePermissionBootAttempted=true;
    requestSpace2CapturePermission({silent:true});
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
    if(undoStack.length>300) undoStack.shift();
    redoStack=[];
    updateHistoryButtons();
}

function updateHistoryButtons(){
    // Keyboard shortcuts are the primary history controls in this UI.
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
    renderBoardQuickMenu();
}

function renderBoardQuickMenu(){
    if(!boardFanGrid) return;
    boardFanGrid.innerHTML='';
    boards.forEach((b,idx)=>{
        const btn=document.createElement('button');
        btn.className=`board-fan-btn${b.id===currentBoardId?' active':''}`;
        btn.title=b.name;
        btn.textContent=String(idx+1);
        btn.addEventListener('click',e=>{
            e.stopPropagation();
            switchBoard(b.id);
            closeBoardQuickMenu();
        });
        boardFanGrid.appendChild(btn);
    });
    const addBtn=document.createElement('button');
    addBtn.className='board-fan-btn';
    addBtn.title='New Board';
    addBtn.textContent='+';
    addBtn.addEventListener('click',e=>{
        e.stopPropagation();
        newBoard();
        closeBoardQuickMenu();
    });
    boardFanGrid.appendChild(addBtn);
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
        ui:{appMode,currentModel,genW,genH,isDark,currentSpace},
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
        scheduleCloudSync(760);
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
        if(ui.currentSpace) setSpace(ui.currentSpace);
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
    saveSpace2State();
    currentProjectKey=key;
    const meta=readBoards(currentProjectKey);
    boards=meta.boards;
    currentBoardId=meta.currentBoardId;
    renderBoardList();
    const hasSaved=!!localStorage.getItem(getStorageKey(currentProjectKey,currentBoardId));
    if(hasSaved) loadBoardState(currentProjectKey,currentBoardId);
    else clearCanvasNodes();
    space2SearchText='';
    space2ActiveCollection='all';
    if(space2Search) space2Search.value='';
    loadSpace2State(currentProjectKey,currentBoardId);
    if(currentSupabaseUser){
        restoreStateFromSupabase().catch(err=>console.warn('cloud context restore failed',err));
    }
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
    loadSpace2State(currentProjectKey,currentBoardId);
    recoverCanvasIfEmpty(currentProjectKey);
    persistenceReady=true;
    captureHistorySnapshot();

    // Switch project context only on regaining focus (safe, non-destructive).
    window.addEventListener('focus',()=>{switchProjectContextIfNeeded();});
    window.addEventListener('beforeunload',()=>{saveProjectState();saveSpace2State();if(projectPollTimer)clearInterval(projectPollTimer);});

    // Any canvas/content mutation schedules a debounced save.
    const observer=new MutationObserver(()=>{schedulePersist(350);scheduleHistoryCapture(350);renderFavoritesStrip();});
    observer.observe(canvas,{childList:true,subtree:true,attributes:true,characterData:true});
    aiInput.addEventListener('input',()=>schedulePersist(500));
}

async function bootstrapAppAfterAuth(){
    if(appBootstrapped) return;
    appBootstrapped=true;
    if(ENABLE_PROJECT_PERSISTENCE){
        await initPersistence();
        if(currentSupabaseUser){
            await restoreStateFromSupabase();
            pendingSpace2CloudLoad=false;
        }
    }
}

function lockAppForAuth(){
    document.body.classList.add('auth-locked');
    if(authScreen) authScreen.classList.remove('hidden');
}

function unlockAppAfterAuth(){
    document.body.classList.remove('auth-locked');
    if(authScreen) authScreen.classList.add('hidden');
}

function bindAuthUi(){
    if(!authPasscodeForm||!authEmailForm||!authOtpForm) return;

    authPasscodeForm.addEventListener('submit',e=>{
        e.preventDefault();
        const entered=(authPasscodeInput?.value||'').trim();
        if(entered!==APP_PASSCODE){
            setAuthStatus('Invalid passcode. Try again.',true);
            return;
        }
        showAuthStep('email');
        setAuthStatus('Passcode accepted. Enter your email to continue.');
        if(authEmailInput) authEmailInput.focus();
    });

    authEmailForm.addEventListener('submit',async e=>{
        e.preventDefault();
        const client=initSupabaseClient();
        if(!client){
            setAuthStatus('Supabase client failed to initialize.',true);
            return;
        }
        const email=(authEmailInput?.value||'').trim().toLowerCase();
        if(!email||!email.includes('@')){
            setAuthStatus('Enter a valid email address.',true);
            return;
        }
        currentAuthEmail=email;
        setAuthStatus('Sending login email...');
        const {error}=await client.auth.signInWithOtp({
            email,
            options:{
                shouldCreateUser:true
            }
        });
        if(error){
            setAuthStatus(error.message||'Unable to send login email.',true);
            return;
        }
        showAuthStep('otp');
        setAuthStatus('Check your email for a 6-digit code.');
        if(authOtpInput) authOtpInput.focus();
    });

    authOtpForm.addEventListener('submit',async e=>{
        e.preventDefault();
        const client=initSupabaseClient();
        if(!client||!currentAuthEmail){
            setAuthStatus('Missing email session. Try again.',true);
            showAuthStep('email');
            return;
        }
        const token=(authOtpInput?.value||'').trim();
        if(token.length<6){
            setAuthStatus('Enter the full 6-digit code from your email.',true);
            return;
        }
        setAuthStatus('Verifying code...');
        const {data,error}=await client.auth.verifyOtp({email:currentAuthEmail,token,type:'email'});
        if(error||!data?.session){
            setAuthStatus((error&&error.message)||'Invalid code. Please try again.',true);
            return;
        }
        setAuthStatus('Signed in. Loading workspace...');
    });

    if(authChangeEmailBtn){
        authChangeEmailBtn.addEventListener('click',()=>{
            showAuthStep('email');
            setAuthStatus('Enter another email to receive a code.');
            if(authOtpInput) authOtpInput.value='';
            if(authEmailInput) authEmailInput.focus();
        });
    }
}

async function initAuthGate(){
    lockAppForAuth();
    bindAuthUi();
    showAuthStep('passcode');
    setAuthStatus('Enter your passcode to continue.');
    if(authPasscodeInput) authPasscodeInput.focus();

    const client=initSupabaseClient();
    if(!client){
        setAuthStatus('Auth unavailable. Running local mode only.',true);
        return;
    }

    client.auth.onAuthStateChange((event,session)=>{
        currentSupabaseUser=session&&session.user?session.user:null;
        if(currentSupabaseUser){
            setAuthStatus(`Signed in as ${currentSupabaseUser.email||'user'}. Preparing workspace...`);
            unlockAppAfterAuth();
            bootstrapAppAfterAuth().catch(err=>console.warn('boot after auth failed',err));
        }else if(event==='SIGNED_OUT'){
            appBootstrapped=false;
            lockAppForAuth();
            showAuthStep('passcode');
            setAuthStatus('Signed out. Enter passcode to continue.');
        }
    });

    const {data,error}=await client.auth.getSession();
    if(error){
        setAuthStatus('Could not check existing session. Continue manually.',true);
        return;
    }
    if(data&&data.session&&data.session.user){
        currentSupabaseUser=data.session.user;
        setAuthStatus(`Restoring session for ${currentSupabaseUser.email||'user'}...`);
        unlockAppAfterAuth();
        await bootstrapAppAfterAuth();
    }
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
window.addEventListener('resize',()=>{
    fitViewportToVisibleArea();
    applySpace2MobileHeaderLayout();
});
if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>{
        fitViewportToVisibleArea();
        applySpace2MobileHeaderLayout();
    });
    window.visualViewport.addEventListener('scroll',fitViewportToVisibleArea);
}

setTimeout(fitViewportToVisibleArea,120);
setTimeout(fitViewportToVisibleArea,420);
setTimeout(fitViewportToVisibleArea,1200);
setTimeout(applySpace2MobileHeaderLayout,0);
setTimeout(()=>{const r=viewport.getBoundingClientRect();setT(r.width/2,r.height/2,1);},0);
window.addEventListener('resize',scheduleSpace2GridLayout);

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
    genBtn.textContent=editMode?'Edit selected images':'Create';
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
function isTextEditingTarget(target){
    if(!target) return false;
    if(target.isContentEditable) return true;
    const tag=(target.tagName||'').toUpperCase();
    return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT';
}

window.addEventListener('keydown',e=>{
    const key=(e.key||'').toLowerCase();
    const hasModifier=e.metaKey||e.ctrlKey;
    const isTextTarget=isTextEditingTarget(e.target);

    if(hasModifier&&!e.shiftKey&&key==='z'&&!isTextTarget){
        e.preventDefault();
        undo();
        return;
    }

    const wantsRedo=(hasModifier&&e.shiftKey&&key==='z')||(hasModifier&&key==='y');
    if(wantsRedo&&!isTextTarget){
        e.preventDefault();
        redo();
        return;
    }

    const isPromptTarget=e.target===aiInput;
    if(e.key==='Tab'&&!e.target.isContentEditable&&(isPromptTarget||(e.target.tagName!=='INPUT'&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='SELECT'))){
        e.preventDefault();
        cycleSpace(e.shiftKey?-1:1);
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
const syntheticPointerBridge={id:null,target:null,lastX:0,lastY:0};
function dispatchSyntheticMouseEvent(type,target,{clientX,clientY,ctrlKey=false,shiftKey=false}={}){
    const evt=new MouseEvent(type,{bubbles:true,cancelable:true,clientX,clientY,button:0,buttons:type==='mouseup'?0:1,ctrlKey,shiftKey});
    (target||window).dispatchEvent(evt);
}
function releaseSyntheticPointerBridge(){
    if(syntheticPointerBridge.id===null) return;
    dispatchSyntheticMouseEvent('mouseup',window,{clientX:syntheticPointerBridge.lastX,clientY:syntheticPointerBridge.lastY});
    syntheticPointerBridge.id=null;
    syntheticPointerBridge.target=null;
}
function isCanvasInputTarget(target){
    return target===viewport||target===canvas||(target&&target.closest&&target.closest('.canvas-node'));
}
function isSpace2CaptureTarget(target){
    return !!(space2CaptureOverlay&&(target===space2CaptureOverlay||(target&&target.closest&&target.closest('#space2-capture-overlay'))));
}
document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse') return;
    if(e.pointerType==='touch'&&syntheticPointerBridge.id!==null&&e.pointerId!==syntheticPointerBridge.id){
        releaseSyntheticPointerBridge();
        return;
    }
    const target=e.target;
    const canvasTarget=isCanvasInputTarget(target);
    const captureTarget=isSpace2CaptureTarget(target);
    if(!canvasTarget&&!captureTarget) return;
    if(e.pointerType==='touch'&&!e.isPrimary) return;
    e.preventDefault();
    syntheticPointerBridge.id=e.pointerId;
    syntheticPointerBridge.target=target;
    syntheticPointerBridge.lastX=e.clientX;
    syntheticPointerBridge.lastY=e.clientY;
    const ctrlKey=(target===viewport||target===canvas)&&e.pointerType==='touch';
    dispatchSyntheticMouseEvent('mousedown',captureTarget?target:(target===viewport||target===canvas?viewport:target),{clientX:e.clientX,clientY:e.clientY,ctrlKey,shiftKey:e.shiftKey});
},{passive:false,capture:true});
document.addEventListener('pointermove',e=>{
    if(e.pointerId!==syntheticPointerBridge.id) return;
    e.preventDefault();
    syntheticPointerBridge.lastX=e.clientX;
    syntheticPointerBridge.lastY=e.clientY;
    dispatchSyntheticMouseEvent('mousemove',window,{clientX:e.clientX,clientY:e.clientY,shiftKey:e.shiftKey});
},{passive:false,capture:true});
document.addEventListener('pointerup',e=>{
    if(e.pointerId!==syntheticPointerBridge.id) return;
    e.preventDefault();
    syntheticPointerBridge.lastX=e.clientX;
    syntheticPointerBridge.lastY=e.clientY;
    releaseSyntheticPointerBridge();
},{passive:false,capture:true});
document.addEventListener('pointercancel',e=>{
    if(e.pointerId!==syntheticPointerBridge.id) return;
    e.preventDefault();
    releaseSyntheticPointerBridge();
},{passive:false,capture:true});
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
    updateCanvasInteraction(e.clientX,e.clientY);
});

window.addEventListener('mouseup',()=>{
    finishCanvasInteraction();
});

window.addEventListener('pointermove',e=>{
    if(e.pointerType==='mouse'||activeCanvasPointerId===null||e.pointerId!==activeCanvasPointerId) return;
    e.preventDefault();
    updateCanvasInteraction(e.clientX,e.clientY);
},{passive:false});

window.addEventListener('pointerup',e=>{
    if(e.pointerType==='mouse'||activeCanvasPointerId===null||e.pointerId!==activeCanvasPointerId) return;
    e.preventDefault();
    finishCanvasInteraction();
    clearActiveCanvasPointer(e.pointerId,e.target);
},{passive:false});

window.addEventListener('pointercancel',e=>{
    if(e.pointerType==='mouse'||activeCanvasPointerId===null||e.pointerId!==activeCanvasPointerId) return;
    e.preventDefault();
    finishCanvasInteraction();
    clearActiveCanvasPointer(e.pointerId,e.target);
},{passive:false});

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
        '#media-browser-modal .mb-main, #media-browser-modal .mb-sidebar, #media-browser-modal .mb-grid, .model-dropdown, .size-dropdown, .bar-extra-menu, #board-panel, .settings-card, .move-board-list, .note-content, #space2-panel, #space2-item-modal'
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

function setActiveCanvasPointer(pointerId, owner){
    activeCanvasPointerId = pointerId;
    if(owner && owner.setPointerCapture){
        try{ owner.setPointerCapture(pointerId); }catch{}
    }
}

function clearActiveCanvasPointer(pointerId, owner){
    if(activeCanvasPointerId!==pointerId) return;
    activeCanvasPointerId = null;
    if(owner && owner.releasePointerCapture){
        try{ owner.releasePointerCapture(pointerId); }catch{}
    }
}

function updateCanvasInteraction(clientX,clientY){
    if(!drag) return;
    const d=drag;
    if(d.type==='pan'){
        setT(tx+(clientX-d.lastX),ty+(clientY-d.lastY),sc);
        d.lastX=clientX;d.lastY=clientY;
    } else if(d.type==='cmdZoom'){
        const dy=d.lastY-clientY;d.lastY=clientY;
        const f=Math.exp(dy*0.012);
        setT(d.pivX-(d.pivX-tx)*f,d.pivY-(d.pivY-ty)*f,sc*f);
    } else if(d.type==='marquee'){
        d.lastX=clientX;d.lastY=clientY;
        setMarqueeBox(d.startX,d.startY,d.lastX,d.lastY);
        marqueeSelect(d.startX,d.startY,d.lastX,d.lastY,d.append);
    } else if(d.type==='drag'){
        const dx=(clientX-d.startX)/sc,dy=(clientY-d.startY)/sc;
        selectedSet.forEach(n=>{n.style.left=(d.origins.get(n).x+dx)+'px';n.style.top=(d.origins.get(n).y+dy)+'px';});
        interactionDirty=true;
        updateCtxPos();updateMultiSelectionBox();updateNoteToolbarPos();
    } else if(d.type==='rotate'){
        const nr=d.node.getBoundingClientRect();
        const cx=nr.left+nr.width/2,cy=nr.top+nr.height/2;
        const now=Math.atan2(clientY-cy,clientX-cx)*180/Math.PI;
        const delta=now-d.startMouseAngle;
        d.node.style.transform=`rotate(${d.startNodeAngle+delta}deg)`;
        interactionDirty=true;
        updateMultiSelectionBox();
    } else if(d.type==='scale'){
        const dx=(clientX-d.startX)/sc;
        const dy=(clientY-d.startY)/sc;
        const isCard=d.node.classList.contains('note-card')||d.node.classList.contains('chat-card');
        let nw=d.ow;
        let nh=d.oh;
        if(isCard){
            if(d.handle==='br'){nw=d.ow+dx;nh=d.oh+dy;}
            else if(d.handle==='tr'){nw=d.ow+dx;nh=d.oh-dy;}
            else if(d.handle==='bl'){nw=d.ow-dx;nh=d.oh+dy;}
            else {nw=d.ow-dx;nh=d.oh-dy;}
            nw=clamp(nw,d.minW,d.maxW);
            nh=clamp(nh,d.minH,d.maxH);
            const deltaW=nw-d.ow;
            const deltaH=nh-d.oh;
            let nx=d.startLeft;
            let ny=d.startTop;
            if(d.handle==='tl'||d.handle==='bl') nx=d.startLeft-deltaW;
            if(d.handle==='tl'||d.handle==='tr') ny=d.startTop-deltaH;
            d.node.style.left=nx+'px';
            d.node.style.top=ny+'px';
        }else{
            let sx=1,sy=1;
            if(d.handle==='br'){sx=(d.ow+dx)/d.ow;sy=(d.oh+dy)/d.oh;}
            else if(d.handle==='tr'){sx=(d.ow+dx)/d.ow;sy=(d.oh-dy)/d.oh;}
            else if(d.handle==='bl'){sx=(d.ow-dx)/d.ow;sy=(d.oh+dy)/d.oh;}
            else {sx=(d.ow-dx)/d.ow;sy=(d.oh-dy)/d.oh;}
            const f=Math.max(0.08,Math.min(12,Math.max(sx,sy)));
            nw=clamp(d.ow*f,d.minW,d.maxW);
            nh=clamp(d.oh*f,d.minH,d.maxH);
        }
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
}

function finishCanvasInteraction(){
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
}

function maybeOpenNoteEditorFromTap(node,pointerType){
    if(!(node.classList.contains('note-card')||node.classList.contains('chat-card'))) return;
    const now=Date.now();
    if(lastNoteTap.node===node&&lastNoteTap.pointerType===pointerType&&(now-lastNoteTap.time)<360){
        const c=node.querySelector('.note-content');
        if(c){
            if(!selectedSet.has(node))selOnly(node);
            c.contentEditable='true';
            c.classList.add('editing');
            c.focus();
            if(c.textContent==='Type your note...'||c.textContent==='Thinking...'){
                c.textContent='';
                const r=document.createRange();
                r.selectNodeContents(c);
                r.collapse(false);
                const s=window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
            }
        }
    }
    lastNoteTap={ node, time: now, pointerType };
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
                startLeft:parseFloat(node.style.left)||0,
                startTop:parseFloat(node.style.top)||0,
                ow,
                oh,
                minW:isCard?260:40,
                minH:isCard?160:40,
                maxW:isCard?980:2600,
                maxH:isCard?760:2200
            };
            updateCtxPos();
            updateNoteToolbarPos();
        });inner.appendChild(h);
        h.addEventListener('pointerdown',e=>{
            if(e.pointerType==='mouse') return;
            e.preventDefault();
            e.stopPropagation();
            if(!selectedSet.has(node))selOnly(node);
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
                startLeft:parseFloat(node.style.left)||0,
                startTop:parseFloat(node.style.top)||0,
                ow,
                oh,
                minW:isCard?260:40,
                minH:isCard?160:40,
                maxW:isCard?980:2600,
                maxH:isCard?760:2200
            };
            setActiveCanvasPointer(e.pointerId,h);
            updateCtxPos();
            updateNoteToolbarPos();
        },{passive:false});

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
    rh.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse') return;
        e.preventDefault();
        e.stopPropagation();
        if(!selectedSet.has(node))selOnly(node);
        const nr=node.getBoundingClientRect();
        const cx=nr.left+nr.width/2,cy=nr.top+nr.height/2;
        const startMouseAngle=Math.atan2(e.clientY-cy,e.clientX-cx)*180/Math.PI;
        const m=(node.style.transform||'').match(/rotate\(([-\d.]+)deg\)/);
        const startNodeAngle=m?parseFloat(m[1]):0;
        drag={type:'rotate',node,startMouseAngle,startNodeAngle};
        setActiveCanvasPointer(e.pointerId,rh);
        updateCtxPos();
        updateNoteToolbarPos();
    },{passive:false});
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
        node.addEventListener('pointerdown',e=>{
            if(e.pointerType==='mouse') return;
            if(e.altKey||e.metaKey||e.ctrlKey) return;
            if(e.target.classList.contains('scale-handle'))return;
            if(e.target.classList.contains('rotate-handle'))return;
            if(e.target.tagName==='VIDEO'||e.target.tagName==='AUDIO')return;
            if(e.target.closest&&e.target.closest('.media-controls')) return;
            if(e.shiftKey){
                e.preventDefault();
                e.stopPropagation();
                if(selectedSet.has(node)) removeSel(node);
                else addSel(node);
                return;
            }
            if(e.target.classList.contains('note-content')&&!e.target.classList.contains('editing')){
                e.preventDefault();
                selOnly(node);
                updateNoteToolbarPos();
            }
            if(e.target.isContentEditable)return;
            e.preventDefault();
            e.stopPropagation();
            if(!selectedSet.has(node)) selOnly(node);
            const origins=new Map();selectedSet.forEach(n=>origins.set(n,{x:parseFloat(n.style.left)||0,y:parseFloat(n.style.top)||0}));
            drag={type:'drag',startX:e.clientX,startY:e.clientY,origins};
            setActiveCanvasPointer(e.pointerId,node);
            updateCtxPos();
            updateNoteToolbarPos();
        },{passive:false});
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
        node.addEventListener('pointerup',e=>{
            if(e.pointerType==='mouse') return;
            if(drag||activeCanvasPointerId!==null) return;
            maybeOpenNoteEditorFromTap(node,e.pointerType);
        });
    }
}

function openBoardPanel(){
    renderBoardList();
    boardPanel.classList.remove('hidden');
}

function updateSpaceSlider(){
    if(!spaceSwitcher||!spaceSlider) return;
    const active=spaceSwitcher.querySelector('.space-btn.active');
    if(!active) return;
    const w=active.offsetWidth;
    if(w===0){requestAnimationFrame(updateSpaceSlider);return;}
    // Use getBoundingClientRect for reliable positioning on phone where offsetLeft
    // may return 0 inside a fixed/transformed parent context.
    const parentRect=spaceSwitcher.getBoundingClientRect();
    const activeRect=active.getBoundingClientRect();
    const left=activeRect.left-parentRect.left;
    spaceSlider.style.left=Math.max(0,left)+'px';
    spaceSlider.style.transform='';
    spaceSlider.style.width=w+'px';
}

function setSpace(space){
    currentSpace=space==='space2'?'space2':'space1';
    if(spaceBtn1) spaceBtn1.classList.toggle('active',currentSpace==='space1');
    if(spaceBtn2) spaceBtn2.classList.toggle('active',currentSpace==='space2');
    if(currentSpace==='space2'){
        document.body.classList.add('space-2');
        const forcedCollapsed=window.innerWidth<=760;
        // Collapse sidebar BEFORE removing 'hidden' so no CSS transition fires on initial load.
        // If we remove hidden first, the browser paints the open sidebar, then starts a 180ms
        // collapse transition — layoutSpace2Grid() would measure the wrong width mid-animation.
        if(forcedCollapsed&&space2Panel) space2Panel.classList.add('sidebar-collapsed');
        // Set view BEFORE unhiding panel so discover is already display:none on first paint.
        // This ensures layoutSpace2Grid() always measures full clientWidth, not 50%.
        showSpace2View(space2View);
        if(space2Panel) space2Panel.classList.remove('hidden');
        if(space2TopSearch) space2TopSearch.classList.remove('hidden');
        if(forcedCollapsed) setSpace2CollectionsOpen(false,{skipPersist:true});
        else setSpace2CollectionsOpen(space2CollectionsOpen);
        loadSpace2State();
        // Safety re-layouts for async image loads and Supabase-restored state
        scheduleSpace2GridLayout();
        setTimeout(scheduleSpace2GridLayout,100);
        setTimeout(scheduleSpace2GridLayout,300);
    }else{
        document.body.classList.remove('space-2');
        if(space2Panel) space2Panel.classList.add('hidden');
        if(space2TopSearch) space2TopSearch.classList.add('hidden');
    }
    syncSpace2AIHubVisibility();
    updateControlCornerState();
    applySpace2MobileHeaderLayout();
    requestAnimationFrame(updateSpaceSlider);
    schedulePersist(120);
}

function cycleSpace(step){
    const spaces=['space1','space2'];
    const idx=spaces.indexOf(currentSpace);
    const next=spaces[(idx+step+spaces.length)%spaces.length];
    setSpace(next);
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
    saveSpace2State();
    currentBoardId=boardId;
    clearCanvasNodes();
    loadBoardState(currentProjectKey,currentBoardId);
    space2SearchText='';
    space2ActiveCollection='all';
    if(space2Search) space2Search.value='';
    loadSpace2State(currentProjectKey,currentBoardId);
    if(currentSupabaseUser){
        restoreStateFromSupabase().catch(err=>console.warn('cloud board restore failed',err));
    }
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
const ctxAddGridBtn=document.getElementById('ctx-add-grid');
if(ctxAddGridBtn) ctxAddGridBtn.addEventListener('click',()=>{
    const added=importSelectionToSpace2(true);
    if(added>0) setSpace('space2');
});
document.getElementById('ctx-move-board').addEventListener('click',openMoveBoardModal);
document.getElementById('nt-move-board').addEventListener('click',openMoveBoardModal);
document.getElementById('ctx-favorite').addEventListener('click',toggleFavoriteOnSelection);
document.getElementById('nt-favorite').addEventListener('click',toggleFavoriteOnSelection);

barExtraBtn.addEventListener('click',e=>{e.stopPropagation();barExtraMenu.classList.toggle('hidden');});
function closeAllDD(){
    barExtraMenu.classList.add('hidden');
    modelDD.classList.add('hidden');
    sizeDD.classList.add('hidden');
    colorPopup.classList.add('hidden');
    if(space2AiModelDropdown) space2AiModelDropdown.classList.add('hidden');
    closeBoardPanel();
    closeBoardQuickMenu();
}
window.addEventListener('click',closeAllDD);

if(boardMenuTrigger){
    boardMenuTrigger.addEventListener('click',e=>{
        e.stopPropagation();
        renderBoardQuickMenu();
        if(boardQuickMenu) boardQuickMenu.classList.toggle('hidden');
        closeBoardPanel();
    });
}
if(boardQuickMenu){
    boardQuickMenu.addEventListener('click',e=>e.stopPropagation());
}
if(boardManageBtn){
    boardManageBtn.addEventListener('click',e=>{
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
if(extraMediaBrowserBtn) extraMediaBrowserBtn.addEventListener('click',e=>{e.stopPropagation();closeAllDD();openMediaBrowser();});
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

if(spaceBtn1) spaceBtn1.addEventListener('click',e=>{e.stopPropagation();setSpace('space1');requestAnimationFrame(updateSpaceSlider);setTimeout(updateSpaceSlider,80);});
if(spaceBtn2) spaceBtn2.addEventListener('click',e=>{e.stopPropagation();setSpace('space2');requestAnimationFrame(updateSpaceSlider);setTimeout(updateSpaceSlider,80);});
if(space2Search) space2Search.addEventListener('input',()=>{
    space2SearchText=space2Search.value||'';
    if(space2View==='discover') filterDiscoverFeedBySearch();
    else renderSpace2Grid();
});
if(space2CameraBtn && space2CameraInput) space2CameraBtn.addEventListener('click',()=>{ if(space2CameraInput) space2CameraInput.click(); });
if(space2UploadBtn) space2UploadBtn.addEventListener('click',()=>{ if(space2FileInput) space2FileInput.click(); });
if(space2FileInput) space2FileInput.addEventListener('change',async e=>{
    await importFilesToSpace2(e.target.files);
    e.target.value='';
});
if(space2CameraInput) space2CameraInput.addEventListener('change',async e=>{
    await importFilesToSpace2(e.target.files,{openEditor:true});
    e.target.value='';
});
if(space2AiInput){
    space2AiInput.addEventListener('input',()=>{
        space2AiInput.style.height='24px';
        space2AiInput.style.height=Math.min(space2AiInput.scrollHeight,120)+'px';
    });
    space2AiInput.addEventListener('keydown',e=>{
        if(e.key==='Enter'&&!e.shiftKey){
            e.preventDefault();
            askSpace2Ai();
        }
    });
}
if(space2AiSend) space2AiSend.addEventListener('click',e=>{e.stopPropagation();askSpace2Ai();});
if(space2AiModelBtn&&space2AiModelDropdown){
    space2AiModelBtn.addEventListener('click',e=>{
        e.stopPropagation();
        space2AiModelDropdown.classList.toggle('hidden');
    });
}
if(space2AiEye){
    space2AiEye.addEventListener('click',e=>{
        e.stopPropagation();
        setSpace2CaptureArmed(!space2AiCaptureArmed);
        setSpace2AiOutput('');
    });
}
if(space2AiCaptureCancel) space2AiCaptureCancel.addEventListener('click',()=>setSpace2CapturePreview(''));
if(space2AiCaptureConfirm) space2AiCaptureConfirm.addEventListener('click',()=>{
    if(!space2AiPendingCapture) return;
    setSpace2CaptureArmed(false);
    setSpace2AiAttachedCapture(space2AiPendingCapture);
    setSpace2CapturePreview('');
    setSpace2AiOutput('');
});
if(space2AiDetach) space2AiDetach.addEventListener('click',()=>setSpace2AiAttachedCapture(''));
if(space2CaptureOverlay){
    space2CaptureOverlay.addEventListener('mousedown',e=>{
        if(!space2AiCaptureArmed) return;
        const r=space2CaptureOverlay.getBoundingClientRect();
        space2AiCaptureDrag={x:e.clientX-r.left,y:e.clientY-r.top};
        updateSpace2CaptureBox({left:space2AiCaptureDrag.x,top:space2AiCaptureDrag.y,width:1,height:1});
    });
    window.addEventListener('mousemove',e=>{
        if(!space2AiCaptureArmed||!space2AiCaptureDrag) return;
        const r=space2CaptureOverlay.getBoundingClientRect();
        const now={x:e.clientX-r.left,y:e.clientY-r.top};
        updateSpace2CaptureBox(getCaptureRectFromPoints(space2AiCaptureDrag,now));
    });
    window.addEventListener('mouseup',async e=>{
        if(!space2AiCaptureArmed||!space2AiCaptureDrag) return;
        const r=space2CaptureOverlay.getBoundingClientRect();
        const now={x:e.clientX-r.left,y:e.clientY-r.top};
        const rect=getCaptureRectFromPoints(space2AiCaptureDrag,now);
        space2AiCaptureDrag=null;
        setSpace2CaptureArmed(false);
        if(rect.width<8||rect.height<8){
            setSpace2AiOutput('');
            return;
        }
        try{
            const dataUrl=await captureSpace2ScreenRegion(rect);
            setSpace2CapturePreview(dataUrl);
            setSpace2AiOutput('');
        }catch(err){
            console.error('space2 capture',err);
            setSpace2AiOutput('Capture failed. Please allow screen capture and try again.');
        }
    });
}
setSpace2AiOutput('');
setSpace2CapturePreview('');
setSpace2AiAttachedCapture('');
setSpace2CaptureArmed(false);
// Tab switching: Grid vs Discover
function showSpace2View(view) {
    const gridEl = document.getElementById('space2-grid');
    const discoverEl = document.getElementById('space2-discover');
    const isGrid = view === 'grid';
    space2View=isGrid?'grid':'discover';
    if(space2ViewToggle){
        space2ViewToggle.classList.toggle('is-grid', isGrid);
        space2ViewToggle.setAttribute('aria-pressed', isGrid ? 'true' : 'false');
        space2ViewToggle.title = isGrid ? 'Switch to Discover' : 'Switch to Grid';
    }
    if(space2DiscoverControls) space2DiscoverControls.classList.toggle('hidden', isGrid);
    if(space2Search) space2Search.placeholder = isGrid ? 'Search...' : 'Search in discover...';
    if(gridEl) gridEl.style.display = isGrid ? '' : 'none';
    if(discoverEl) discoverEl.classList.toggle('hidden', isGrid);
    if(space2Panel) {
        space2Panel.classList.toggle('discover-view', !isGrid);
        space2Panel.classList.toggle('grid-view', isGrid);
    }
    if(!isGrid) initDiscoverPanel();
    if(isGrid) scheduleSpace2GridLayout();
    syncSpace2AIHubVisibility();
    updateControlCornerState();
}

function syncSpace2AIHubVisibility(){
    if(!space2AiHub) return;
    const visible=currentSpace==='space2';
    space2AiHub.classList.toggle('hidden',!visible);
    if(visible&&(!space2AiModels||!space2AiModels.length)) refreshSpace2AiModels();
    if(!visible){
        if(space2AiModelDropdown) space2AiModelDropdown.classList.add('hidden');
        setSpace2CaptureArmed(false);
    }
}

function filterDiscoverFeedBySearch(){
    const q=(space2SearchText||'').trim().toLowerCase();
    const cards=document.querySelectorAll('#discover-feed .discover-card');
    cards.forEach(card=>{
        if(!q){ card.style.display=''; return; }
        const text=(card.textContent||'').toLowerCase();
        card.style.display=text.includes(q)?'':'none';
    });
}

function getDiscoverSources(feedKey=discoverCurrentFeed){
    const items=[];
    const push=(label,url,type='seed')=>items.push({label,url,type});
    if(feedKey==='all' || feedKey==='motion'){
        DISCOVER_FEEDS.motion.urls.forEach(url=>push('Motion seed',url,'seed'));
        DISCOVER_FEEDS.motion.rss.forEach(url=>push('Motion RSS',url,'rss'));
    }
    if(feedKey==='all' || feedKey==='design'){
        DISCOVER_FEEDS.design.urls.forEach(url=>push('Design seed',url,'seed'));
        DISCOVER_FEEDS.design.rss.forEach(url=>push('Design RSS',url,'rss'));
    }
    if(feedKey==='all' || feedKey==='custom'){
        getDiscoverPages().forEach(page=>{
            (page.urls||[]).forEach(url=>push(page.name||'Custom page',url,'custom'));
        });
    }
    const seen=new Set();
    return items.filter(item=>{
        if(!item.url||seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
    });
}

function renderDiscoverSources(feedKey=discoverCurrentFeed){
    const list=document.getElementById('discover-source-list');
    if(!list) return;
    const sources=getDiscoverSources(feedKey);
    list.innerHTML='';
    if(!sources.length){
        list.innerHTML='<div class="discover-empty">No sources for this feed yet.</div>';
        return;
    }
    sources.forEach(source=>{
        const row=document.createElement('div');
        row.className='discover-source-item';
        const meta=document.createElement('div');
        meta.className='discover-source-meta';
        const name=document.createElement('div');
        name.className='discover-source-name';
        name.textContent=source.label;
        const url=document.createElement('div');
        url.className='discover-source-url';
        url.textContent=source.url;
        meta.appendChild(name);
        meta.appendChild(url);
        row.appendChild(meta);
        if(source.type==='custom'){
            const del=document.createElement('button');
            del.className='discover-source-del';
            del.title='Remove source';
            del.textContent='✕';
            del.addEventListener('click',e=>{
                e.stopPropagation();
                const pages=getDiscoverPages();
                pages.forEach(page=>{
                    const idx=(page.urls||[]).indexOf(source.url);
                    if(idx!==-1) page.urls.splice(idx,1);
                });
                setDiscoverPages(pages.filter(p=>(p.urls||[]).length>0));
                renderDiscoverCustomList();
                renderDiscoverSources(feedKey);
            });
            row.appendChild(del);
        } else {
            const badge=document.createElement('span');
            badge.className='discover-source-badge';
            badge.textContent=source.type==='rss'?'RSS':'Built-in';
            row.appendChild(badge);
        }
        row.addEventListener('click',()=>window.open(source.url,'_blank'));
        list.appendChild(row);
    });
}
if(space2ViewToggle) space2ViewToggle.addEventListener('click', () => showSpace2View(space2View==='grid'?'discover':'grid'));
initSpace2SidebarSizing();
initSpace2GridDropzone();
applySpace2LayoutSettings({persist:false});
if(space2NewCollection) space2NewCollection.addEventListener('click',()=>createSpace2Collection());
if(space2ItemCancel) space2ItemCancel.addEventListener('click',closeSpace2Item);
if(space2ItemSave) space2ItemSave.addEventListener('click',saveSpace2Item);
if(space2ItemDelete) space2ItemDelete.addEventListener('click',deleteSpace2Item);
if(space2ItemModal) space2ItemModal.addEventListener('click',e=>{if(e.target===space2ItemModal) closeSpace2Item();});
if(space2CollectionCancel) space2CollectionCancel.addEventListener('click',closeCollectionModal);
if(space2CollectionSave) space2CollectionSave.addEventListener('click',saveCollectionModal);
if(space2CollectionNameInput) space2CollectionNameInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveCollectionModal();}});
if(space2CollectionModal) space2CollectionModal.addEventListener('click',e=>{if(e.target===space2CollectionModal) closeCollectionModal();});
if(space2SettingsBtn) space2SettingsBtn.addEventListener('click',openSpace2SettingsModal);
if(space2SettingsClose) space2SettingsClose.addEventListener('click',closeSpace2SettingsModal);
if(space2CapturePermissionBtn) space2CapturePermissionBtn.addEventListener('click',()=>requestSpace2CapturePermission({silent:false}));
if(space2LayoutGridBtn) space2LayoutGridBtn.addEventListener('click',()=>{
    space2LayoutMode='grid';
    applySpace2LayoutSettings();
});
if(space2LayoutFeedBtn) space2LayoutFeedBtn.addEventListener('click',()=>{
    space2LayoutMode='feed';
    applySpace2LayoutSettings();
});
if(space2ColumnsSelect) space2ColumnsSelect.addEventListener('change',()=>{
    space2ColumnsSetting=(space2ColumnsSelect.value||'auto');
    applySpace2LayoutSettings();
});
if(space2AutoMetaToggle) space2AutoMetaToggle.addEventListener('change',()=>{
    space2AutoMetaEnabled=!!space2AutoMetaToggle.checked;
    localStorage.setItem('asq.space2.autoMeta',space2AutoMetaEnabled?'1':'0');
    setSpace2AutoMetaStatus(space2AutoMetaEnabled?'Auto metadata will run on new uploads.':'Auto metadata is disabled.');
});
if(space2AutoMetaRun) space2AutoMetaRun.addEventListener('click',()=>{runBatchAutoMetadata();});
if(space2SettingsModal) space2SettingsModal.addEventListener('click',e=>{if(e.target===space2SettingsModal) closeSpace2SettingsModal();});
document.addEventListener('click',e=>{
    if(activeCollectionMenu && !activeCollectionMenu.contains(e.target)) closeCollectionMenu();
});

// ── Discover Panel ─────────────────────────────────────────────────────────
const DISCOVER_FEEDS = {
    motion: {
        rss:[
            'https://motionographer.com/feed/',
            'https://vimeo.com/channels/staffpicks/videos/rss',
        ],
        urls:[
            'https://motionographer.com',
            'https://vimeo.com/channels/staffpicks',
            'https://www.stashmedia.tv',
            'https://www.itsnicethat.com',
        ],
    },
    design: {
        rss:[
            'https://dribbble.com/shots/popular.rss',
            'https://www.awwwards.com/websites/sites_of_the_day/rss/',
        ],
        urls:[
            'https://www.awwwards.com/websites/',
            'https://dribbble.com/shots/popular',
            'https://www.behance.net/galleries/graphic-design',
            'https://www.designspiration.com',
        ],
    },
};
const DISCOVER_CACHE_KEY = 'asq.discover.cache.v1';
const DISCOVER_PAGES_KEY = 'asq.discover.pages.v1';
let discoverCurrentFeed = 'all';
let discoverInitialized = false;

function getDiscoverCache() {
    try { return JSON.parse(localStorage.getItem(DISCOVER_CACHE_KEY) || '{}'); }
    catch { return {}; }
}
function setDiscoverCache(cache) {
    try { localStorage.setItem(DISCOVER_CACHE_KEY, JSON.stringify(cache)); } catch {}
}
function getDiscoverPages() {
    try { return JSON.parse(localStorage.getItem(DISCOVER_PAGES_KEY) || '[]'); }
    catch { return []; }
}
function setDiscoverPages(pages) {
    try { localStorage.setItem(DISCOVER_PAGES_KEY, JSON.stringify(pages)); } catch {}
}

function resolveDiscoverUrl(candidate, baseUrl) {
    if(!candidate) return '';
    try { return new URL(candidate, baseUrl).toString(); }
    catch { return ''; }
}

function getFirstJsonLdImage(doc, baseUrl) {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    for(const script of scripts){
        try {
            const parsed = JSON.parse(script.textContent || 'null');
            const queue = [parsed];
            while(queue.length){
                const current = queue.shift();
                if(!current) continue;
                if(Array.isArray(current)) {
                    queue.push(...current);
                    continue;
                }
                if(typeof current === 'object') {
                    const image = current.image;
                    if(typeof image === 'string') return resolveDiscoverUrl(image, baseUrl);
                    if(Array.isArray(image)) {
                        const first = image.find(v => typeof v === 'string' || (v && typeof v.url === 'string'));
                        if(typeof first === 'string') return resolveDiscoverUrl(first, baseUrl);
                        if(first && typeof first.url === 'string') return resolveDiscoverUrl(first.url, baseUrl);
                    }
                    if(image && typeof image.url === 'string') return resolveDiscoverUrl(image.url, baseUrl);
                    queue.push(...Object.values(current));
                }
            }
        } catch {}
    }
    return '';
}

async function fetchOGData(url) {
    const cache = getDiscoverCache();
    const now = Date.now();
    if(cache[url] && (now - cache[url].ts) < 86400000) return cache[url];
    const host = (() => { try { return new URL(url).hostname.replace('www.',''); } catch { return 'link'; }})();
    const candidates = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        url,
    ];
    for(const endpoint of candidates){
        try {
            const res = await fetch(endpoint);
            if(!res.ok) continue;
            const text = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const meta = (prop) => {
                const el = doc.querySelector(`meta[property="${prop}"],meta[name="${prop}"]`);
                return el ? el.getAttribute('content') : '';
            };
            const image = resolveDiscoverUrl(
                meta('og:image') ||
                meta('og:image:url') ||
                meta('twitter:image') ||
                meta('thumbnail') ||
                doc.querySelector('link[rel="image_src"]')?.getAttribute('href') ||
                getFirstJsonLdImage(doc, url) ||
                doc.querySelector('article img, main img, img[src]')?.getAttribute('src') ||
                '',
                url,
            );
            if(!image) continue;
            const data = {
                url,
                image,
                title: meta('og:title') || meta('twitter:title') || doc.title || host,
                desc: meta('og:description') || meta('twitter:description') || '',
                ts: now,
            };
            const c = getDiscoverCache();
            c[url] = data;
            setDiscoverCache(c);
            return data;
        } catch {}
    }
    return null;
}

async function fetchRSSItems(feedUrl) {
    try {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`);
        if(!res.ok) return [];
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = Array.from(xml.querySelectorAll('item')).slice(0, 24);
        return items.map(item => ({
            url: item.querySelector('link')?.textContent?.trim() || '',
            title: item.querySelector('title')?.textContent?.trim() || '',
            image: resolveDiscoverUrl(
                   item.querySelector('media\\:thumbnail, thumbnail')?.getAttribute('url') ||
                   item.querySelector('media\\:content, content')?.getAttribute('url') ||
                   item.querySelector('enclosure[type^="image"]')?.getAttribute('url') ||
                   item.querySelector('itunes\\:image')?.getAttribute('href') ||
                   item.querySelector('content\\:encoded, encoded')?.textContent?.match(/src="([^"]+)"/i)?.[1] ||
                   '',
                   item.querySelector('link')?.textContent?.trim() || feedUrl,
            ),
            desc: (item.querySelector('description')?.textContent || '').replace(/<[^>]*>/g,'').slice(0,120),
        })).filter(i => i.url);
    } catch { return []; }
}

function renderDiscoverCard(item) {
    const card = document.createElement('div');
    card.className = 'discover-card';
    const srcHost = (() => { try { return new URL(item.url).hostname.replace('www.',''); } catch { return ''; }})();
    card.innerHTML = `
        ${item.image ? `<img src="${item.image}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="discover-card-info">
            <div class="discover-card-title" title="${item.title?.replace(/"/g,'&quot;')}">${item.title || 'Untitled'}</div>
            <div class="discover-card-src">${srcHost}</div>
        </div>
        <div class="discover-card-actions">
            <button class="discover-save-btn" data-target="grid" title="Add to grid" aria-label="Add to grid"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg></button>
            <button class="discover-save-btn" data-target="collection" title="Add to collection" aria-label="Add to collection"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4l2 2h8a2 2 0 0 1 2 2v2H2V6a2 2 0 0 1 2-2h6zm12 8v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8h20zm-10 2v2H10v2h2v2h2v-2h2v-2h-2v-2h-2z"/></svg></button>
            <button class="discover-save-btn" data-target="dismiss" title="Dismiss" aria-label="Dismiss"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l-1 13a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3 3v8h2v-8H9zm4 0v8h2v-8h-2zM9 3h6l1 2h4v2H4V5h4l1-2z"/></svg></button>
        </div>
    `;
    const img=card.querySelector('img');
    const srcEl=card.querySelector('.discover-card-src');
    if(img&&srcEl){
        img.addEventListener('load',()=>{
            if(img.naturalWidth&&img.naturalHeight){
                srcEl.textContent=`${srcHost} • ${img.naturalWidth}x${img.naturalHeight}`;
            }
        },{once:true});
    }
    card.querySelectorAll('.discover-save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(btn.dataset.target==='dismiss'){
                card.remove();
                return;
            }
            if(btn.dataset.target==='collection'){
                openCollectionMenu(btn,{discoverItem:item,allowGrid:false,allowDismiss:false});
                return;
            }
            const state=sendDiscoverItem(item, btn.dataset.target);
            btn.dataset.state = state;
            setTimeout(()=>{ delete btn.dataset.state; },900);
        });
    });
    card.addEventListener('click', () => window.open(item.url, '_blank'));
    return card;
}

function appendDiscoverBatch(){
    const feed = document.getElementById('discover-feed');
    if(!feed) return;
    if(discoverVisibleCount >= discoverItems.length) return;
    const next = discoverItems.slice(discoverVisibleCount, discoverVisibleCount + DISCOVER_PAGE_SIZE);
    next.forEach(item => feed.appendChild(renderDiscoverCard(item)));
    discoverVisibleCount += next.length;
    filterDiscoverFeedBySearch();
}

function renderDiscoverFeed(items) {
    const feed = document.getElementById('discover-feed');
    if(!feed) return;
    feed.classList.remove('is-loading');
    feed.innerHTML = '';
    discoverItems = items;
    discoverVisibleCount = 0;
    if(!items.length) {
        feed.innerHTML = '<div class="discover-empty">No items found. Add a custom page or try another tab.</div>';
        return;
    }
    appendDiscoverBatch();
}

async function loadDiscoverFeed(feedKey) {
    discoverCurrentFeed = feedKey;
    const feed = document.getElementById('discover-feed');
    if(discoverLoading) return;
    discoverLoading = true;
    if(feed) {
        feed.classList.add('is-loading');
        feed.innerHTML = '<div class="discover-loading"><div class="spinner"></div></div>';
    }
    let urls = [];
    let directItems = [];
    if(feedKey==='custom' || feedKey==='all'){
        const pages=getDiscoverPages();
        pages.forEach(p=>{ (p.urls||[]).forEach(u=>urls.push(u)); });
    }
    const addGroup=(group)=>{
        if(!group) return;
        urls.push(...(group.urls||[]));
    };
    if(feedKey==='all' || feedKey==='motion') addGroup(DISCOVER_FEEDS.motion);
    if(feedKey==='all' || feedKey==='design') addGroup(DISCOVER_FEEDS.design);

    const rssToLoad=[];
    if(feedKey==='all' || feedKey==='motion') rssToLoad.push(...DISCOVER_FEEDS.motion.rss);
    if(feedKey==='all' || feedKey==='design') rssToLoad.push(...DISCOVER_FEEDS.design.rss);
    const rssResults=await Promise.allSettled(rssToLoad.map(fetchRSSItems));
    rssResults.forEach(r=>{
        if(r.status==='fulfilled'){
            r.value.forEach(item=>{
                directItems.push(item);
                urls.push(item.url);
            });
        }
    });

    const enrichedDirect = await Promise.all(directItems.map(async item => {
        if(item.image) return item;
        const og = await fetchOGData(item.url);
        return og ? {
            ...item,
            image: og.image,
            title: item.title || og.title,
            desc: item.desc || og.desc,
        } : item;
    }));
    directItems = enrichedDirect.filter(item => item && item.image);

    urls=[...new Set(urls.filter(Boolean))].slice(0,48);
    const itemsRes=await Promise.allSettled(urls.map(fetchOGData));
    const ogItems=itemsRes
        .filter(r=>r.status==='fulfilled'&&r.value)
        .map(r=>r.value)
        .map(x=>({
            url:x.url,
            image:x.image,
            title:x.title,
            desc:x.desc,
        }));
    const all=[...directItems,...ogItems].filter(i=>i&&i.image);
    const seen=new Set();
    const items=all.filter(i=>{
        const key=i.url||i.image;
        if(!key||seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    renderDiscoverFeed(items);
    renderDiscoverSources(feedKey);
    discoverLoading = false;
    filterDiscoverFeedBySearch();
}

function renderDiscoverCustomList() {
    const list = document.getElementById('discover-custom-list');
    if(!list) return;
    const pages = getDiscoverPages();
    list.innerHTML = '';
    pages.forEach((page, idx) => {
        const el = document.createElement('div');
        el.className = 'discover-custom-item';
        el.innerHTML = `<span class="discover-custom-item-name">${page.name}</span>
            <button class="discover-custom-del" data-idx="${idx}" title="Remove">✕</button>`;
        list.appendChild(el);
    });
    list.querySelectorAll('.discover-custom-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const pages = getDiscoverPages();
            pages.splice(parseInt(btn.dataset.idx), 1);
            setDiscoverPages(pages);
            renderDiscoverCustomList();
            renderDiscoverSources(discoverCurrentFeed);
        });
    });
}

function initDiscoverPanel() {
    if(discoverInitialized) return;
    discoverInitialized = true;
    // Tab clicks
    document.querySelectorAll('.discover-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.discover-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadDiscoverFeed(btn.dataset.feed);
        });
    });
    // Manage panel toggle
    const manageBtn = document.getElementById('discover-manage-btn');
    const managePanel = document.getElementById('discover-manage');
    if(manageBtn && managePanel) {
        manageBtn.addEventListener('click', () => {
            managePanel.classList.toggle('hidden');
            if(!managePanel.classList.contains('hidden')) {
                renderDiscoverCustomList();
                renderDiscoverSources(discoverCurrentFeed);
            }
        });
    }
    // Add custom page
    const addBtn = document.getElementById('discover-add-page');
    const nameInput = document.getElementById('discover-page-name');
    const urlInput = document.getElementById('discover-page-url');
    if(addBtn && nameInput && urlInput) {
        addBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            const url = urlInput.value.trim();
            if(!name || !url) return;
            const pages = getDiscoverPages();
            const existing = pages.find(p => p.name === name);
            if(existing) { existing.urls = [...new Set([...(existing.urls||[]), url])]; }
            else { pages.push({name, urls:[url]}); }
            setDiscoverPages(pages);
            nameInput.value = '';
            urlInput.value = '';
            renderDiscoverCustomList();
            renderDiscoverSources(discoverCurrentFeed);
            if(discoverCurrentFeed==='custom'||discoverCurrentFeed==='all') loadDiscoverFeed(discoverCurrentFeed);
        });
    }
    const feed = document.getElementById('discover-feed');
    if(feed){
        feed.addEventListener('scroll',()=>{
            if(discoverLoading) return;
            const remaining = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
            if(remaining < 520) appendDiscoverBatch();
        });
    }
    // Load default feed
    loadDiscoverFeed('all');
}

// ── Mode Switching (floating pill switcher) ────────────────────────────────
// Slider pill animation
function updateSlider(){
    const active=document.querySelector('.mode-sw-btn.active');
    const slider=document.getElementById('mode-slider');
    const container=document.getElementById('mode-switcher');
    if(!active||!slider||!container) return;
    const w=active.offsetWidth;
    if(w===0){requestAnimationFrame(updateSlider);return;}
    slider.style.left=active.offsetLeft+'px';
    slider.style.width=w+'px';
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
    const baseCta=m==='ai'?'Create':m==='video'?'Create video':m==='audio'?'Create audio':m==='search'?'Search images':'Ask AI';
    genBtn.textContent=(window.innerWidth<=760&&(m==='ai'||m==='video'))?'Create':baseCta;
    updateBottomBarCompactUi();
    aiInput.placeholder=m==='ai'?'Describe what to generate...':m==='video'?'Describe the video to generate...':m==='audio'?'Describe the audio to generate...':m==='search'?'Search DuckDuckGo for images...':'Ask the AI anything...';
    if(m==='ai'||m==='video') loadImageModels();
    else if(m==='chat'||m==='audio') loadTextModels();
    modelWrapper.style.display=m==='search'?'none':'';
    schedulePersist(250);
}

function updateBottomBarCompactUi(){
    if(sizeBtn&&sizeLabel){
        sizeBtn.title=`Aspect ratio ${sizeLabel.textContent||`${genW} x ${genH}`}`;
    }
    if(genBtn){
        const compact=window.innerWidth<=760&&(appMode==='ai'||appMode==='video');
        const baseCta=appMode==='ai'?'Create':appMode==='video'?'Create video':appMode==='audio'?'Create audio':appMode==='search'?'Search images':'Ask AI';
        genBtn.textContent=compact?'Create':baseCta;
    }
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
setTimeout(updateSlider,800);
(()=>{const sw=document.getElementById('mode-switcher');if(sw&&typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>requestAnimationFrame(updateSlider)).observe(sw);}})();
window.addEventListener('load',()=>requestAnimationFrame(updateSpaceSlider));
window.addEventListener('resize',()=>{requestAnimationFrame(updateSpaceSlider);updateBottomBarCompactUi();});
window.addEventListener('orientationchange',()=>{requestAnimationFrame(updateSpaceSlider);setTimeout(updateSpaceSlider,120);});
if(window.visualViewport){
    window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(updateSpaceSlider));
}
setTimeout(updateSpaceSlider,200);
setTimeout(updateBottomBarCompactUi,220);
(()=>{const sw=document.getElementById('space-switcher');if(sw&&typeof ResizeObserver!=='undefined'){new ResizeObserver(()=>requestAnimationFrame(updateSpaceSlider)).observe(sw);}})();

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
refreshSpace2AiModels();
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

function setSpace2AiOutput(text){
    if(!space2AiOutput) return;
    const next=(text||'').trim();
    if(!next){
        space2AiOutput.classList.add('hidden');
        space2AiOutput.textContent='';
        return;
    }
    space2AiOutput.textContent=next;
    space2AiOutput.classList.remove('hidden');
}

function setSpace2AiAttachedCapture(dataUrl){
    space2AiAttachedCapture=(dataUrl||'').trim();
    if(space2AiAttachChip) space2AiAttachChip.classList.toggle('hidden',!space2AiAttachedCapture);
    if(space2AiAttachThumb){
        if(space2AiAttachedCapture) space2AiAttachThumb.src=space2AiAttachedCapture;
        else space2AiAttachThumb.removeAttribute('src');
    }
    if(space2AiAttachedCapture) setSpace2CaptureArmed(false);
}

function setSpace2CaptureArmed(armed){
    space2AiCaptureArmed=!!armed;
    if(space2AiEye) space2AiEye.classList.toggle('active',space2AiCaptureArmed);
    if(space2CaptureOverlay) space2CaptureOverlay.classList.toggle('hidden',!space2AiCaptureArmed);
    if(space2CaptureBox){
        space2CaptureBox.style.display='none';
        space2CaptureBox.style.width='0px';
        space2CaptureBox.style.height='0px';
    }
    space2AiCaptureDrag=null;
}

function setSpace2CapturePreview(dataUrl){
    space2AiPendingCapture=(dataUrl||'').trim();
    if(!space2AiCapturePreview||!space2AiCaptureImg) return;
    if(!space2AiPendingCapture){
        space2AiCapturePreview.classList.add('hidden');
        space2AiCaptureImg.removeAttribute('src');
        return;
    }
    space2AiCaptureImg.src=space2AiPendingCapture;
    space2AiCapturePreview.classList.remove('hidden');
}

function getCaptureRectFromPoints(a,b){
    const left=Math.min(a.x,b.x);
    const top=Math.min(a.y,b.y);
    const width=Math.abs(a.x-b.x);
    const height=Math.abs(a.y-b.y);
    return {left,top,width,height};
}

function updateSpace2CaptureBox(rect){
    if(!space2CaptureBox) return;
    if(!rect||rect.width<2||rect.height<2){
        space2CaptureBox.style.display='none';
        return;
    }
    space2CaptureBox.style.display='block';
    space2CaptureBox.style.left=`${rect.left}px`;
    space2CaptureBox.style.top=`${rect.top}px`;
    space2CaptureBox.style.width=`${rect.width}px`;
    space2CaptureBox.style.height=`${rect.height}px`;
}

async function captureSpace2ScreenRegion(rect){
    if(!rect||rect.width<4||rect.height<4) throw new Error('Capture area too small');
    if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){
        throw new Error('Screen capture is not available in this environment');
    }
    const stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
    let video;
    try{
        video=document.createElement('video');
        video.srcObject=stream;
        video.muted=true;
        await video.play();
        await wait(120);

        const track=stream.getVideoTracks()[0];
        const settings=track&&track.getSettings?track.getSettings():{};
        const frameW=video.videoWidth||settings.width||window.innerWidth;
        const frameH=video.videoHeight||settings.height||window.innerHeight;

        const scaleX=frameW/Math.max(window.innerWidth,1);
        const scaleY=frameH/Math.max(window.innerHeight,1);
        const sx=Math.max(0,Math.floor(rect.left*scaleX));
        const sy=Math.max(0,Math.floor(rect.top*scaleY));
        const sw=Math.max(1,Math.floor(rect.width*scaleX));
        const sh=Math.max(1,Math.floor(rect.height*scaleY));

        const canvas=document.createElement('canvas');
        canvas.width=sw;
        canvas.height=sh;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(video,sx,sy,sw,sh,0,0,sw,sh);
        return canvas.toDataURL('image/png');
    } finally {
        if(video){
            try{video.pause();}catch{}
            try{video.srcObject=null;}catch{}
        }
        stream.getTracks().forEach(t=>t.stop());
    }
}

function getSpace2AiModelGroups(){
    const text=(modelCatalog.text||[]).filter(Boolean);
    const img=(modelCatalog.image||[]).filter(Boolean);
    const vision=(modelCatalog.imageVision||[]).filter(Boolean);
    const vid=(modelCatalog.video||[]).filter(Boolean);
    const unique=(arr)=>[...new Set(arr)];
    return [
        {label:'Text Models',models:unique(text)},
        {label:'Image Models',models:unique(img)},
        {label:'Vision Edit Models',models:unique(vision)},
        {label:'Video Models',models:unique(vid)}
    ].filter(g=>g.models.length);
}

function renderSpace2AiModels(){
    if(!space2AiModelDropdown||!space2AiModelLabel) return;
    space2AiModelDropdown.innerHTML='';
    const groups=getSpace2AiModelGroups();
    const all=[...new Set(groups.flatMap(g=>g.models))];
    space2AiModels=all;
    if(!space2AiModels.length){
        space2AiModel='openai';
        space2AiModelLabel.textContent='openai';
        const btn=buildModelBtn('openai',true);
        btn.addEventListener('click',()=>{space2AiModel='openai';space2AiModelLabel.textContent='openai';});
        space2AiModelDropdown.appendChild(btn);
        return;
    }
    if(!space2AiModels.includes(space2AiModel)) space2AiModel=space2AiModels[0];
    space2AiModelLabel.textContent=space2AiModel;
    let section=0;
    groups.forEach(group=>{
        if(section>0){
            const sep=document.createElement('div');
            sep.className='model-divider';
            space2AiModelDropdown.appendChild(sep);
        }
        const lbl=document.createElement('div');
        lbl.className='model-group-label';
        lbl.textContent=group.label;
        space2AiModelDropdown.appendChild(lbl);
        group.models.forEach(name=>{
            const btn=document.createElement('button');
            btn.className=`model-opt${name===space2AiModel?' active':''}`;
            btn.type='button';
            btn.textContent=name;
            btn.addEventListener('click',e=>{
                e.stopPropagation();
                space2AiModel=name;
                space2AiModelLabel.textContent=name;
                space2AiModelDropdown.querySelectorAll('.model-opt').forEach(b=>b.classList.toggle('active',b.textContent===name));
                space2AiModelDropdown.classList.add('hidden');
            });
            space2AiModelDropdown.appendChild(btn);
        });
        section++;
    });
}

async function refreshSpace2AiModels(){
    if(space2AiModelLabel) space2AiModelLabel.textContent='Loading models...';
    try{
        const [imgRes,textRes]=await Promise.all([
            fetch(`${API_BASE}/image/models`,{headers:buildAuthHeaders()}),
            fetch(`${API_BASE}/text/models`,{headers:buildAuthHeaders()})
        ]);
        if(imgRes.ok){
            const imgList=normalizeModelList(await imgRes.json()).filter(m=>!m.paid_only);
            modelCatalog.image=imgList.filter(m=>!m.output_modalities.includes('video')).map(m=>m.name);
            modelCatalog.video=imgList.filter(m=>m.output_modalities.includes('video')).map(m=>m.name);
            modelCatalog.imageVision=imgList.filter(m=>{
                const inMods=(m.input_modalities||[]).map(v=>String(v).toLowerCase());
                const outMods=(m.output_modalities||[]).map(v=>String(v).toLowerCase());
                const supportsEndpoint=(m.supported_endpoints||[]).some(ep=>String(ep).includes('/v1/images/edits'));
                const desc=(m.description||'').toLowerCase();
                return (inMods.includes('image')&&outMods.includes('image'))||supportsEndpoint||desc.includes('image-to-image')||desc.includes('edit');
            }).map(m=>m.name);
        }
        if(textRes.ok){
            const textList=normalizeModelList(await textRes.json()).filter(m=>!m.paid_only);
            modelCatalog.text=textList.filter(m=>m.output_modalities.includes('text')||!m.output_modalities.length).map(m=>m.name);
        }
    }catch(err){
        console.warn('space2 model refresh failed',err);
    }
    renderSpace2AiModels();
}

async function askSpace2Ai(){
    if(!space2AiInput) return;
    const prompt=(space2AiInput.value||'').trim();
    if(!prompt&&!space2AiAttachedCapture) return;
    if(prompt){
        addPromptToHistory(prompt);
        space2AiInput.value='';
        space2AiInput.style.height='24px';
    }
    setSpace2AiOutput('Thinking...');
    try{
        const userContent=[];
        if(prompt) userContent.push({type:'text',text:prompt});
        if(space2AiAttachedCapture){
            userContent.push({type:'image_url',image_url:{url:space2AiAttachedCapture}});
        }
        const body={
            model:space2AiModel||'openai',
            stream:false,
            messages:[
                {role:'system',content:'You are a helpful visual assistant for designers. Be concise and actionable.'},
                {role:'user',content:(space2AiAttachedCapture||userContent.length>1)?userContent:(prompt||'Analyze this image and provide guidance.')}
            ]
        };
        const res=await fetch(`${API_BASE}/v1/chat/completions`,{
            method:'POST',
            headers:buildAuthHeaders({'Content-Type':'application/json'}),
            body:JSON.stringify(body)
        });
        if(!res.ok) throw new Error(`AI request failed (${res.status})`);
        const data=await res.json();
        const text=(data?.choices?.[0]?.message?.content||'').trim()||'No response text returned.';
        setSpace2AiOutput(text);
        if(space2AiAttachedCapture) setSpace2AiAttachedCapture('');
    }catch(err){
        console.error('Space2 AI chat',err);
        setSpace2AiOutput('Could not get a response. Please retry.');
    }
}

initAuthGate().then(()=>{
    if(!currentSupabaseUser) return;
    if(!appBootstrapped){
        bootstrapAppAfterAuth().catch(err=>console.warn('persistence init failed',err));
    }
}).catch(err=>console.warn('auth init failed',err));

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
            mbFiles.push({ key:`file:${fp}`, name: f, path: fp, src: toFileUrl(fp), ext: ext.toUpperCase(), size: stat.size, time: stat.mtimeMs, kind, sourceLabel: 'Space' });
        });
    } catch(err) { console.warn('Failed to load local assets', err); }

    (space2State.items||[]).forEach((item,idx)=>{
        const src=item.src||'';
        if(!src) return;
        const title=(item.title||`Grid ${idx+1}`).trim();
        mbFiles.push({
            key:`grid:${item.id}`,
            name:title,
            path:item.filePath||'',
            src,
            ext:'GRID',
            size:0,
            time:item.updatedAt||item.createdAt||0,
            kind:'image',
            sourceLabel:'Grid'
        });
    });

    mbFiles.sort((a,b) => b.time - a.time);
    renderMBGrid();
}

function renderMBGrid() {
    if(!mbGrid) return;
    mbGrid.innerHTML = '';
    const q = (mbSearchInput && mbSearchInput.value ? mbSearchInput.value : '').toLowerCase();
    const filtered = mbFiles.filter(f => !q || f.name.toLowerCase().includes(q));
    
    filtered.forEach(f => {
        const selected=mbSelected.has(f.key);
        const item = document.createElement('div');
        item.className = 'mb-item' + (selected ? ' selected' : '');
        item.innerHTML = `
            <div class="mb-thumb-wrap">
                <div class="mb-check">
                    <svg viewBox="0 0 24 24" style="fill:#fff;width:14px;height:14px;margin:2px;"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                </div>
                ${f.kind === 'image' ? `<img class="mb-thumb" src="${f.src}">` : 
                  f.kind === 'video' ? `<video class="mb-thumb" src="${f.src}" muted loop preload="metadata"></video>` :
                  `<div class="mb-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-mid);font-size:24px;">Audio</div>`}
            </div>
            <div class="mb-details">
                <div class="mb-filename" title="${f.name}">${f.name}</div>
                <div class="mb-meta"><span>${f.ext} · ${f.sourceLabel}</span><span>${f.size?formatBytes(f.size):''}</span></div>
            </div>
        `;
        item.addEventListener('click', (e) => {
            if(mbSelected.has(f.key)) mbSelected.delete(f.key);
            else mbSelected.add(f.key);
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
    if(f.path) node.dataset.filePath = f.path;
    const inner = document.createElement('div');
    inner.className = 'node-inner';
    if(f.kind === 'image') {
        const img = document.createElement('img');
        img.src = f.src;
        img.style.maxWidth = '360px';
        img.style.maxHeight = '280px';
        inner.appendChild(img);
    } else if(f.kind === 'video') {
        inner.appendChild(createMediaPlayer('video', f.src, 520, 300));
    } else if(f.kind === 'audio') {
        inner.appendChild(createMediaPlayer('audio', f.src, 492, 44));
    } else {
        const img = document.createElement('img');
        img.src = f.src;
        img.style.maxWidth = '360px';
        inner.appendChild(img);
    }
    finishNode(node, inner, false);
}

if(mbAddToCanvas) mbAddToCanvas.addEventListener('click', () => {
    const targets = mbFiles.filter(f => mbSelected.has(f.key));
    targets.forEach(f => addAssetToCanvas(f));
    mbSelected.clear();
    renderMBGrid();
    closeMediaBrowser();
});

if(mbShowFinder) mbShowFinder.addEventListener('click', () => {
    if(!mbSelected.size || !nodeChildProcess) return;
    const firstKey = [...mbSelected][0];
    const first = mbFiles.find(f=>f.key===firstKey);
    if(!first||!first.path) return;
    nodeChildProcess.exec(`open -R "${first.path.replace(/"/g,'\\"')}"`);
});

if(mbDeleteFiles) mbDeleteFiles.addEventListener('click', () => {
    if(!mbSelected.size || !nodeFs) return;
    if(!confirm(`Delete ${mbSelected.size} file(s) permanently?`)) return;
    mbSelected.forEach(k => {
        const f=mbFiles.find(x=>x.key===k);
        if(!f||!f.path) return;
        try { nodeFs.unlinkSync(f.path); } catch(err) { console.warn('Delete fail', err); }
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
    const firstKey = [...mbSelected][0];
    const first = mbFiles.find(f=>f.key===firstKey);
    if(!first) return;
    openPreviewOverlay(first.path||first.src);
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
