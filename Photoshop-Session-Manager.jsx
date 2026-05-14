/*
Photoshop-Session-Manager-scriptUI-GUI-v1.jsx
v1.0 - 27th October 2024, Stephen Marsh
https://community.adobe.com/t5/photoshop-ecosystem-discussions/scripts-to-save-amp-restore-photoshop-sessions/m-p/14239969
Inspiration from:
https://community.adobe.com/t5/photoshop-ecosystem-ideas/please-session-saving/idc-p/14169472
https://community.adobe.com/t5/photoshop-ecosystem-ideas/restore-previous-session/idc-p/14189928
*/

#target photoshop

// Set the main UI window
var dlg = new Window("dialog", "Photoshop Session Manager (v1.0)");
dlg.orientation = "column";
dlg.alignChildren = ["fill", "top"];
dlg.preferredSize.width = 425;

// Radio buttons to select which script to run
var radioGroup = dlg.add("panel", undefined, "Save or Restore Session Documents");
radioGroup.orientation = "row";
radioGroup.alignChildren = ["left", "center"];
var saveRadio = radioGroup.add("radiobutton", undefined, "Save Current Session");
var restoreRadio = radioGroup.add("radiobutton", undefined, "Restore Saved Session");
saveRadio.value = true;

// Add checkbox for viewing saved sessions
var viewSessionsCheckbox = dlg.add("checkbox", undefined, "View Saved Session Document List");
viewSessionsCheckbox.enabled = false; // Initially disabled since Save Session is selected by default

// Update checkbox enabled state when radio buttons change
saveRadio.onClick = function () {
    viewSessionsCheckbox.enabled = false;
    viewSessionsCheckbox.value = false;
};

restoreRadio.onClick = function () {
    viewSessionsCheckbox.enabled = true;
};

// Create button group
var buttonGroup = dlg.add("group");
buttonGroup.orientation = "row";
buttonGroup.alignChildren = ["right", "center"];
var cancelButton = buttonGroup.add("button", undefined, "Cancel");
var okButton = buttonGroup.add("button", undefined, "OK", { name: "ok" });

cancelButton.onClick = function () {
    dlg.close();
};

okButton.onClick = function () {
    if (saveRadio.value) {
        // Check for open documents before proceeding with save
        if (app.documents.length === 0) {
            alert('A document must be open when running this script!');
            return;
        }
        saveSession();
    } else if (restoreRadio.value) {
        if (viewSessionsCheckbox.value) {
            showRestoreSessionWindow(); // Open the restore session window
        } else {
            restoreSession(); // Direct restore without showing the list
        }
    }
    dlg.close();
};

// Function to show the restore session window
function showRestoreSessionWindow() {
    // ~/Library/Preferences/Adobe Photoshop 2024 Settings/
    var logFilePath = new File(app.preferencesFolder + "/" + "Photoshop Session Document Paths.log");

    if (logFilePath.exists && logFilePath.length > 0) {
        var logContents = readPref(logFilePath);

        // Create a new window to display the log contents
        var restoreWindow = new Window("dialog", "Saved Session List");
        restoreWindow.orientation = "column";
        restoreWindow.alignChildren = ["fill", "top"];
        restoreWindow.preferredSize.width = 375;

        // Add a static text area to show log contents
        var logTextArea = restoreWindow.add("edittext", undefined, logContents.join("\n"), { multiline: true, scrollable: true });
        logTextArea.preferredSize.height = 200;
        logTextArea.enabled = false; // Make it read-only

        // Create a button group for Restore and Cancel
        var restoreButtonGroup = restoreWindow.add("group");
        restoreButtonGroup.orientation = "row";
        restoreButtonGroup.alignChildren = ["right", "center"];

        var restoreCancelButton = restoreButtonGroup.add("button", undefined, "Cancel");
        var restoreButton = restoreButtonGroup.add("button", undefined, "Restore", { name: "restore" });

        restoreCancelButton.onClick = function () {
            restoreWindow.close();
        };

        restoreButton.onClick = function () {
            restoreSession();
            restoreWindow.close();
        };

        restoreWindow.show(); // Show the restore session window
    } else {
        alert("The log file 'Photoshop Session Document Paths.log' doesn't exist or is empty!");
    }
}

// Functions

function saveSession() {
    try {
        // ~/Library/Preferences/Adobe Photoshop 2024 Settings/
        var logFile = new File(app.preferencesFolder + "/" + "Photoshop Session Document Paths.log");
        if (logFile.exists) logFile.remove();

        // Log the active document name on line 2
        logFile.open("a");
        logFile.writeln("--------------------\nActive Doc:\n" + activeDocument.name + "\n--------------------");
        logFile.close();

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
    } catch (e) {
        alert("Error: " + e.message);
    }
}

function restoreSession() {
    try {
        var logFilePath = readPref(app.preferencesFolder + "/" + "Photoshop Session Document Paths.log");
        var hasAlerted = false;

        if (logFilePath.length > 0) {
            // Restore documents from the log file
            for (var m = 4; m < logFilePath.length; m++) {
                var filePath = logFilePath[m].replace(/^\s+|\s+$/g, '');  // Remove leading/trailing whitespace

                if (filePath !== "") {  // Check if the path is not empty
                    var docFile = new File(filePath);
                    if (docFile.exists) {
                        open(docFile);
                    } else {
                        alert("File not found: " + filePath);
                    }
                }
            }

            // Set the previously active document after the session has been restored
            var theActiveDocName = logFilePath[2]; // zero indexed, third line
            for (var a = 0; a < app.documents.length; a++) {
                if (app.documents[a].name === theActiveDocName) {
                    app.activeDocument = app.documents[a];
                    break;
                }
            }

        } else {
            alert("The log file 'Photoshop Session Document Paths.log' doesn't exist or is empty!");
            hasAlerted = true;
        }
    } catch (e) {
        alert("Error: " + e.message);
    }
}

function writePathToLog() {
    var decodedPath = decodeURI(activeDocument.path);
    var decodedFilename = decodeURI(activeDocument.name);
    var logFile = new File(app.preferencesFolder + "/" + "Photoshop Session Document Paths.log");
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
