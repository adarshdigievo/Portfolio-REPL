var term = new Terminal({
    cursorBlink: false,
    fontSize:6,
    cols:200,
    rows:150
});

term.open(document.getElementById('terminal'));

term.focus();
