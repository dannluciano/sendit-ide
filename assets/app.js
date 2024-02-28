const host = document.location.host;
let containerId;
let tempDirPath;
let editor;
let apiSocket;
let containerSocket;
let openedFiles = [];
let currentOpenTab = -1;
let term;

function terminalResize() {
  term.fit();
  if (apiSocket) {
    apiSocket.send(
      JSON.stringify({
        type: "resize",
        params: term.getDimensions(),
      })
    );
  }
}
window.addEventListener("resize", terminalResize);

CodeMirror.modeURL = "/assets/vendor/codemirror/mode/%N/%N.js";

const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
};

const iconFileStylePattern =
  'style="padding-top: 0.4rem; margin-right: 0.5rem"';
const iconFileLabels = {
  py: "logo-python",
  js: "logo-javascript",
  java: "cafe",
  html: "logo-html5",
  file: "document",
  folder: "folder",
};

function getExtensionIcon(filename, style) {
  if (filename.endsWith(".py")) {
    return `<ion-icon ${style ? iconFileStylePattern : null} name="${
      iconFileLabels.py
    }"></ion-icon>`;
  } else if (filename.endsWith(".js")) {
    return `<ion-icon ${style ? iconFileStylePattern : null} name="${
      iconFileLabels.js
    }"></ion-icon>`;
  } else if (filename.endsWith(".java")) {
    return `<ion-icon ${style ? iconFileStylePattern : null} name="${
      iconFileLabels.java
    }"></ion-icon>`;
  } else if (filename.endsWith(".c")) {
    return "cㅤ";
  } else if (filename.endsWith(".cpp")) {
    return "c++ㅤ";
  } else if (filename.endsWith(".html")) {
    return `<ion-icon ${style ? iconFileStylePattern : null} name="${
      iconFileLabels.html
    }"></ion-icon>`;
  } else if (filename.endsWith(".css")) {
    return "cssㅤ";
  } else {
    return `<ion-icon ${style ? iconFileStylePattern : null} name="${
      iconFileLabels.file
    }"></ion-icon>`;
  }
}

function getFileExtension(fileNameOrPath) {
  return fileNameOrPath.split(".").pop();
}

function getEditorConfigsAndModeWithFileExtension(fileExtention) {
  const defaultOptions = {
    theme: "dracula",
    lineNumbers: true,
    indentUnit: 4,
    matchBrackets: true,
    styleActiveLine: true,
    viewportMargin: 25,
  };
  const fileConfigsAndExtentionModes = {
    py: {
      ...defaultOptions,
      mode: {
        name: "python",
        version: 3,
        singleLineStringErrors: false,
      },
      indentUnit: 2,
      smartIndent: true,
      tabSize: 2,
      indentWithTabs: false,
    },
    js: {
      ...defaultOptions,
      mode: {
        name: "javascript",
      },
    },
    mjs: {
      ...defaultOptions,
      mode: {
        name: "javascript",
      },
    },
    json: {
      ...defaultOptions,
      mode: {
        name: "javascript",
        json: true,
      },
    },
    java: {
      ...defaultOptions,
      mode: "text/x-java",
    },
    cpp: {
      ...defaultOptions,
      mode: "text/x-c++src",
    },
    c: {
      ...defaultOptions,
      mode: "text/x-csrc",
    },
    scratch: {
      ...defaultOptions,
      mode: "properties",
      readOnly: true,
    },
  };
  try {
    return fileConfigsAndExtentionModes[fileExtention];
  } catch (error) {
    console.error(error);
    return;
  }
}

