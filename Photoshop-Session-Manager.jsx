/*
Photoshop-Session-Manager-scriptUI-GUI-v1B.jsx
Stephen Marsh
v1.1 - 27th October 2024, Single session save/restore
v1.1 - 27th October 2024, Extended the script to work with multiple sessions
https://community.adobe.com/t5/photoshop-ecosystem-discussions/scripts-to-save-amp-restore-photoshop-sessions/m-p/14239969
Inspiration from:
https://community.adobe.com/t5/photoshop-ecosystem-ideas/please-session-saving/idc-p/14169472
https://community.adobe.com/t5/photoshop-ecosystem-ideas/restore-previous-session/idc-p/14189928
*/

// TO DO LIST: RESTORE THE v1.0 FEATURE TO SET AND GET THE ACTIVE DOCUMENT...

#target photoshop

// Set the main UI window
var dlg = new Window("dialog", "Photoshop Session Manager (v1.1)");
dlg.orientation = "column";
dlg.alignChildren = ["fill", "top"];
dlg.preferredSize.width = 450;

// Radio buttons to select which script to run
var radioGroup = dlg.add("panel", undefined, "Save or Restore Session Documents");
radioGroup.orientation = "column";
radioGroup.alignChildren = ["left", "center"];
var saveRadio = radioGroup.add("radiobutton", undefined, "Save Current Session");
var restoreRadio = radioGroup.add("radiobutton", undefined, "Restore Saved Session");
saveRadio.value = true;

// Create restore session panel (always visible but inactive initially)
var restorePanel = dlg.add("panel", undefined, "Restore Saved Session Options");
restorePanel.orientation = "column";
restorePanel.alignChildren = ["fill", "top"];
restorePanel.visible = true;

// Add instructions text
//var instructionsText = restorePanel.add("statictext", undefined, "Select a session to restore:");
//instructionsText.alignment = "left";

// Create listbox for session logs
var logList = restorePanel.add("listbox", undefined, [], { multiselect: false });
logList.preferredSize = [430, 100];

// Add management controls checkbox
var enableManagementCheckbox = restorePanel.add("checkbox", undefined, "Enable Session Log Management Controls");
enableManagementCheckbox.value = false;

// Create management buttons group
var managementButtonGroup = restorePanel.add("group");
managementButtonGroup.orientation = "row";
managementButtonGroup.alignChildren = ["left", "center"];

var openFolderButton = managementButtonGroup.add("button", undefined, "Open Log Directory");
var deleteButton = managementButtonGroup.add("button", undefined, "Delete Selected Log");
var viewButton = managementButtonGroup.add("button", undefined, "View Log");

// Initially disable management buttons
openFolderButton.enabled = false;
deleteButton.enabled = false;
viewButton.enabled = false;

// Create button group for main dialog
var buttonGroup = dlg.add("group");
buttonGroup.orientation = "row";
buttonGroup.alignChildren = ["right", "center"];
var cancelButton = buttonGroup.add("button", undefined, "Cancel");
var okButton = buttonGroup.add("button", undefined, "OK", { name: "ok" });
okButton.preferredSize.width = 90;

// Function to refresh the log list
function refreshLogList() {
    // Clear existing items
    logList.removeAll();

    // Get all log files from preferences folder
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
        okButton.enabled = true;
    } else {
        logList.add("item", "No session log files found");
        deleteButton.enabled = false;
        openFolderButton.enabled = false;
        viewButton.enabled = false;
        okButton.enabled = false;
    }
}

// Function to set the enabled state of restore panel content
function setPanelEnabledState(state) {
    //instructionsText.enabled = state;
    logList.enabled = state;
    enableManagementCheckbox.enabled = state;
    openFolderButton.enabled = state && enableManagementCheckbox.value;
    deleteButton.enabled = state && enableManagementCheckbox.value;
    viewButton.enabled = state && logList.selection && logList.selection.file;
}

