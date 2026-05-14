/*
Photoshop-Session-Manager-scriptUI-GUI-v1A.jsx
Stephen Marsh
v1.1 - 27th October 2024, Single session save/restore
v1.1A - 27th October 2024, Extended the script to work with multiple sessions
https://community.adobe.com/t5/photoshop-ecosystem-discussions/scripts-to-save-amp-restore-photoshop-sessions/m-p/14239969
Inspiration from:
https://community.adobe.com/t5/photoshop-ecosystem-ideas/please-session-saving/idc-p/14169472
https://community.adobe.com/t5/photoshop-ecosystem-ideas/restore-previous-session/idc-p/14189928
*/

#target photoshop

// Set the main UI window
var dlg = new Window("dialog", "Photoshop Session Manager (v1.1)");
dlg.orientation = "column";
dlg.alignChildren = ["fill", "top"];
dlg.preferredSize.width = 450;

// Radio buttons to select which script to run
var radioGroup = dlg.add("panel", undefined, "Save or Restore Session Documents");
radioGroup.orientation = "row";
radioGroup.alignChildren = ["left", "center"];
var saveRadio = radioGroup.add("radiobutton", undefined, "Save Current Session");
var restoreRadio = radioGroup.add("radiobutton", undefined, "Restore Saved Session");
saveRadio.value = true;

// Create button group
var buttonGroup = dlg.add("group");
buttonGroup.orientation = "row";
buttonGroup.alignChildren = ["right", "center"];
var cancelButton = buttonGroup.add("button", undefined, "Cancel");
var okButton = buttonGroup.add("button", undefined, "OK", { name: "ok" });

// Add radio button change handlers to update OK button text
saveRadio.onClick = function () {
    okButton.text = "OK";
};

restoreRadio.onClick = function () {
    okButton.text = "Next";
};

cancelButton.onClick = function () {
    dlg.close();
};

okButton.onClick = function () {
    if (saveRadio.value) {
        saveSession();
        dlg.close();
    } else if (restoreRadio.value) {
        dlg.close();
        showRestoreSessionWindow();
    }
};

