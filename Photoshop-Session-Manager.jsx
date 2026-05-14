/*

Photoshop-Session-Manager-scriptUI-GUI-v2-3C.jsx
Stephen Marsh

v1.0 - 27th October 2024, Single session save/restore
v2.0 - 27th October 2024, Extended the script to work with multiple sessions
v2.1 - 2nd November 2024, Minor cosmetic layout changes, log files now listed in descending modified sort order
v2.2 - 9th November 2024, Geek update exploring semi-structured data, the log files are written and read in .json format instead of plain .txt format
v2.2 - 9th November 2024, Another geek update exploring semi-structured data, the log files are written and read in .xml format instead of plain .json format
v2.3 - 13th November 2024, Added an option to prompt to save modified documents when closing a session, in addition to the previous save and close option

https://community.adobe.com/t5/photoshop-ecosystem-discussions/scripts-to-save-amp-restore-photoshop-sessions/m-p/14239969

Inspiration from:
https://community.adobe.com/t5/photoshop-ecosystem-ideas/please-session-saving/idc-p/14169472
https://community.adobe.com/t5/photoshop-ecosystem-ideas/restore-previous-session/idc-p/14189928

*/

#target photoshop

// Set the main UI window
var dlg = new Window("dialog", "Photoshop Session Manager (v2.3 Beta)");
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
var saveCheckbox = buttonPanel.add("checkbox", undefined, "Save Current Session Documents");
saveCheckbox.value = true;

// Add radio buttons for save behavior
var saveOptionsGroup = buttonPanel.add("group");
saveOptionsGroup.orientation = "row";
saveOptionsGroup.alignChildren = ["left", "center"];
saveOptionsGroup.margins = [20, 0, 0, 0]; // Add left margin for indentation

var saveAndCloseRadio = saveOptionsGroup.add("radiobutton", undefined, "Save && Close");
var promptAndCloseRadio = saveOptionsGroup.add("radiobutton", undefined, "Prompt to Save && Close");
saveAndCloseRadio.value = true; // Default selection

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

// Show the main script dialog window
dlg.show();


// Functions

function setPanelEnabledState(state) {
    logList.enabled = state;
    enableManagementCheckbox.enabled = state;
    openFolderButton.enabled = state && enableManagementCheckbox.value;
    deleteButton.enabled = state && enableManagementCheckbox.value;
    viewButton.enabled = state && logList.selection && logList.selection.file;
    sessionNameInput.enabled = !state; // Enable session name input only when saving
    saveOptionsGroup.enabled = !state; // Enable radio buttons only when saving
    // Set the text color to dimmed gray when restore is active
    sessionNameHelp.graphics.foregroundColor = sessionNameHelp.graphics.newPen(
        sessionNameHelp.graphics.PenType.SOLID_COLOR,
        state ? [0.5, 0.5, 0.5] : [1, 1, 1],
        1
    );
}

function refreshLogListByModifed() {
    logList.removeAll();
    // ~/Library/Preferences/Adobe Photoshop #### Settings
    var logFilePath = Folder(app.preferencesFolder);
    var logFiles = logFilePath.getFiles("Photoshop Session - *.xml");

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

function restoreSession(xmlFile) {
    try {
        // Read and parse XML file
        xmlFile.open("r");
        var xmlData = XML(xmlFile.read());
        xmlFile.close();
        var filePaths = xmlData.filePath;
        var theActiveDocName = xmlData.activeDocumentName.toString();
        // Open each file in the session data
        for (var i = 0; i < filePaths.length(); i++) {
            var filePath = filePaths[i].toString();
            var docFile = new File(filePath);
            if (docFile.exists) {
                open(docFile);
            } else {
                alert("File not found: " + filePath);
            }
        }
        // Set the active document based on session data
        for (var a = 0; a < app.documents.length; a++) {
            if (app.documents[a].name === theActiveDocName) {
                app.activeDocument = app.documents[a];
                break;
            }
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
        var formattedDate = year + '-' + month + '-' + day + '_' + hours + ':' + minutes + ':' + seconds;
        var sessionName = sessionNameInput.text.replace(/^\s+|\s+$/g, ''); // remove leading and trailing whitespace
        var fileName = sessionName !== "" ? sessionName : formattedDate;
        fileName = fileName.replace(/[<>:"\/\\|?*]/g, "-");
        var xmlFile = new File(app.preferencesFolder + "/" + "Photoshop Session - " + fileName + ".xml");
        // Add confirmation check if file exists
        if (xmlFile.exists) {
            var confirmOverwrite = confirm("A session file with this name already exists:\n" +
                decodeURI(xmlFile.name) +
                "\n\nDo you want to overwrite it?");
            if (!confirmOverwrite) {
                // If user cancels, return without saving
                return;
            }
            // If confirmed, remove the existing file
            xmlFile.remove();
        }
        // Create XML structure for the session data
        var xmlData = new XML("<session></session>");
        var sessionElement = new XML("<sessionName></sessionName>");
        sessionElement.appendChild(fileName);
        var activeDocElement = new XML("<activeDocumentName></activeDocumentName>");
        activeDocElement.appendChild(activeDocument.name);
        xmlData.appendChild(sessionElement);
        xmlData.appendChild(activeDocElement);
        // Collect file paths from open documents
        while (app.documents.length > 0) {
            app.activeDocument = app.documents[0];
            try {
                var filePath = activeDocument.fullName.fsName;
                var fileElement = new XML("<filePath></filePath>");
                fileElement.appendChild(filePath);
                xmlData.appendChild(fileElement);
            } catch (e) { }
            // Use the selected save option
            var saveOption = saveAndCloseRadio.value ? SaveOptions.SAVECHANGES : SaveOptions.PROMPTTOSAVECHANGES;
            activeDocument.close(saveOption);
        }
        // Write XML data to file
        xmlFile.open("w");
        xmlFile.write(xmlData.toXMLString());
        xmlFile.close();

    } catch (e) {
        alert("Error saving session: " + e.message);
    }
}

function viewLogContents(logFile) {
    var logContents = readPref(logFile).join("\n");
    try {
        var xmlData = new XML(logContents);
        var formattedContents = xmlData.toXMLString(); // Format XML with indentations
    } catch (e) {
        formattedContents = "Error parsing XML: " + e.message;
    }
    // Create view window
    var viewWindow = new Window("dialog", "Log Contents: " + decodeURI(logFile.name));
    viewWindow.orientation = "column";
    viewWindow.alignChildren = ["fill", "top"];
    // Add scrollable text area
    var logTextArea = viewWindow.add("edittext", undefined, formattedContents, {
        multiline: true,
        scrollable: true
    });
    logTextArea.preferredSize.width = 550;
    logTextArea.preferredSize.height = 300;
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
    // Show the view log window
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
