function getViewportWidth() {
    return window.visualViewport ? window.visualViewport.width : window.innerWidth;
}

function getViewportHeight() {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
}

function getSuggestionHeight() {
    var suggestions = document.querySelector('.command-suggestions');
    return suggestions ? suggestions.getBoundingClientRect().height : 0;
}

function getTerminalElement() {
    return document.getElementById('terminal');
}

function getMeasuredCellSize() {
    var measure = document.querySelector('.xterm-char-measure-element');
    if (!measure) {
        return { width: 9, height: 18 };
    }
    var rect = measure.getBoundingClientRect();
    return {
        width: rect.width || 9,
        height: rect.height || 18
    };
}

function getTerminalCols() {
    var terminal = getTerminalElement();
    var width = terminal && terminal.clientWidth ? terminal.clientWidth : getViewportWidth() - 16;
    var cell = getMeasuredCellSize();
    return Math.max(32, Math.floor((width - 8) / cell.width));
}

function getTerminalRows() {
    var terminal = getTerminalElement();
    var fallbackHeight = getViewportHeight() - getSuggestionHeight() - 24;
    var height = terminal && terminal.clientHeight ? terminal.clientHeight : fallbackHeight;
    var cell = getMeasuredCellSize();
    return Math.max(8, Math.floor((height - 8) / cell.height));
}

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
    cols: getTerminalCols(),
    rows: getTerminalRows()
});

