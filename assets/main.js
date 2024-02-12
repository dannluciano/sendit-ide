// find the console element
const pythonConsole = document.getElementById("console");
const output = document.getElementById("output");
const runLineByLineButton = document.getElementById("runLineByLine");

// initialize codemirror and pass configuration to support Python and the dracula theme
const editor = CodeMirror.fromTextArea(document.getElementById("code"), {
  mode: {
    name: "python",
    version: 3,
    singleLineStringErrors: false,
  },
  theme: "dracula",
  lineNumbers: true,
  indentUnit: 4,
  matchBrackets: true,
});
// set the initial value of the editor
editor.setValue("print('Hello world')\nname = input()\nprint(name)");
pythonConsole.value = "Initializing...\n";
output.value = "";

// add pyodide returned value to the console
function addToConsole(stdout) {
  pythonConsole.value = stdout;
}

function appendToConsole(line, stdout) {
  pythonConsole.value += ">>> " + line + "\n" + stdout;
}

function appendToOutput(stdout) {
  output.value += stdout;
}

// clean the console section
function clearHistory() {
  pythonConsole.value = "";
  output.value = "";
}

// init pyodide and show sys.version when it's loaded successfully
async function main() {
  let pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.20.0/full/",
  });
  pythonConsole.value = pyodide.runPython(`
    import sys
    sys.version
  `);
  pythonConsole.value += "\n" + "Python Ready !" + "\n";
  runLineByLineButton.disabled = false;
  return pyodide;
}

// run the main function
let pyodideReadyPromise = main();

// pass the editor value to the pyodide.runPython function and show the result in the console section
async function evaluatePython(debug = false) {
  clearHistory();
  let pyodide = await pyodideReadyPromise;
  try {
    const source = editor.getValue();
    const lines = source.split("\n");
    for await (let line of lines) {
      if (debug) {
        await alert(line);
      }
      await pyodide.runPythonAsync(`import io;sys.stdout = io.StringIO()`);
      await pyodide.runPythonAsync(line);
      let stdout = await pyodide.runPythonAsync("sys.stdout.getvalue()");
      appendToConsole(line, stdout);
      appendToOutput(stdout);
    }
  } catch (err) {
    addToConsole(err);
  }
}