function changeEditorConfigsAndMode(editor, filename) {
  const fileExtension = getFileExtension(filename);
  const options = getEditorConfigsAndModeWithFileExtension(fileExtension);
  const extension = CodeMirror.findModeByExtension(fileExtension) || "txt";
  CodeMirror.autoLoadMode(editor, extension);
  for (const key in options) {
    if (Object.hasOwnProperty.call(options, key)) {
      editor.setOption(key, options[key]);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  editor = CodeMirror.fromTextArea(document.querySelector("#editor"));
  editor.setSize("100%", "470px");
  editor.on("changes", function () {
    if (currentOpenTab >= 0) {
      const fileWasChanged = openedFiles[currentOpenTab].changed;
      openedFiles[currentOpenTab].changed = true;
      if (!fileWasChanged) {
        requestAnimationFrame(renderFilesTabs);
      }
    }
  });
  changeEditorConfigsAndMode(editor, "scratch");

  const newFileButton = document.getElementById("new-file-button");
  newFileButton.addEventListener("click", function () {
    const filenameField = document.getElementById("input-filename");
    const filename = filenameField.value;
    const filepath = `${tempDirPath}/${filename}`;

    writeFile(filepath, "");
    openFile(filepath);
    filenameField.value = "";
  });

  const newFolderButton = document.getElementById("new-folder-button");
  newFolderButton.addEventListener("click", function () {
    const filenameField = document.getElementById("input-filename");
    const filename = filenameField.value;
    const folderpath = `${tempDirPath}/${filename}`;
    makeFolder(folderpath);
    filenameField.value = "";
  });

  const runButton = document.getElementById("run-button");
  runButton.addEventListener("click", function () {
    const source = editor.getValue();
    const file = openedFiles[currentOpenTab];
    const language = getFileExtension(file.filename);

    writeFile(file.filepath, source);

    const filepathWithOutHomePath = file.filepath.replace(
      `${tempDirPath}/`,
      ""
    );

    if (language === "py") {
      containerSocket.send(`python3 ${filepathWithOutHomePath}\n`);
    } else if (language === "js") {
      containerSocket.send(`node ${filepathWithOutHomePath}\n`);
    } else if (language === "java") {
      containerSocket.send(`java ${filepathWithOutHomePath}\n`);
    } else if (language === "cpp") {
      containerSocket.send(`g++ -o main ${filepathWithOutHomePath}\n`);
      containerSocket.send(`./main\n`);
    } else if (language === "c") {
      containerSocket.send(`gcc -o main ${filepathWithOutHomePath}\n`);
      containerSocket.send(`./main\n`);
    }
  });

  const saveButton = document.getElementById("save-button");
  saveButton.addEventListener("click", function () {
    if (currentOpenTab >= 0 && openedFiles.length > 0) {
      const file = openedFiles[currentOpenTab];
      writeFile(file.filepath, editor.getValue());
      const fileWasChanged = openedFiles[currentOpenTab].changed;
      openedFiles[currentOpenTab].changed = false;
      if (fileWasChanged) {
        renderFilesTabs();
      }
    }
  });

  fetch("/create", {
    method: "POST",
  })
    .then((res) => res.json())
    .then((data) => {
      containerId = data["container-id"];
      tempDirPath = data["temp-dir-path"];

      if (!containerId) return;

      setTimeout(() => {
        try {
          const containerURL = `ws://${host}/containers/${containerId}/attach/ws?logs=true&stream=true&stdin=true&stdout=true`; //&stderr=true
          containerSocket = new WebSocket(containerURL);
          containerSocket.onopen = function () {
            term = new Term();
            term.attach(containerSocket);
            console.info(containerSocket);
          };

          containerSocket.onclose = function (code, reason) {
            apiSocket.close();
            term.close();
            console.log("Containet WebSocket Disconnected:", code, reason);
          };
          containerSocket.onerror = function (err) {
            console.error(err);
          };

          const apiWSURL = `ws://${host}/vmws?cid=${containerId}`;
          apiSocket = new WebSocket(apiWSURL);
          apiSocket.onopen = function () {
            console.info("API WebSocket Connection Opened");
            setTimeout(function () {
              terminalResize();
            }, 1000);
            file = {
              filename: "main.py",
              filepath: `${tempDirPath}/main.py`,
              changed: false,
              doc: new CodeMirror.Doc(`print("Olá, mundo!")`),
            };
            // To-Do REMOVE THIS
            openedFiles.push(file);
            currentOpenTab = 0;
            editor.swapDoc(file.doc);
            renderFilesTabs();
            // To-Do REMOVE THIS
          };
          console.info(apiSocket);

          apiSocket.onclose = function (code, reason) {
            console.log("API WebSocket Disconnected:", code, reason);
          };
          apiSocket.onerror = function (err) {
            console.error(err);
          };

          apiSocket.addEventListener("message", (event) => {
            const { type, params } = JSON.parse(event.data);
            if (type === "fs") {
              renderFileSystemTree(params);
            }
            if (type === "open") {
              const { filename, filepath, content } = params;

              const fileIsOpened = openedFiles.findIndex(function (file) {
                return file.filepath === filepath;
              });

              let file;

              if (fileIsOpened === -1) {
                file = {
                  filename,
                  filepath,
                  changed: false,
                  doc: new CodeMirror.Doc(content),
                };
                openedFiles.push(file);
              } else {
                file = openedFiles[fileIsOpened];
              }

              changeCurrentOpenedTabWithFile(file);

              renderFilesTabs();
              editor.focus();
            }
          });
        } catch (error) {
          console.error(error);
        }
      }, 1000);
    })
    .catch((error) => console.error(error));
  renderFilesTabs();
});

function renderFilesTabs() {
  const tabs = document.getElementById("tabs");
  tabs.replaceChildren();

  if (openedFiles.length === 0) {
    const filenameSpan = document.createElement("span");
    filenameSpan.textContent = "Scratch";
    filenameSpan.style = "";

    const extensionIcon = document.createElement("span");
    extensionIcon.innerHTML = getExtensionIcon(filenameSpan.textContent);
    extensionIcon.style = "";

    const closeSpan = document.createElement("span");
    closeSpan.textContent = "  ⓧ  ";
    closeSpan.onclick = closeTab;
    closeSpan.style = "";

    const p = document.createElement("div");
    p.appendChild(extensionIcon);
    p.appendChild(filenameSpan);
    p.appendChild(closeSpan);

    const li = document.createElement("li");
    li.appendChild(p);
    li.classList.add("active-tab");
    tabs.appendChild(li);

    editor.setValue("");
    editor.setOption("readOnly", true);
    return;
  }

  let fileindex = 0;
  for (const file of openedFiles) {
    const filenameSpan = document.createElement("span");

    filenameSpan.textContent = file.changed
      ? `${file.filename} * `
      : file.filename;
    filenameSpan.onclick = changeCurrentOpenedTab;
    filenameSpan.dataset.fileindex = fileindex;
    filenameSpan.style = "";

    const extensionIcon = document.createElement("span");
    extensionIcon.innerHTML = getExtensionIcon(filenameSpan.textContent);
    extensionIcon.style = "";

    const closeSpan = document.createElement("span");
    closeSpan.textContent = "  ⓧ  ";
    closeSpan.onclick = closeTab;
    closeSpan.dataset.fileindex = fileindex;
    closeSpan.style = "";

    const p = document.createElement("div");
    p.appendChild(extensionIcon);
    p.appendChild(filenameSpan);
    p.appendChild(closeSpan);

    const li = document.createElement("li");
    li.appendChild(p);
    li.dataset.filepath = file.filepath;
    if (currentOpenTab === fileindex) {
      li.classList.add("active-tab");
    }
    tabs.appendChild(li);
    fileindex++;
  }
  editor.setOption("readOnly", false);
}

function changeCurrentOpenedTab(event) {
  const tabindex = parseInt(event.target.dataset.fileindex);
  const filepath = openedFiles[tabindex].filepath;

  openFile(filepath);
}

function changeCurrentOpenedTabWithFile(file) {
  const tabindex = openedFiles.findIndex(function (currentFile) {
    return currentFile.filepath === file.filepath;
  });
  editor.swapDoc(file.doc);
  changeEditorConfigsAndMode(editor, file.filename);
  currentOpenTab = tabindex;
  renderFilesTabs();
}

function closeTab(event) {
  const tabindex = parseInt(event.target.dataset.fileindex);
  openedFiles.splice(tabindex, 1);
  if (openedFiles.length == 0) {
    currentOpenTab = -1;
  }
  renderFilesTabs();
}

function renderFileSystemTree(data) {
  const filesystem = document.querySelector("#file-system-tree");

  filesystem.replaceChildren();

  for (const child of data.children) {
    if ("children" in child) {
      filesystem.appendChild(renderFolder(child));
    } else {
      filesystem.appendChild(renderFile(child));
    }
  }
}

function renderFolder(folder) {
  const summary = document.createElement("summary");
  const div = document.createElement("div");
  div.setAttribute("onclick", "toggleFolderIcon(this)");
  div.innerHTML = `<ion-icon class="filesystem-folder-icon" name="${iconFileLabels.folder}"></ion-icon>`;
  const span = document.createElement("span");
  span.textContent = folder.name;

  div.appendChild(span);
  summary.appendChild(div);

  const files = document.createElement("ul");

  for (const child of folder.children) {
    if ("children" in child) {
      files.appendChild(renderFolder(child));
    } else {
      files.appendChild(renderFile(child));
    }
  }

  const details = document.createElement("details");
  details.appendChild(summary);
  details.appendChild(files);

  const li = document.createElement("li");
  li.dataset.path = folder.path;
  li.appendChild(details);

  return li;
}

function renderFile(child) {
  const li = document.createElement("li");
  const div = document.createElement("div");
  div.innerHTML = getExtensionIcon(child.name, false);
  const span = document.createElement("span");
  span.textContent = child.name;
  div.appendChild(span);
  li.appendChild(div);

  span.dataset.path = child.path;
  span.onclick = openFileInTree;
  return li;
}

function openFileInTree(event) {
  const filepath = event.target.dataset.path;
  openFile(filepath);
}

function openFile(filepath) {
  apiSocket.send(
    JSON.stringify({
      type: "open",
      params: {
        filepath: filepath,
      },
    })
  );
}

function writeFile(filepath, source) {
  if (!apiSocket) {
    return;
  }

  apiSocket.send(
    JSON.stringify({
      type: "writeInPath",
      params: {
        filepath,
        source,
      },
    })
  );
}

function makeFolder(folderpath) {
  if (!apiSocket) {
    return;
  }

  apiSocket.send(
    JSON.stringify({
      type: "mkdir",
      params: {
        folderpath,
      },
    })
  );
}