var curr_line = ''; // holds command being entered
var entries = []; // stores command history
var currPos = 0; // current position in command history; entries.length means a blank new prompt
var prompt_text = '>>>  ';
var prompt_width = prompt_text.length;
var command_completions = [
    'help()',
    'clear()',
    'theme()',
    'theme("green")',
    'theme("amber")',
    'theme("cyan")',
    'theme("light")',
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
var themes = {
    green: {
        pageBg: '#000000',
        terminalFg: '#ffffff',
        accent: '#2aa342',
        accentStrong: '#8aff80',
        ansiGreen: '#8aff80',
        chipBg: '#071307',
        chipHover: '#123018',
        chipFg: '#d7ffd9',
        barBg: 'rgba(0, 0, 0, 0.94)'
    },
    amber: {
        pageBg: '#080602',
        terminalFg: '#ffefcc',
        accent: '#d99022',
        accentStrong: '#ffd37a',
        ansiGreen: '#ffd37a',
        chipBg: '#1b1205',
        chipHover: '#2d1e0a',
        chipFg: '#fff2d4',
        barBg: 'rgba(8, 6, 2, 0.94)'
    },
    cyan: {
        pageBg: '#02090d',
        terminalFg: '#d9fbff',
        accent: '#2aa6b8',
        accentStrong: '#82f4ff',
        ansiGreen: '#82f4ff',
        chipBg: '#03151a',
        chipHover: '#092a32',
        chipFg: '#dbfbff',
        barBg: 'rgba(2, 9, 13, 0.94)'
    },
    light: {
        pageBg: '#f7f7f0',
        terminalFg: '#151515',
        accent: '#387b4a',
        accentStrong: '#145c2a',
        ansiGreen: '#28743d',
        chipBg: '#ffffff',
        chipHover: '#eef5ee',
        chipFg: '#102716',
        barBg: 'rgba(247, 247, 240, 0.95)'
    }
};
var activeThemeName = 'green';
var assistantTipIndex = 0;
var assistantTips = [
    {
        text: 'Start with the guided command list.',
        command: 'help()',
        label: 'help()'
    },
    {
        text: 'Use Tab to complete partial commands like `print(S`.',
        command: 'print(SKILLS)',
        label: 'skills'
    },
    {
        text: 'Check work history without leaving the REPL.',
        command: 'print(EXPERIENCE)',
        label: 'experience'
    },
    {
        text: 'Try a warmer terminal palette.',
        command: 'theme(amber)',
        label: 'amber'
    },
    {
        text: 'Open the ASCII photo gallery.',
        command: 'VISIT.GALLERY',
        label: 'gallery'
    }
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

function applyTheme(themeName) {
    var theme = themes[themeName];
    if (!theme) {
        return false;
    }
    activeThemeName = themeName;
    document.documentElement.style.setProperty('--page-bg', theme.pageBg);
    document.documentElement.style.setProperty('--terminal-fg', theme.terminalFg);
    document.documentElement.style.setProperty('--accent', theme.accent);
    document.documentElement.style.setProperty('--accent-strong', theme.accentStrong);
    document.documentElement.style.setProperty('--chip-bg', theme.chipBg);
    document.documentElement.style.setProperty('--chip-hover', theme.chipHover);
    document.documentElement.style.setProperty('--chip-fg', theme.chipFg);
    document.documentElement.style.setProperty('--bar-bg', theme.barBg);
    if (term && term.setOption) {
        term.setOption('theme', {
            background: theme.pageBg,
            foreground: theme.terminalFg,
            cursor: theme.accentStrong,
            green: theme.ansiGreen,
            brightGreen: theme.ansiGreen
        });
    }
    return true;
}

function resizeTerminal() {
    if (term && term.resize) {
        term.resize(getTerminalCols(), getTerminalRows());
    }
}

function focusTerminal() {
    term.focus();
}

function updateAssistantTip() {
    var assistant = document.getElementById('repl-assistant');
    if (!assistant) {
        return;
    }
    var tip = assistantTips[assistantTipIndex];
    var text = assistant.querySelector('.repl-assistant__text');
    var primary = assistant.querySelector('.repl-assistant__primary');
    if (text) {
        text.textContent = tip.text;
    }
    if (primary) {
        primary.textContent = tip.label;
        primary.setAttribute('data-command', tip.command);
    }
}

function moveAssistantTip(direction) {
    assistantTipIndex = (assistantTipIndex + direction + assistantTips.length) % assistantTips.length;
    updateAssistantTip();
}

function collapseAssistant() {
    var assistant = document.getElementById('repl-assistant');
    if (assistant) {
        assistant.classList.add('is-collapsed');
    }
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

function hasInput() {
    return curr_line.replace(/^\s+|\s+$/g, '').length != 0;
}

function submitCurrentLine() {
    if (hasInput()) {
        addHistoryEntry(curr_line);
        runCommand(curr_line);
        collapseAssistant();
    } else {
        showPrompt();
    }
    curr_line = '';
}

function insertInput(input, cursorIndex) {
    var safeCursorIndex = Math.max(0, Math.min(curr_line.length, cursorIndex));
    curr_line = curr_line.slice(0, safeCursorIndex) + input + curr_line.slice(safeCursorIndex);
    renderInput(safeCursorIndex + input.length);
}

function deleteInputBeforeCursor(cursorIndex) {
    var safeCursorIndex = Math.max(0, Math.min(curr_line.length, cursorIndex));
    if (safeCursorIndex > 0) {
        curr_line = curr_line.slice(0, safeCursorIndex - 1) + curr_line.slice(safeCursorIndex);
        renderInput(safeCursorIndex - 1);
    }
}

function handleMobileData(data) {
    if (data === '\r' || data === '\n' || data === '\r\n') {
        submitCurrentLine();
        return;
    }
    if (data === '\x7f' || data === '\b' || data === '\x1b[3~') {
        deleteInputBeforeCursor(curr_line.length);
        return;
    }
    if (data === '\x1b[D') {
        renderInput(Math.max(0, getCursorIndex() - 1));
        return;
    }
    if (data === '\x1b[C') {
        renderInput(Math.min(curr_line.length, getCursorIndex() + 1));
        return;
    }
    insertInput(data, curr_line.length);
}

function runCommand(command) {
    var normalizedCommand = command.replace(/^\s+|\s+$/g, '');
    if (normalizedCommand === 'clear' || normalizedCommand === 'clear()') {
        term.write('\033[2J\033[3J\033[H' + prompt_text);
        return;
    }
    var themeMatch = normalizedCommand.match(/^theme\((?:"([^"]+)"|'([^']+)'|([A-Za-z]+))?\)$/);
    if (normalizedCommand === 'theme' || themeMatch) {
        var requestedTheme = themeMatch ? (themeMatch[1] || themeMatch[2] || themeMatch[3]) : null;
        if (!requestedTheme) {
            term.write('\n\rAvailable themes: ' + Object.keys(themes).join(', '));
        } else if (applyTheme(requestedTheme)) {
            term.write('\n\rTheme set to ' + requestedTheme + '.');
        } else {
            term.write('\n\rUnknown theme: ' + requestedTheme + '. Try green, amber, cyan, or light.');
        }
        showPrompt();
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
        collapseAssistant();
        curr_line = '';
    }
}

term.open(document.getElementById('terminal'));
resizeTerminal();
applyTheme(activeThemeName);

window.addEventListener('resize', resizeTerminal);
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeTerminal);
    window.visualViewport.addEventListener('scroll', resizeTerminal);
}

document.querySelectorAll('.command-suggestions button').forEach(function(button) {
    button.addEventListener('click', function() {
        submitCommand(button.getAttribute('data-command'));
        focusTerminal();
    });
});

document.querySelectorAll('.repl-assistant [data-command]').forEach(function(button) {
    button.addEventListener('click', function() {
        submitCommand(button.getAttribute('data-command'));
        focusTerminal();
    });
});

var assistant = document.getElementById('repl-assistant');
if (assistant) {
    if (getViewportWidth() <= 520) {
        assistant.classList.add('is-collapsed');
    }
    updateAssistantTip();
    assistant.querySelector('.repl-assistant__avatar').addEventListener('click', function() {
        assistant.classList.toggle('is-collapsed');
        focusTerminal();
    });
    assistant.querySelector('.repl-assistant__close').addEventListener('click', function() {
        assistant.classList.add('is-collapsed');
        focusTerminal();
    });
    assistant.querySelectorAll('.repl-assistant__nav').forEach(function(button) {
        button.addEventListener('click', function() {
            moveAssistantTip(button.getAttribute('data-tip-direction') === 'next' ? 1 : -1);
            focusTerminal();
        });
    });
}

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
var useMobileInputHandler = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) ||
    new URLSearchParams(window.location.search).has('mobile-input-test');

if (useMobileInputHandler) {
    // onKey event is not firing on android chromium based browser. This workaround is applied in that case.
    term.on("data", function(data) {
        handleMobileData(data);
    });

} else {
    term.on("key", function(key, ev) {
        const printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey &&
            !(ev.keyCode === 37 && term.buffer.cursorX <= prompt_width);
        if (ev.keyCode === 13) { // Enter key
            submitCurrentLine();
        } else if (ev.keyCode === 8) { // Backspace
            deleteInputBeforeCursor(getCursorIndex());
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
                insertInput(input, getCursorIndex());
            } else {
                term.write(key);
            }
        }
    });

}
