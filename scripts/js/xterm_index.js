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
var command_completions = [
    'help()',
    'clear()',
    'print(ABOUT)',
    'print(SKILLS)',
    'print(EXPERIENCE)',
    'print(OPEN_SOURCE_CONTRIBUTIONS)',
    'print(EDUCATION)',
    'print(CERTIFICATIONS)',
    'ABOUT',
    'SKILLS',
    'EXPERIENCE',
    'CONFERENCE_TALKS',
    'OPEN_SOURCE_CONTRIBUTIONS',
    'EDUCATION',
    'CERTIFICATIONS',
    'VISIT.BLOG',
    'VISIT.GALLERY',
    'VISIT.SOURCE'
];

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

function showTerminal() {
    var loader = document.getElementById('boot-loader');
    var terminal = document.getElementById('terminal');
    if (loader) {
        loader.classList.add('is-hidden');
    }
    if (terminal) {
        terminal.classList.add('is-ready');
    }
}

function focusTerminal() {
    term.focus();
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

function runCommand(command) {
    var normalizedCommand = command.replace(/^\s+|\s+$/g, '');
    if (normalizedCommand === 'clear' || normalizedCommand === 'clear()') {
        term.write('\033[2J\033[3J\033[H' + prompt_text);
        return;
    }
    term.write('\n\r' + window.portfolioReplExecuteCommand(command));
    showPrompt();
}

function getCompletionToken(cursorIndex) {
    var beforeCursor = curr_line.slice(0, cursorIndex);
    var match = beforeCursor.match(/[A-Za-z_().]+$/);
    if (!match) {
        return null;
    }
    return {
        value: match[0],
        start: cursorIndex - match[0].length
    };
}

function showCompletionOptions(matches, cursorIndex) {
    term.write('\n\r' + matches.join('    '));
    term.write('\n\r' + prompt_text + curr_line);
    var charsToMoveLeft = curr_line.length - cursorIndex;
    if (charsToMoveLeft > 0) {
        term.write('\033[' + charsToMoveLeft.toString() + 'D');
    }
}

function completeCurrentInput() {
    var cursorIndex = getCursorIndex();
    var token = getCompletionToken(cursorIndex);
    if (!token || token.value.length === 0) {
        showCompletionOptions(command_completions, cursorIndex);
        return;
    }

    var matches = command_completions.filter(function(completion) {
        return completion.indexOf(token.value) === 0;
    });

    if (matches.length === 1) {
        curr_line = curr_line.slice(0, token.start) + matches[0] + curr_line.slice(cursorIndex);
        renderInput(token.start + matches[0].length);
    } else if (matches.length > 1) {
        showCompletionOptions(matches, cursorIndex);
    }
}

function submitCommand(command) {
    curr_line = command;
    renderInput(curr_line.length);
    if (curr_line.replace(/^\s+|\s+$/g, '').length != 0) {
        addHistoryEntry(curr_line);
        runCommand(curr_line);
        curr_line = '';
    }
}

term.open(document.getElementById('terminal'));

document.querySelectorAll('.command-suggestions button').forEach(function(button) {
    button.addEventListener('click', function() {
        submitCommand(button.getAttribute('data-command'));
        focusTerminal();
    });
});

term.prompt = () => {
    term.write('\n\r' + curr_line + '\r\n' + prompt_text);
};

ensurePyscriptLoaded().then(function() {
    console.log("Pyscript Loaded");
    showTerminal();
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
                runCommand(curr_line);
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
                runCommand(curr_line);

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
        } else if (ev.keyCode === 9) { // Tab
            if (ev.preventDefault) {
                ev.preventDefault();
            }
            completeCurrentInput();
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
