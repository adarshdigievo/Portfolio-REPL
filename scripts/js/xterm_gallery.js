//function ensurePyscriptLoaded() {
//
//    return new Promise(waitForPyscript);
//
//    function waitForPyscript(resolve, reject) {
//        if (pyscript && pyscript.interpreter && pyscript.interpreter.globals.get("version_string"))
//            resolve();
//        else
//            setTimeout(waitForPyscript.bind(this, resolve, reject), 30);
//    }
//}
var term = new Terminal({
    cursorBlink: false,
    fontSize:6,
    cols:200,
    rows:150
});

term.open(document.getElementById('terminal'));

term.focus();
