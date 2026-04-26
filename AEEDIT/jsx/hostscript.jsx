function aeedit_ensureProject() {
    if (app.project === null) {
        app.newProject();
    }
}

function aeedit_getOrCreateAssetsFolder() {
    var folderList = app.project.items;
    var target = null;
    for (var i = 1; i <= folderList.length; i++) {
        if (folderList[i] instanceof FolderItem && folderList[i].name === "AEEDIT Assets") {
            target = folderList[i];
            break;
        }
    }
    if (!target) {
        target = app.project.items.addFolder("AEEDIT Assets");
    }
    return target;
}

function aeedit_importFile(filePathStr) {
    try {
        aeedit_ensureProject();
        var fileToImport = new File(filePathStr);
        if (!fileToImport.exists) {
            return "Error: File does not exist: " + filePathStr;
        }

        var importOptions = new ImportOptions(fileToImport);
        if (!importOptions.canImportAs(ImportAsType.FOOTAGE)) {
            return "Error: Cannot import as footage";
        }

        importOptions.importAs = ImportAsType.FOOTAGE;

        app.beginUndoGroup("AEEDIT Import File");
        var importedItem = app.project.importFile(importOptions);
        importedItem.parentFolder = aeedit_getOrCreateAssetsFolder();
        app.endUndoGroup();

        return "Success: " + importedItem.name;
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        return "Error: " + e.toString();
    }
}

function aeedit_insertFileAtCTI(filePathStr) {
    try {
        aeedit_ensureProject();

        var activeItem = app.project.activeItem;
        if (!(activeItem && activeItem instanceof CompItem)) {
            return "Error: Select an active composition first";
        }

        var fileToImport = new File(filePathStr);
        if (!fileToImport.exists) {
            return "Error: File does not exist: " + filePathStr;
        }

        var importOptions = new ImportOptions(fileToImport);
        if (!importOptions.canImportAs(ImportAsType.FOOTAGE)) {
            return "Error: Cannot import as footage";
        }

        importOptions.importAs = ImportAsType.FOOTAGE;

        app.beginUndoGroup("AEEDIT Insert At CTI");
        var importedItem = app.project.importFile(importOptions);
        importedItem.parentFolder = aeedit_getOrCreateAssetsFolder();

        var layer = activeItem.layers.add(importedItem);
        layer.startTime = activeItem.time;
        app.endUndoGroup();

        return "Success: Inserted " + importedItem.name + " at " + activeItem.time;
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        return "Error: " + e.toString();
    }
}

function aeedit_getActiveCompSnapshot() {
    try {
        if (!app.project) {
            return JSON.stringify({ ok: false, error: "No project" });
        }

        var activeItem = app.project.activeItem;
        if (!(activeItem && activeItem instanceof CompItem)) {
            return JSON.stringify({ ok: false, error: "No active composition selected" });
        }

        var out = {
            ok: true,
            comp: {
                id: activeItem.id,
                name: activeItem.name,
                width: activeItem.width,
                height: activeItem.height,
                duration: activeItem.duration,
                fps: activeItem.frameRate,
                time: activeItem.time
            },
            layers: []
        };

        for (var i = 1; i <= activeItem.numLayers; i++) {
            var layer = activeItem.layer(i);
            var srcName = "";
            try {
                if (layer.source && layer.source.name) {
                    srcName = layer.source.name;
                }
            } catch (_) {}

            var hasAudio = false;
            try {
                hasAudio = layer.hasAudio;
            } catch (_) {}

            var hasVideo = true;
            try {
                hasVideo = layer.hasVideo;
            } catch (_) {}

            out.layers.push({
                index: layer.index,
                name: layer.name,
                sourceName: srcName,
                inPoint: layer.inPoint,
                outPoint: layer.outPoint,
                startTime: layer.startTime,
                enabled: layer.enabled,
                locked: layer.locked,
                shy: layer.shy,
                hasAudio: hasAudio,
                hasVideo: hasVideo,
                stretch: layer.stretch
            });
        }

        return JSON.stringify(out);
    } catch (e) {
        return JSON.stringify({ ok: false, error: e.toString() });
    }
}

function aeedit_splitLayerAtTime(layerIndex, splitTime) {
    try {
        if (!app.project) {
            return "Error: No project";
        }

        var activeItem = app.project.activeItem;
        if (!(activeItem && activeItem instanceof CompItem)) {
            return "Error: No active composition selected";
        }

        var indexNum = parseInt(layerIndex, 10);
        if (!(indexNum >= 1 && indexNum <= activeItem.numLayers)) {
            return "Error: Invalid layer index";
        }

        var t = parseFloat(splitTime);
        if (isNaN(t)) {
            return "Error: Invalid split time";
        }

        var layer = activeItem.layer(indexNum);
        if (layer.locked) {
            return "Error: Layer is locked";
        }

        if (t <= layer.inPoint || t >= layer.outPoint) {
            return "Error: Split time must be inside layer in/out";
        }

        app.beginUndoGroup("AEEDIT Cut Layer");
        var right = layer.duplicate();
        layer.outPoint = t;
        right.inPoint = t;
        app.endUndoGroup();

        return "Success: Cut layer " + layer.name + " at " + t;
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        return "Error: " + e.toString();
    }
}

function aeedit_trimLayer(layerIndex, newInPoint, newOutPoint) {
    try {
        var activeItem = app.project.activeItem;
        if (!(activeItem && activeItem instanceof CompItem)) {
            return "Error: No active composition selected";
        }

        var indexNum = parseInt(layerIndex, 10);
        if (!(indexNum >= 1 && indexNum <= activeItem.numLayers)) {
            return "Error: Invalid layer index";
        }

        var layer = activeItem.layer(indexNum);
        if (layer.locked) {
            return "Error: Layer is locked";
        }

        var inT = parseFloat(newInPoint);
        var outT = parseFloat(newOutPoint);
        if (isNaN(inT) || isNaN(outT) || inT >= outT) {
            return "Error: Invalid trim range";
        }

        app.beginUndoGroup("AEEDIT Trim Layer");
        layer.inPoint = inT;
        layer.outPoint = outT;
        app.endUndoGroup();

        return "Success: Trimmed layer " + layer.name;
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        return "Error: " + e.toString();
    }
}

function aeedit_getProjectKey() {
    try {
        if (!app.project) {
            return "no-project";
        }

        var projFile = app.project.file;
        if (projFile && projFile.exists) {
            return "file:" + projFile.fsName;
        }

        var projName = "Untitled Project";
        if (app.project.rootFolder && app.project.rootFolder.name) {
            projName = app.project.rootFolder.name;
        }
        return "unsaved:" + projName;
    } catch (e) {
        return "error:" + e.toString();
    }
}

function aeedit_ping() {
    return "AEEDIT bridge ready";
}

function aeedit_setActiveCompTime(newTime) {
    try {
        var activeItem = app.project.activeItem;
        if (!(activeItem && activeItem instanceof CompItem)) {
            return "Error: No active composition selected";
        }
        var t = parseFloat(newTime);
        if (isNaN(t)) {
            return "Error: Invalid time";
        }
        if (t < 0) t = 0;
        if (t > activeItem.duration) t = activeItem.duration;
        activeItem.time = t;
        return "Success: Time set to " + t;
    } catch (e) {
        return "Error: " + e.toString();
    }
}
