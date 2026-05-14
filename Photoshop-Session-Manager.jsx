/*
Photoshop-Session-Manager-scriptUI-GUI-v2-1B.jsx
Stephen Marsh
v1.0 - 27th October 2024, Single session save/restore
v2.0 - 27th October 2024, Extended the script to work with multiple sessions
v2.1 - 2nd November 2024, Minor cosmetic layout changes, log files now listed in descending modified sort order
https://community.adobe.com/t5/photoshop-ecosystem-discussions/scripts-to-save-amp-restore-photoshop-sessions/m-p/14239969
Inspiration from:
https://community.adobe.com/t5/photoshop-ecosystem-ideas/please-session-saving/idc-p/14169472
https://community.adobe.com/t5/photoshop-ecosystem-ideas/restore-previous-session/idc-p/14189928
*/

#target photoshop

// Set the main UI window
var dlg = new Window("dialog", "Photoshop Session Manager (v2.1)");
dlg.orientation = "column";
dlg.alignChildren = ["fill", "top"];
dlg.preferredSize.width = 450;

// Checkbox panel to select the save or restore functions
var checkboxGroup = dlg.add("panel", undefined, "Save or Restore Session Documents");
checkboxGroup.orientation = "column";
checkboxGroup.alignChildren = ["left", "center"];

// Group the checkboxes in a nested panel to keep them mutually exclusive
var buttonPanel = checkboxGroup.add("group");
buttonPanel.orientation = "column";
buttonPanel.alignChildren = ["left", "center"];

// "Save Current Session" checkbox
var saveCheckbox = buttonPanel.add("checkbox", undefined, "Save && Close Current Session Documents");
saveCheckbox.value = true;

// Optional session naming field label
var sessionNameHelp = buttonPanel.add("statictext", undefined, "Optional Custom Session Name:");

// Optional session naming field
var sessionNameInput = buttonPanel.add("edittext", undefined, "");
sessionNameInput.helpTip = "(Leave blank to use timestamp as session name)";
sessionNameInput.preferredSize.width = 450;

// Panel separator line
var separatorLine = buttonPanel.add("panel");
separatorLine.alignment = "fill";
separatorLine.preferredSize.height = 1;

// "Restore Saved Session" checkbox
var restoreCheckbox = buttonPanel.add("checkbox", undefined, "Restore Saved Session Documents");

// Create restore session panel (initially inactive)
var restorePanel = dlg.add("panel", undefined, "Restore Saved Session Options");
restorePanel.orientation = "column";
restorePanel.alignChildren = ["fill", "top"];
restorePanel.visible = true;

// Create listbox for session logs
var logList = restorePanel.add("listbox", undefined, [], { multiselect: false });
logList.preferredSize = [450, 150];

// Add management controls checkbox
var enableManagementCheckbox = restorePanel.add("checkbox", undefined, "Session Log File Management");
enableManagementCheckbox.value = false;

// Create management buttons group
var managementButtonGroup = restorePanel.add("group");
managementButtonGroup.orientation = "row";
managementButtonGroup.alignChildren = ["fill", "center"];

var viewButton = managementButtonGroup.add("button", undefined, "View Log");
var deleteButton = managementButtonGroup.add("button", undefined, "Delete Selected Log");
var openFolderButton = managementButtonGroup.add("button", undefined, "Open Log Directory");

// Initially disable the management buttons
openFolderButton.enabled = false;
deleteButton.enabled = false;
viewButton.enabled = false;

// Create button group for main dialog
var buttonGroup = dlg.add("group");
buttonGroup.orientation = "row";
buttonGroup.alignChildren = ["right", "center"];
var cancelButton = buttonGroup.add("button", undefined, "Cancel");
var saveButton = buttonGroup.add("button", undefined, "Save", { name: "save" });
saveButton.preferredSize.width = 90;

/*
function refreshLogList() {
    logList.removeAll();
    // ~/Library/Preferences/Adobe Photoshop #### Settings
    var logFilePath = Folder(app.preferencesFolder);
    var logFiles = logFilePath.getFiles("Photoshop Session - *.log");

    if (logFiles && logFiles.length > 0) {
        for (var i = logFiles.length - 1; i >= 0; i--) {
            var logFile = logFiles[i];
            var item = logList.add("item", decodeURI(logFile.name));
            item.file = logFile;
        }
        logList.selection = 0;
        deleteButton.enabled = enableManagementCheckbox.value;
        openFolderButton.enabled = enableManagementCheckbox.value;
        viewButton.enabled = true;
        saveButton.enabled = true;
    } else {
        logList.add("item", "No session log files found");
        deleteButton.enabled = false;
        openFolderButton.enabled = false;
        viewButton.enabled = false;
        saveButton.enabled = false;
    }
}
*/