// Function to view log contents
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
    logTextArea.preferredSize.width = 450;
    logTextArea.preferredSize.height = 200;
    logTextArea.enabled = false; // Make it read-only

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

// Radio button handlers
saveRadio.onClick = function () {
    setPanelEnabledState(false); // Disable restore panel content
    okButton.text = "OK";
    okButton.enabled = true; // Ensure OK button is always active when Save Current Session is selected
    dlg.layout.layout(true);
};

restoreRadio.onClick = function () {
    setPanelEnabledState(true); // Enable restore panel content
    okButton.text = "Restore";
    refreshLogList();
    // Enable OK button only if there is a valid selection in the log list
    okButton.enabled = logList.selection && logList.selection.file;
    dlg.layout.layout(true);
};

// Ensure OK button state updates if logList selection changes
logList.onChange = function () {
    if (restoreRadio.value) {
        okButton.enabled = logList.selection && logList.selection.file;
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
                refreshLogList();
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

cancelButton.onClick = function () {
    dlg.close();
};

okButton.onClick = function () {
    if (saveRadio.value) {
        saveSession();
        dlg.close();
    } else if (restoreRadio.value && logList.selection && logList.selection.file) {
        restoreSpecificSession(logList.selection.file);
        dlg.close();
    }
};

function restoreSpecificSession(logFile) {
    try {
        var logContents = readPref(logFile);
        var hasAlerted = false;

        if (logContents.length > 0) {
            for (var m = 0; m < logContents.length; m++) {
                var filePath = logContents[m].replace(/^\s+|\s+$/g, '');  // Remove leading/trailing whitespace

                if (filePath !== "") {  // Check if the path is not empty
                    var docFile = new File(filePath);
                    if (docFile.exists) {
                        open(docFile);
                    } else {
                        alert("File not found: " + filePath);
                    }
                }
            }
        } else {
            alert("The selected log file is empty!");
            hasAlerted = true;
        }
    } catch (e) {
        alert("Error restoring session: " + e.message);
    }
}

function saveSession() {
    try {
        if (app.documents.length > 0) {
            var theDate = new Date();
            var year = theDate.getFullYear();
            var month = ('0' + (theDate.getMonth() + 1)).slice(-2);
            var day = ('0' + theDate.getDate()).slice(-2);
            var hours = ('0' + theDate.getHours()).slice(-2);
            var minutes = ('0' + theDate.getMinutes()).slice(-2);
            var seconds = ('0' + theDate.getSeconds()).slice(-2);
            var formattedDate = year + '-' + month + '-' + day + '_' + hours + '-' + minutes + '-' + seconds;

            var logFile = new File(app.preferencesFolder + "/" + "Photoshop Session - " + formattedDate + ".log");
            if (logFile.exists) logFile.remove();
            while (app.documents.length > 0) {
                app.activeDocument = app.documents[0];
                try {
                    activeDocument.path;
                    if (ExternalObject.AdobeXMPScript === undefined)
                        ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
                    var xmp = new XMPMeta(activeDocument.xmpMetadata.rawData);
                    xmp.deleteProperty(XMPConst.NS_PHOTOSHOP, "PreservedFileName");
                    activeDocument.xmpMetadata.rawData = xmp.serialize();
                    writePref(logFile, activeDocument.fullName.fsName);
                    activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                } catch (e) {
                    writePref(logFile, activeDocument.name);
                    activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                }
            }
        } else {
            alert("No documents open in the current session to save.");
        }
    } catch (e) {
        alert("Error saving session: " + e.message);
    }
}

function writePref(logFile, content) {
    logFile.open("a");
    logFile.writeln(content);
    logFile.close();
}

function readPref(logFile) {
    logFile.open("r");
    var content = [];
    while (!logFile.eof) {
        content.push(logFile.readln());
    }
    logFile.close();
    return content;
}

// Set initial dimmed state for restore panel
setPanelEnabledState(false);

// Display the dialog
dlg.show();