// Function to show the restore session window
function showRestoreSessionWindow() {
    // Get all log files from preferences folder
    var logFilePath = Folder(app.preferencesFolder);
    var logFiles = logFilePath.getFiles("Photoshop Session*.log");

    // Create a new window to display the log files
    var restoreWindow = new Window("dialog", "Session Log Files");
    restoreWindow.orientation = "column";
    restoreWindow.alignChildren = ["fill", "top"];
    restoreWindow.preferredSize.width = 450;

    // Add instructions text
    var instructionsText = restoreWindow.add("statictext", undefined, "Select a session to restore:");
    instructionsText.alignment = "left";

    // Create panel for the list
    var listPanel = restoreWindow.add("panel");
    listPanel.alignChildren = "fill";

    // Create listbox
    var logList = listPanel.add("listbox", undefined, [], { multiselect: false });
    logList.preferredSize = [450, 100];

    // Function to refresh the list
    function refreshLogList() {
        // Clear existing items
        logList.removeAll();

        // Get updated list of files
        logFiles = logFilePath.getFiles("Photoshop Session*.log");

        if (logFiles && logFiles.length > 0) {
            for (var i = logFiles.length - 1; i >= 0; i--) {
                var logFile = logFiles[i];
                var item = logList.add("item", decodeURI(logFile.name));
                item.file = logFile;
            }
            logList.selection = 0;
            if (deleteButton) deleteButton.enabled = enableManagementCheckbox.value;
            if (openFolderButton) openFolderButton.enabled = enableManagementCheckbox.value;
            if (restoreButton) restoreButton.enabled = true;
            if (viewButton) viewButton.enabled = true;
        } else {
            logList.add("item", "No session log files found");
            if (deleteButton) deleteButton.enabled = false;
            if (openFolderButton) openFolderButton.enabled = false;
            if (restoreButton) restoreButton.enabled = false;
            if (viewButton) viewButton.enabled = false;
        }
    }

    // Initially populate the list
    refreshLogList();

    // Add management controls checkbox
    var enableManagementCheckbox = restoreWindow.add("checkbox", undefined, "Enable Session Log Management Controls");
    enableManagementCheckbox.value = false; // Disabled by default

    // Create button groups
    var actionButtonGroup = restoreWindow.add("group");
    actionButtonGroup.orientation = "row";
    actionButtonGroup.alignChildren = ["left", "center"];

    var openFolderButton = actionButtonGroup.add("button", undefined, "Open Log Directory");
    var deleteButton = actionButtonGroup.add("button", undefined, "Delete Selected Log");

    // Initially disable management buttons
    openFolderButton.enabled = false;
    deleteButton.enabled = false;

    // Create a button group for Restore and Cancel
    var restoreButtonGroup = restoreWindow.add("group");
    restoreButtonGroup.orientation = "row";
    restoreButtonGroup.alignChildren = ["right", "center"];

    var restoreCancelButton = restoreButtonGroup.add("button", undefined, "Cancel");
    var viewButton = restoreButtonGroup.add("button", undefined, "View Log");
    var restoreButton = restoreButtonGroup.add("button", undefined, "OK", { name: "restore" });

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

    // Checkbox handler
    enableManagementCheckbox.onClick = function () {
        var hasFiles = logFiles && logFiles.length > 0;
        openFolderButton.enabled = this.value;
        deleteButton.enabled = this.value && hasFiles;
    };

    // Open folder button handler
    openFolderButton.onClick = function () {
        logFilePath.execute();
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

    // Button handlers
    restoreCancelButton.onClick = function () {
        restoreWindow.close();
    };

    restoreButton.onClick = function () {
        if (logList.selection && logList.selection.file) {
            // Read the selected log file and restore its session
            var selectedLogFile = logList.selection.file;
            restoreSpecificSession(selectedLogFile);
            restoreWindow.close();
        }
    };

    // Initial button states
    if (logFiles.length === 0) {
        deleteButton.enabled = false;
        openFolderButton.enabled = false;
        restoreButton.enabled = false;
        viewButton.enabled = false;
    }

    restoreWindow.show();
}

// New function to restore a specific session from a log file
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
            // ~/Library/Preferences/Adobe Photoshop 2024 Settings/
            var logFile = new File(app.preferencesFolder + "/" + "Photoshop Session " + formattedDate + ".log");
            if (logFile.exists) logFile.remove();
            while (app.documents.length > 0) {
                app.activeDocument = app.documents[0];
                try {
                    activeDocument.path;
                    if (ExternalObject.AdobeXMPScript === undefined)
                        ExternalObject.AdobeXMPScript = new ExternalObject('lib:AdobeXMPScript');
                    var xmp = new XMPMeta(activeDocument.xmpMetadata.rawData);
                    var crsMeta = xmp.getProperty(XMPConst.NS_CAMERA_RAW, "Version");
                    if ((/\.(RAF|CR2|CR3|NRW|ERF|RW2|NEF|ARW|RWZ|EIP|DNG|BAY|DCR|RAW|CRW|3FR|K25|KC2|MEF|DNG|CS1|ORF|ARI|SR2|MOS|CR3|GPR|SRW|MFW|FFF|SRF|KDC|MRW|J6I|RWL|X3F|PEF|IIQ|CXI|NKSC|MDC)$/i).test(activeDocument.fullName) === true && crsMeta !== undefined) {
                        saveAsDefault();
                        writePathToLog();
                        activeDocument.close(SaveOptions.DONOTSAVECHANGES);
                    } else if (activeDocument.path) {
                        writePathToLog();
                        activeDocument.close(SaveOptions.SAVECHANGES);
                    }
                } catch (e) {
                    executeAction(stringIDToTypeID("save"), undefined, DialogModes.ALL);
                    writePathToLog();
                    activeDocument.close(SaveOptions.SAVECHANGES);
                }
            }

        } else {
            alert('A document must be open when running this script!');
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
}

function writePathToLog() {
    var decodedPath = decodeURI(activeDocument.path);
    var decodedFilename = decodeURI(activeDocument.name);

    var theDate = new Date();
    var year = theDate.getFullYear();
    var month = ('0' + (theDate.getMonth() + 1)).slice(-2);
    var day = ('0' + theDate.getDate()).slice(-2);
    var hours = ('0' + theDate.getHours()).slice(-2);
    var minutes = ('0' + theDate.getMinutes()).slice(-2);
    var seconds = ('0' + theDate.getSeconds()).slice(-2);
    var formattedDate = year + '-' + month + '-' + day + '_' + hours + '-' + minutes + '-' + seconds;

    var logFile = new File(app.preferencesFolder + "/" + "Photoshop Session " + formattedDate + ".log");
    var os = $.os.toLowerCase().indexOf("mac") >= 0 ? "mac" : "windows";
    logFile.open("a");
    logFile.encoding = "UTF-8";
    logFile.lineFeed = os === "mac" ? "Unix" : "Windows";
    logFile.writeln(decodedPath + "/" + decodedFilename);
    logFile.close();
}

function saveAsDefault() {
    function s2t(s) { return app.stringIDToTypeID(s); }
    var descriptor = new ActionDescriptor();
    descriptor.putObject(s2t("as"), s2t("photoshop35Format"), descriptor);
    descriptor.putPath(s2t("in"), new File("~/Desktop" + "/" + activeDocument.name));
    descriptor.putBoolean(s2t("lowerCase"), true);
    executeAction(s2t("save"), descriptor, DialogModes.ALL);
}

function readPref(thePath) {
    var logFile = new File(thePath);
    var logContents = [];
    if (logFile.exists) {
        logFile.open("r");
        while (!logFile.eof) {
            logContents.push(logFile.readln());
        }
        logFile.close();
    }
    return logContents;
}

// Show the main dialog
dlg.show();