function refreshLogListByModifed() {
    logList.removeAll();
    // ~/Library/Preferences/Adobe Photoshop #### Settings
    var logFilePath = Folder(app.preferencesFolder);
    var logFiles = logFilePath.getFiles("Photoshop Session - *.log");

    if (logFiles && logFiles.length > 0) {
        // Sort the files by modified date in descending order
        logFiles.sort(function (a, b) {
            return b.modified - a.modified;
        });

        // Add each log file to the list
        for (var i = 0; i < logFiles.length; i++) {
            var logFile = logFiles[i];
            var item = logList.add("item", decodeURI(logFile.name));
            item.file = logFile;
        }

        logList.selection = 0;
        deleteButton.enabled = enableManagementCheckbox.value;
        openFolderButton.enabled = enableManagementCheckbox.value;
        viewButton.enabled = true;
        saveButton.enabled = true;
    } else {
        logList.add("item", "No session log files found");
        deleteButton.enabled = false;
        openFolderButton.enabled = false;
        viewButton.enabled = false;
        saveButton.enabled = false;
    }
}

function setPanelEnabledState(state) {
    logList.enabled = state;
    enableManagementCheckbox.enabled = state;
    openFolderButton.enabled = state && enableManagementCheckbox.value;
    deleteButton.enabled = state && enableManagementCheckbox.value;
    viewButton.enabled = state && logList.selection && logList.selection.file;
    sessionNameInput.enabled = !state; // Enable session name input only when saving
    // Set the text color to dimmed gray when restore is active
    sessionNameHelp.graphics.foregroundColor = sessionNameHelp.graphics.newPen(
        sessionNameHelp.graphics.PenType.SOLID_COLOR,
        state ? [0.5, 0.5, 0.5] : [1, 1, 1],
        1
    );
}

// Checkbox handlers for radio button-like behavior
saveCheckbox.onClick = function () {
    // If trying to uncheck the currently checked box
    if (!saveCheckbox.value && !restoreCheckbox.value) {
        // Prevent unchecking by keeping this checkbox checked
        saveCheckbox.value = true;
        return;
    }

    if (saveCheckbox.value) {
        restoreCheckbox.value = false;
        setPanelEnabledState(false);
        saveButton.text = "Save";
        saveButton.enabled = true;
    }
    dlg.layout.layout(true);
};

restoreCheckbox.onClick = function () {
    // If trying to uncheck the currently checked box
    if (!restoreCheckbox.value && !saveCheckbox.value) {
        // Prevent unchecking by keeping this checkbox checked
        restoreCheckbox.value = true;
        return;
    }

    if (restoreCheckbox.value) {
        saveCheckbox.value = false;
        setPanelEnabledState(true);
        saveButton.text = "Restore";
        //refreshLogList();
        refreshLogListByModifed();
        saveButton.enabled = logList.selection && logList.selection.file;
    }
    dlg.layout.layout(true);
};

// Initialize with save checkbox selected by default
saveCheckbox.value = true;
restoreCheckbox.value = false;
setPanelEnabledState(false);

// Ensure Save button state updates if logList selection changes
logList.onChange = function () {
    if (restoreCheckbox.value) {
        saveButton.enabled = logList.selection && logList.selection.file;
    }
};

// Checkbox handler
enableManagementCheckbox.onClick = function () {
    openFolderButton.enabled = this.value;
    deleteButton.enabled = this.value && logList.selection && logList.selection.file;
};

// Open folder button handler
openFolderButton.onClick = function () {
    Folder(app.preferencesFolder).execute();
};

// Delete button handler
deleteButton.onClick = function () {
    if (logList.selection && logList.selection.file) {
        var selectedFile = logList.selection.file;
        var confirmDelete = confirm("Are you sure you want to delete the selected log file?\n" + decodeURI(selectedFile.name));

        if (confirmDelete) {
            try {
                selectedFile.remove();
                //refreshLogList();
                refreshLogListByModifed();
            } catch (e) {
                alert("Error deleting file: " + e.message);
            }
        }
    }
};

// View button handler
viewButton.onClick = function () {
    if (logList.selection && logList.selection.file) {
        viewLogContents(logList.selection.file);
    }
};

