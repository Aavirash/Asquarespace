# AEEDIT Extension Spec (Railcut-Style) - April 3, 2026

## 1) Goal
Build a CEP panel for After Effects (AEEDIT) that provides an NLE-style timeline view (video thumbnails + audio waveforms), media browser ingest, and clip cutting tools while keeping After Effects as the source of truth.

## 2) What We Learned from Railcut (Product/UX Reference)
Reference pages:
- https://www.jakeinmotion.com/railcut
- https://docs.railcut.com/
- https://docs.railcut.com/getting-started/installation/

### Core feature model to emulate
- Track-based editing UI over AE layers.
- Clip thumbnails and audio waveforms on timeline clips.
- Drag/drop ingest from AE Project panel and local files.
- Tool palette: Select, Blade/Cut, Ripple, Rolling, Slip, Slide, Rate Stretch, Track Select, Zoom/Pan.
- Keyboard-driven editing workflow.
- Live sync behavior between AE timeline state and extension timeline view.

### Platform constraints to design around (explicitly stated on Railcut page)
- AE remains source of truth; extension is an interpretation layer.
- Performance equals AE preview performance.
- AE timeline must remain open during playback.
- No true J/L cuts when A/V is linked to same source layer handling.
- Playback playhead position is estimated during playback (API limitation), corrected when playback stops.
- No audio scrubbing/JKL reverse shuttle via AE scripting API.

## 3) Your Current Extension Setup (Asquarespace) - Exact Local Blueprint
Project inspected:
- /Users/aavirash/Desktop/After Effects Extension + Script Master/Asquarespace

### CEP wiring
- Manifest: `CSXS/manifest.xml`
  - Extension ID: `com.asquarespace.panel`
  - Host: `AEFT` versions `[20.0,99.9]`
  - Runtime: `CSXS 11.0`
  - `MainPath=./index.html`
  - `ScriptPath=./jsx/hostscript.jsx`
  - CEF flags enabled:
    - `--enable-nodejs`
    - `--mixed-context`
- CEP bridge JS is loaded (`js/CSInterface.js` and `CSInterface.evalScript(...)` usage in `js/main.js`).

### AE host script bridge
- `jsx/hostscript.jsx` provides:
  - `importFileToAE(filePathStr)` -> imports footage into project and places under folder `Asquarespace Assets`.
  - `importFileToAESelectedComp(filePathStr)` -> imports and inserts as layer in selected comp at current comp time.
  - `getAsquarespaceProjectKey()` -> per-project key for persistence mapping.

### Local machine live-update link (why edits reflect in AE)
- CEP extensions dir contains symlink:
  - `~/Library/Application Support/Adobe/CEP/extensions/Asquarespace -> /Users/aavirash/Desktop/After Effects Extension + Script Master/Asquarespace`
- This means AE loads extension files directly from your working folder, so file edits are picked up after panel reload/AE restart.

### Debug mode state (required for unsigned/dev CEP)
- `PlayerDebugMode=1` is enabled for:
  - `com.adobe.CSXS.9`
  - `com.adobe.CSXS.10`
  - `com.adobe.CSXS.11`
  - `com.adobe.CSXS.12`

### Existing reusable modules we should port
- Media Browser UI + local file scan (`loadLocalAssets`, selection grid, preview, add-to-canvas).
- AE import actions from selection:
  - `ctx-send-ae` -> `importFileToAE(...)`
  - `ctx-send-comp` -> `importFileToAESelectedComp(...)`
- Project persistence keyed by AE project identity.

## 4) AEEDIT Product Spec (Railcut-Style)

### 4.1 Primary user story
As an AE editor/motion designer, I want to ingest media, view clips on a track-based timeline with waveforms/thumbnails, and perform fast cuts/trims/ripple edits without leaving After Effects.

### 4.2 Panel layout
- Top: transport + timecode + snapping/timeline view toggles.
- Left: Media Browser (Project + Local tabs).
- Center: Multi-track timeline (video tracks above, audio below).
- Bottom/side: tool palette + inspector (clip properties, in/out, speed, linked/unlinked state).

### 4.3 Required settings/behaviors in panel
- Always-on sync indicator (`Live`, `Paused`, `Resync Needed`).
- Snap toggle (clips/playhead/markers).
- Waveform density mode (low/med/high for performance).
- Thumbnail mode (off/first frame/strip).
- Playback follow mode (playhead centered vs static).
- Auto-import target controls:
  - Project bin/folder name.
  - Insert to selected comp vs import only.
  - Insert at CTI vs append at end.

