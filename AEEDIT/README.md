# AE-Edit (CEP) - Dev Notes

## Live link setup (already done)
`~/Library/Application Support/Adobe/CEP/extensions/AEEDIT` is a symlink to:

`/Users/aavirash/Desktop/After Effects Extension + Script Master/AEEDIT`

So edits here are the same files AE loads.

## Open in After Effects
1. Restart AE (or reload CEP panel if you use a reloader).
2. Open panel: `Window > Extensions > AE-Edit`.
3. Select a comp and click `Refresh Timeline`.

## Current MVP actions
- `Refresh Timeline`: reads active comp + layers from AE.
- `Select (V)` and `Blade (C)` tools.
- Snap magnet toggle (`S`) for frame snapping.
- Timeline playhead indicator with scrub-to-time behavior (updates AE comp time).
- `Cut At CTI`: cuts selected layer at current comp time.
- `Pick Files`: choose local media files.
- `Import To Project`: imports selected media into AE project (`AEEDIT Assets` folder).
- `Insert At CTI`: imports and inserts selected media into active comp at current time.

## Keyboard
- `Ctrl+V`: select tool
- `Ctrl+C`: blade tool
- `S`: snap on/off
- `Cmd/Ctrl + X`: cut selected layer at CTI

## Core bridge methods (`jsx/hostscript.jsx`)
- `aeedit_getActiveCompSnapshot()`
- `aeedit_splitLayerAtTime(layerIndex, splitTime)`
- `aeedit_trimLayer(layerIndex, inPoint, outPoint)`
- `aeedit_importFile(path)`
- `aeedit_insertFileAtCTI(path)`
- `aeedit_ping()`
