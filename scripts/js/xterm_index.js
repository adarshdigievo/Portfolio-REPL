function ensurePyscriptLoaded() {

    return new Promise(waitForPyscript);

    function waitForPyscript(resolve, reject) {
        if (window.portfolioReplReady && window.portfolioReplExecuteCommand)
            resolve();
        else
            setTimeout(waitForPyscript.bind(this, resolve, reject), 30);
    }
}
var term = new Terminal({
    cursorBlink: true,
    cursorStyle: "bar",
    cols:(window.screen.width - (window.screen.width % 10)) / 10,
    rows:(window.screen.height - (window.screen.height % 25)) / 25
});

var curr_line = ''; // holds command being entered
var entries = []; // stores command history
var currPos = 0; // current position in command history; entries.length means a blank new prompt
var prompt_text = '>>>  ';
var prompt_width = prompt_text.length;

function getCursorIndex() {
    return Math.max(0, Math.min(curr_line.length, term.buffer.cursorX - prompt_width));
}

function renderInput(cursorIndex) {
    var safeCursorIndex = Math.max(0, Math.min(curr_line.length, cursorIndex));
    var charsToMoveLeft = curr_line.length - safeCursorIndex;
    term.write('\33[2K\r' + prompt_text + curr_line);
    if (charsToMoveLeft > 0) {
        term.write('\033[' + charsToMoveLeft.toString() + 'D');
    }
}

function showPrompt() {
    term.write('\n\33[2K\r' + prompt_text);
}

function addHistoryEntry(command) {
    entries.push(command);
    currPos = entries.length;
}

function showPreviousHistoryEntry() {
    if (entries.length === 0 || currPos === 0) {
        return;
    }
    currPos -= 1;
    curr_line = entries[currPos] || '';
    renderInput(curr_line.length);
}

function showNextHistoryEntry() {
    if (entries.length === 0 || currPos >= entries.length) {
        currPos = entries.length;
        curr_line = '';
        renderInput(0);
        return;
    }
    currPos += 1;
    curr_line = currPos === entries.length ? '' : entries[currPos] || '';
    renderInput(curr_line.length);
}

term.open(document.getElementById('terminal'));

term.prompt = () => {
    term.write('\n\r' + curr_line + '\r\n' + prompt_text);
};

ensurePyscriptLoaded().then(function() {
    console.log("Pyscript Loaded");
    term.write('\033[92m \033[1m' + window.portfolioReplSiteDescription);
    term.write('\033[0m' + window.portfolioReplVersion);
    term.prompt();
    term.focus();
    var initial_prompt = 'print(ABOUT) # press enter'
    curr_line = initial_prompt
    term.write(initial_prompt)
});
if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    // onKey event is not firing on android chromium based browser. This workaround is applied in that case.
    term.on("data", function(data) {

        if (!data.replace(/\s/g, '').length && data != " ") {
            console.log('assuming enter key');
            if (curr_line.replace(/^\s+|\s+$/g, '').length != 0) { // Check if string is all whitespace
                addHistoryEntry(curr_line);
                // when enter is pressed, call the execute_command python function defined in pyscript with the current command
                term.write('\n\r' + window.portfolioReplExecuteCommand(curr_line));
                showPrompt();
            }
            curr_line = ""
        } else {
            term.write(data);
            curr_line = curr_line + data
        }
    });

} else {
    term.on("key", function(key, ev) {
        const printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey &&
            !(ev.keyCode === 37 && term.buffer.cursorX <= prompt_width);
        if (ev.keyCode === 13) { // Enter key
            if (curr_line.replace(/^\s+|\s+$/g, '').length != 0) { // Check if string is all whitespace
                addHistoryEntry(curr_line);

                // when enter is pressed, call the execute_command python function defined in pyscript with the current command
                term.write('\n\r' + window.portfolioReplExecuteCommand(curr_line));
                showPrompt();

            } else { // entry is whitespace only
                showPrompt();
            }
            curr_line = '';
        } else if (ev.keyCode === 8) { // Backspace
            var backspaceCursorIndex = getCursorIndex();
            if (backspaceCursorIndex > 0) { // checks if the cursor is not at start position
                curr_line = curr_line.slice(0, backspaceCursorIndex - 1) + curr_line.slice(backspaceCursorIndex);
                renderInput(backspaceCursorIndex - 1);
            }
        } else if (ev.keyCode === 38) { // Up arrow
            showPreviousHistoryEntry();
        } else if (ev.keyCode === 40) { // Down arrow
            showNextHistoryEntry();
        }
        // For other printable keys (non-control, non-arrow keys), If the cursor is not at the end of the line the pressed key is inserted into the curr_line at the appropriate cursor position.
        else if (printable && !(ev.keyCode === 39 && term.buffer.cursorX >= curr_line.length + prompt_width)) {
            if (ev.keyCode != 37 && ev.keyCode != 39) {
                var input = ev.key;
                if (ev.keyCode == 9) { // Tab
                    input = "    ";
                }
                var cursorIndex = getCursorIndex();
                curr_line = curr_line.slice(0, cursorIndex) + input + curr_line.slice(cursorIndex);
                renderInput(cursorIndex + input.length);
            } else {
                term.write(key);
            }
        }
    });

}