### 4.4 Media Browser spec
- Sources:
  - AE Project panel items (footage, audio, stills).
  - Local filesystem browser (folders + search + preview).
- Actions:
  - Drag to timeline -> insert/overwrite behavior.
  - Right-click: import only, add to selected comp, reveal in Finder.
- Metadata shown:
  - Name, duration, fps, resolution, sample rate/channels.

### 4.5 Timeline model
- Visual model is track/clip-based, mapped to AE layers.
- Layer-track mapping persisted per comp.
- Clip primitives:
  - start, end, sourceIn, sourceOut, linkedAudioVideo, speed, muted/locked.
- Display:
  - Video: thumbnails.
  - Audio: waveform preview.

### 4.6 Cut tool (Blade) behavior
- User action: click clip at playhead or pointer time.
- AE operation:
  - Duplicate source layer.
  - Set left segment out-point at cut time.
  - Set right segment in-point at cut time.
  - Preserve transforms/effects/parenting where possible.
- Multiselect cuts supported on targeted tracks.

### 4.7 Editing tools roadmap
- MVP tools:
  - Select/Move, Blade(Cut), Trim handles, Snap, Zoom/Pan.
- V1.1:
  - Ripple Edit, Rolling Edit.
- V1.2:
  - Slip, Slide, Rate Stretch.
- V1.3:
  - Marker editing + shortcut customization.

### 4.8 Keyboard shortcuts
- Presets: AE/Premiere style.
- Fully remappable in settings.
- Minimum MVP shortcuts:
  - `V` Select, `C` Cut, `A` Track Select, `S` Snap toggle, `+/-` zoom timeline.

## 5) Technical Architecture for AEEDIT

### 5.1 CEP app structure (recommended)
- `AEEDIT/`
  - `CSXS/manifest.xml`
  - `index.html`
  - `css/`
  - `js/`
  - `jsx/hostscript.jsx`
  - optional build output dir if bundler used

### 5.2 Host bridge contract (`hostscript.jsx`)
Expose focused functions:
- `aeedit_importFile(path)`
- `aeedit_insertFileAtCTI(path, compId)`
- `aeedit_getActiveCompSnapshot()` (layers, timings, ids, audio/video flags)
- `aeedit_splitLayerAtTime(layerId, t)`
- `aeedit_trimLayer(layerId, inT, outT)`
- `aeedit_moveLayerInTime(layerId, deltaT)`
- `aeedit_setLayerTrackIndex(layerId, trackIndex)` (metadata-driven)

### 5.3 Sync strategy
- Polling (e.g., 4-10 Hz) while panel active.
- Debounced full rescan when comp/layer structure changes.
- Pause polling when panel out of focus; resume with explicit re-sync.

### 5.4 Waveform/thumbnail strategy
- Generate from source media path via Node sidecar tools (or cached extraction service).
- Cache artifacts by hash + source mtime.
- Use low-res previews first, upgrade progressively.

## 6) Implementation Phases

### Phase 1 (Foundation)
- Clone Asquarespace CEP bootstrap into AEEDIT.
- New extension ID + menu name.
- Keep symlinked dev install in CEP extensions folder.
- Verify CSInterface <-> hostscript roundtrip.

### Phase 2 (Media Browser + ingest)
- Port/refactor media browser module from Asquarespace.
- Add timeline drop target + import modes.
- Add AE bin/selected comp insertion options.

### Phase 3 (Timeline MVP)
- Build track lanes + playhead + zoom/pan.
- Map AE layers to clips.
- Render thumbnails + cached waveforms.
- Implement select/move/trim + cut tool.

### Phase 4 (Advanced editing)
- Ripple/roll edits.
- Shortcut customization.
- Marker support.
- Better conflict handling when AE edits occur externally.

## 7) Risks and Mitigations
- AE scripting API limits realtime playback telemetry.
  - Mitigation: estimated playhead during playback; hard snap on stop.
- Heavy comps reduce responsiveness.
  - Mitigation: adaptive polling, lower visual detail modes.
- Linked A/V edit constraints.
  - Mitigation: explicit “linked edit” mode and user warnings.

## 8) Definition of Done for MVP
- Media browser imports local + project media.
- User can drag media to AEEDIT timeline and create clip/layer mapping.
- Timeline shows video thumbnails and audio waveforms.
- User can perform cut and trim actions that correctly update AE layers.
- Live sync indicator reflects panel/AE state and resync works reliably.
