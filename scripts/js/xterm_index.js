function ensurePyscriptLoaded() {

    return new Promise(waitForPyscript);

    function waitForPyscript(resolve, reject) {
        if (pyscript && pyscript.interpreter && pyscript.interpreter.globals.get("version_string"))
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
var currPos = 0; // current position in entries array
var pos = 0; // tracks cursor position in curr_line

term.open(document.getElementById('terminal'));

term.prompt = () => {
    term.write('\n\r' + curr_line + '\r\n>>>  ');
};

ensurePyscriptLoaded().then(function() {
    console.log("Pyscript Loaded");
    term.write('\033[92m \033[1m' + pyscript.interpreter.globals.get("site_description_string"));
    term.write('\033[0m' + pyscript.interpreter.globals.get("version_string"));
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
                entries.push(curr_line);
                currPos = entries.length;
                // when enter is pressed, call the execute_command python function defined in pyscript with the current command
                term.write('\n\r' + pyscript.interpreter.globals.get('execute_command')(curr_line));
                term.write('\n\33[2K\r>>>  '); // \33[2K cleans the current line
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
            !(ev.keyCode === 37 && term.buffer.cursorX < 6);
        if (ev.keyCode === 13) { // Enter key
            if (curr_line.replace(/^\s+|\s+$/g, '').length != 0) { // Check if string is all whitespace
                entries.push(curr_line);
                currPos = entries.length;

                // when enter is pressed, call the execute_command python function defined in pyscript with the current command
                term.write('\n\r' + pyscript.interpreter.globals.get('execute_command')(curr_line));
                term.write('\n\33[2K\r>>>  '); // \33[2K cleans the current line

            } else { // entry is whitespace only
                term.write('\n\33[2K\r>>>  '); //  \33[2K cleans the current line
            }
            curr_line = '';
        } else if (ev.keyCode === 8) { // Backspace
            if (term.buffer.cursorX > 5) { // checks if the cursor is not at start position

                // Remove the character before the cursor and update `curr_line`
                curr_line = curr_line.slice(0, term.buffer.cursorX - 6) + curr_line.slice(term.buffer.cursorX - 5);

                // Calculate the new cursor position (`pos`) after removing the character
                pos = curr_line.length - term.buffer.cursorX + 6;
                term.write('\33[2K\r>>>  ' + curr_line);
                term.write('\033['.concat(pos.toString()).concat('D')); // This moves the cursor `pos` columns to the left

                // Check if the cursor is at the start or end of the line
                // If yes, move the cursor one position to the right
                if (term.buffer.cursorX == 5 || term.buffer.cursorX == curr_line.length + 6) {
                    term.write('\033[1C')
                }
            }
        } else if (ev.keyCode === 38) { // Up arrow
            if (entries.length > 0) {
                if (currPos > 0) {
                    currPos -= 1;
                }
                curr_line = entries[currPos];
                term.write('\33[2K\r>>>  ' + curr_line);
            }
        } else if (ev.keyCode === 40) { // Down arrow
            currPos += 1;
            if (currPos === entries.length || entries.length === 0) {
                currPos -= 1;
                curr_line = '';
                term.write('\33[2K\r>>>  ');
            } else {
                curr_line = entries[currPos];
                term.write('\33[2K\r>>>  ' + curr_line);

            }

        }
        // For other printable keys (non-control, non-arrow keys), If the cursor is not at the end of the line the pressed key is inserted into the curr_line at the appropriate cursor position.
        else if (printable && !(ev.keyCode === 39 && term.buffer.cursorX > curr_line.length + 4)) {
            if (ev.keyCode != 37 && ev.keyCode != 39) {
                var input = ev.key;
                if (ev.keyCode == 9) { // Tab
                    input = "    ";
                }
                pos = curr_line.length - term.buffer.cursorX + 4;
                curr_line = [curr_line.slice(0, term.buffer.cursorX - 5), input, curr_line.slice(term.buffer.cursorX - 5)].join('');
                term.write('\33[2K\r>>>  ' + curr_line);
                term.write('\033['.concat(pos.toString()).concat('D')); // moving cursor to present position
            } else {
                term.write(key);
            }
        }
    });

}
