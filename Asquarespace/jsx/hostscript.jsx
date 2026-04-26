// hostscript.jsx
function findAsquarespaceAssetsFolder() {
    var folderList = app.project.items;
    var exact = null;
    var legacy = null;
    for (var i = 1; i <= folderList.length; i++) {
        if (!(folderList[i] instanceof FolderItem)) {
            continue;
        }
        if (folderList[i].name === "Asquarespace Assets") {
            exact = folderList[i];
            break;
        }
        if (folderList[i].name === "InfinityBoard Assets") {
            legacy = folderList[i];
        }
    }
    return exact || legacy;
}

function getOrCreateAsquarespaceAssetsFolder() {
    var targetFolder = findAsquarespaceAssetsFolder();
    if (!targetFolder) {
        return app.project.items.addFolder("Asquarespace Assets");
    }
    if (targetFolder.name !== "Asquarespace Assets") {
        try {
            targetFolder.name = "Asquarespace Assets";
        } catch (_) {}
    }
    return targetFolder;
}

function importFileToAE(filePathStr) {
    try {
        var fileToImport = new File(filePathStr);
        if (!fileToImport.exists) {
            return "File does not exist: " + filePathStr;
        }

        var importOptions = new ImportOptions(fileToImport);
        
        if (app.project === null) {
            app.newProject();
        }

        if (importOptions.canImportAs(ImportAsType.FOOTAGE)) {
            importOptions.importAs = ImportAsType.FOOTAGE;
            app.beginUndoGroup("Asquarespace Import");
            var importedItem = app.project.importFile(importOptions);

            var targetFolder = getOrCreateAsquarespaceAssetsFolder();
            importedItem.parentFolder = targetFolder;
            
            app.endUndoGroup();
            return "Success: " + importedItem.name;
        } else {
            return "Cannot import as footage.";
        }
    } catch(e) {
        return "Error: " + e.toString();
    }
}

function importFileToAESelectedComp(filePathStr) {
    try {
        var fileToImport = new File(filePathStr);
        if (!fileToImport.exists) {
            return "File does not exist: " + filePathStr;
        }

        if (app.project === null) {
            app.newProject();
        }

        var activeItem = app.project.activeItem;
        if (!(activeItem && activeItem instanceof CompItem)) {
            return "No selected comp. Select a composition first.";
        }

        var importOptions = new ImportOptions(fileToImport);
        if (!importOptions.canImportAs(ImportAsType.FOOTAGE)) {
            return "Cannot import as footage.";
        }
        importOptions.importAs = ImportAsType.FOOTAGE;

        app.beginUndoGroup("Asquarespace Send To Comp");
        var importedItem = app.project.importFile(importOptions);

        var targetFolder = getOrCreateAsquarespaceAssetsFolder();
        importedItem.parentFolder = targetFolder;

        var layer = activeItem.layers.add(importedItem);
        layer.startTime = Math.max(0, activeItem.time);
        app.endUndoGroup();

        return "Success: Added to comp " + activeItem.name;
    } catch (e) {
        try { app.endUndoGroup(); } catch (_) {}
        return "Error: " + e.toString();
    }
}

function getAsquarespaceProjectKey() {
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