// Cancel button handler
cancelButton.onClick = function () {
    dlg.close();
};

// Save button handler with exit/return
saveButton.onClick = function () {
    if (saveCheckbox.value) {
        if (app.documents.length === 0) {
            alert("No documents open in the current session to save.");
            dlg.close();
            return;
        }
        saveSession();
        dlg.close();
    } else if (restoreCheckbox.value && logList.selection && logList.selection.file) {
        restoreSession(logList.selection.file);
        dlg.close();
    }
};

function restoreSession(logFile) {
    try {
        var logContents = readPref(logFile);

        if (logContents.length > 0) {
            for (var m = 4; m < logContents.length; m++) {
                var filePath = logContents[m].replace(/^\s+|\s+$/g, '');

                if (filePath !== "") {
                    var docFile = new File(filePath);
                    if (docFile.exists) {
                        open(docFile);
                    } else {
                        alert("File not found: " + filePath);
                    }
                }
            }

            var theActiveDocName = logContents[2];
            for (var a = 0; a < app.documents.length; a++) {
                if (app.documents[a].name === theActiveDocName) {
                    app.activeDocument = app.documents[a];
                    break;
                }
            }

        } else {
            alert("The selected log file is empty!");
        }
    } catch (e) {
        alert("Error restoring session: " + e.message);
    }
}

function saveSession() {
    try {
        var theDate = new Date();
        var year = theDate.getFullYear();
        var month = ('0' + (theDate.getMonth() + 1)).slice(-2);
        var day = ('0' + theDate.getDate()).slice(-2);
        var hours = ('0' + theDate.getHours()).slice(-2);
        var minutes = ('0' + theDate.getMinutes()).slice(-2);
        var seconds = ('0' + theDate.getSeconds()).slice(-2);
        var formattedDate = year + '-' + month + '-' + day + '_' + hours + '-' + minutes + '-' + seconds;

        var sessionName = sessionNameInput.text;
        while (sessionName.charAt(0) === ' ') {
            sessionName = sessionName.substring(1);
        }
        while (sessionName.charAt(sessionName.length - 1) === ' ') {
            sessionName = sessionName.substring(0, sessionName.length - 1);
        }
        var fileName = sessionName !== "" ? sessionName : formattedDate;
        fileName = fileName.replace(/[<>:"\/\\|?*]/g, "-");

        var logFile = new File(app.preferencesFolder + "/" + "Photoshop Session - " + fileName + ".log");
        if (logFile.exists) logFile.remove();

        logFile.open("a");
        logFile.writeln("--------------------\nActive Doc:\n" + activeDocument.name + "\n--------------------");
        logFile.close();

        while (app.documents.length > 0) {
            app.activeDocument = app.documents[0];
            try {
                activeDocument.path;
                writePref(logFile, activeDocument.fullName.fsName);
            } catch (e) { }
            activeDocument.close(SaveOptions.DONOTSAVECHANGES);
        }

    } catch (e) {
        alert("Error saving session: " + e.message);
    }
}

function viewLogContents(logFile) {
    var logContents = readPref(logFile);

    // Create view window
    var viewWindow = new Window("dialog", "Log Contents: " + decodeURI(logFile.name));
    viewWindow.orientation = "column";
    viewWindow.alignChildren = ["fill", "top"];

    // Add scrollable text area
    var logTextArea = viewWindow.add("edittext", undefined, logContents.join("\n"), {
        multiline: true,
        scrollable: true
    });
    logTextArea.preferredSize.width = 550;
    logTextArea.preferredSize.height = 300;
    //logTextArea.enabled = false; // Make it read-only
    // Intercept key events to prevent modifications
    logTextArea.addEventListener('keydown', function (event) {
        event.preventDefault();
    });

    // Add close button
    var closeButtonGroup = viewWindow.add("group");
    closeButtonGroup.orientation = "row";
    closeButtonGroup.alignChildren = ["right", "center"];
    var closeButton = closeButtonGroup.add("button", undefined, "Close");

    closeButton.onClick = function () {
        viewWindow.close();
    };

    viewWindow.show();
}

function writePref(logFile, string) {
    logFile.open("e");
    logFile.seek(0, 2);
    logFile.writeln(string);
    logFile.close();
}

function readPref(logFile) {
    if (!logFile.exists) return [];
    logFile.open("r");
    var logContents = [];
    while (!logFile.eof) {
        logContents.push(logFile.readln());
    }
    logFile.close();
    return logContents;
}

// Open the main script dialog window
dlg.show();
