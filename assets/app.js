const host = document.location.host;
const sProtocol = document.location.protocol === "http:" ? "" : "s";
const currentURL = new URL(document.location);
const debugIsActive = currentURL.searchParams.has("debug");
const testIsActive = currentURL.searchParams.has("test");
let containerId;
let tempDirPath;
let editor;
let apiSocket;
let containerSocket;
let openedFiles = [];
let currentOpenTab = -1;
let term;

function debug() {
  if (debugIsActive) {
    console.log(...arguments);
  }
}

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

function getExtensionIcon(filename, style) {
  const iconFileStylePattern =
    'style="padding-top: 0.4rem; margin-right: 0.5rem"';
  const iconFileLabels = {
    py: "logo-python",
    js: "logo-javascript",
    java: "cafe",
    html: "logo-html5",
    file: "document",
    c: "skull",
    cpp: "skull",
    sql: "server",
    scratch: "document",
    sqlite: "file-tray-stacked",
  };
  const extension = getFileExtension(filename);
  let iconName = iconFileLabels["file"];
  try {
    iconName = iconFileLabels[extension] || "document";
  } catch (error) {
    return `<ion-icon ${
      style ? iconFileStylePattern : null
    } name="document"></ion-icon>`;
  }
  return `<ion-icon ${
    style ? iconFileStylePattern : null
  } name="${iconName}"></ion-icon>`;
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
    readOnly: false,
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
    sql: {
      ...defaultOptions,
      mode: "text/x-sqlite",
    },
    scratch: {
      ...defaultOptions,
      mode: "properties",
      readOnly: true,
    },
    sqlite: {
      ...defaultOptions,
      readOnly: true,
    },
  };
  try {
    return (
      fileConfigsAndExtentionModes[fileExtention] || {
        ...defaultOptions,
        mode: "properties",
        readOnly: true,
      }
    );
  } catch (error) {
    console.error(error);
    return;
  }
}

function changeEditorConfigsAndMode(filename) {
  const fileExtension = getFileExtension(filename);
  const options = getEditorConfigsAndModeWithFileExtension(fileExtension);
  const extension = CodeMirror.findModeByExtension(fileExtension);
  if (extension) {
    CodeMirror.autoLoadMode(editor, extension);
  }
  debug("changeEditorConfigsAndMode", fileExtension, options, extension);
  for (const key in options) {
    debug(`editor.setOption('${key}', ${options[key]});`);
    editor.setOption(`${key}`, options[key]);
  }
}

function getRunCommandsWithFileExtensionAndFilepath(fileExtention, filepath) {
  const runCommandsPerLanguages = {
    py: [`python3 ${filepath}\n`],
    js: [`node ${filepath}\n`],
    mjs: [`node ${filepath}\n`],
    json: [],
    java: [`java ${filepath}\n`],
    cpp: [`g++ -o main ${filepath}\n`, `./main`],
    c: [`g++ -o main ${filepath}\n`, `./main`],
    sql: [`cat ${filepath} | sqlite3 db.sqlite \n`],
    scratch: [],
  };
  try {
    return runCommandsPerLanguages[fileExtention] || [];
  } catch (error) {
    return [];
  }
}

function runCurrentOpenedFile() {
  const file = openedFiles[currentOpenTab];
  const extension = getFileExtension(file.filename);

  saveFile();

  const filepathWithOutHomePath = file.filepath.replace(`${tempDirPath}/`, "");

  const commands = getRunCommandsWithFileExtensionAndFilepath(
    extension,
    filepathWithOutHomePath
  );
  for (command of commands) {
    containerSocket.send(command);
  }
}

function createNewFileOrFolder(event) {
  if (event.key === "Enter") {
    const filenameField = document.getElementById("input-filename");
    if (newFileOrNewFolder === "file") {
      const filename = filenameField.value;
      const filepath = `${tempDirPath}/${filename}`;
      writeFile(filepath, "");
      openFile(filepath);
    } else {
      const foldername = filenameField.value;
      const folderpath = `${tempDirPath}/${foldername}`;
      makeFolder(folderpath);
    }
    filenameField.value = "";
    filenameField.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  editor = CodeMirror.fromTextArea(document.querySelector("#editor"));
  editor.setSize("100%", "470px");
  editor.setOption("extraKeys", {
    "Ctrl-S": function (cm) {
      saveFile();
    },
    "Cmd-S": function (cm) {
      saveFile();
    },
    "Ctrl-R": function (cm) {
      runCurrentOpenedFile();
    },
    "Cmd-R": function (cm) {
      runCurrentOpenedFile();
    },
  });
  editor.on("changes", function () {
    if (currentOpenTab >= 0) {
      const fileWasChanged = openedFiles[currentOpenTab].changed;
      openedFiles[currentOpenTab].changed = true;
      if (!fileWasChanged) {
        requestAnimationFrame(renderFilesTabs);
      }
    }
  });
  changeEditorConfigsAndMode("scratch");

  const filenameField = document.getElementById("input-filename");
  filenameField.addEventListener(
    "keypress",
    debounce(createNewFileOrFolder, 250)
  );

  const newFileButton = document.getElementById("new-file-button");
  newFileButton.addEventListener("click", function () {
    newFileOrNewFolder = "file";
    filenameField.placeholder = "File Name (doc.txt)"
    filenameField.style.display = "block";
    filenameField.focus();
  });

  const newFolderButton = document.getElementById("new-folder-button");
  newFolderButton.addEventListener("click", function () {
    newFileOrNewFolder = "folder";
    filenameField.placeholder = "Folder Name (src/core)"
    filenameField.style.display = "block";
    filenameField.focus();
  });

  const runButton = document.getElementById("run-button");
  runButton.addEventListener("click", runCurrentOpenedFile);

  const saveButton = document.getElementById("save-button");
  saveButton.addEventListener("click", function () {
    saveFile();
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
          const containerURL = `ws${sProtocol}://${host}/containers/${containerId}/attach/ws?logs=true&stream=true&stdin=true&stdout=true`; //&stderr=true
          containerSocket = new WebSocket(containerURL);
          containerSocket.onopen = function () {
            term = new Term();
            term.attach(containerSocket);
            debug(containerSocket);
          };

          containerSocket.onclose = function (code, reason) {
            apiSocket.close();
            term.close();
            debug("Containet WebSocket Disconnected:", code, reason);
          };
          containerSocket.onerror = function (err) {
            console.error(err);
          };

          const apiWSURL = `ws${sProtocol}://${host}/vmws?cid=${containerId}`;
          apiSocket = new WebSocket(apiWSURL);
          apiSocket.onopen = function () {
            debug("API WebSocket Connection Opened");
            setTimeout(function () {
              terminalResize();
            }, 1000);

            if (testIsActive) {
              file = {
                filename: "main.py",
                filepath: `${tempDirPath}/main.py`,
                changed: false,
                doc: new CodeMirror.Doc(`print("Olá, mundo!")`),
              };
              openedFiles.push(file);

              currentOpenTab = 0;
              changeCurrentOpenedTabWithFile(file);
              saveFile();
              setTimeout(() => {
                setActionFileStyle("main.py", false);
              }, 1000);
            }
          };
          debug(apiSocket);

          apiSocket.onclose = function (code, reason) {
            debug("API WebSocket Disconnected:", code, reason);
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

function saveFile() {
  if (currentOpenTab >= 0 && openedFiles.length > 0) {
    const file = openedFiles[currentOpenTab];
    writeFile(file.filepath, editor.getValue());
    const fileWasChanged = openedFiles[currentOpenTab].changed;
    openedFiles[currentOpenTab].changed = false;
    if (fileWasChanged) {
      renderFilesTabs();
    }
  }
}

function setOpenFile(event) {
  const clickItem = event.target.textContent;
  const files = document.querySelectorAll(".file-item");

  for (let i = 0; i < files.length; i++) {
    const current = files[i];
    if (current.querySelector(".file-item-name").textContent === clickItem) {
      closeFileStyle();
      current.classList.add("file-open");
      break;
    }
  }
}

function setActionFileStyle(text, close) {
  const files = document.querySelectorAll(".file-item");

  debug(text);

  for (let i = 0; i < files.length; i++) {
    const current = files[i];
    if (current.querySelector(".file-item-name").textContent === text) {
      if (close) {
        current.classList.remove("file-open");
      } else {
        current.classList.add("file-open");
      }
      break;
    }
  }
}

function closeFileStyle() {
  const element = document.querySelector(".file-open");
  element && element.classList.remove("file-open");
}

function renderFilesTabs() {
  const tabs = document.getElementById("tabs");
  tabs.replaceChildren();

  if (openedFiles.length === 0) {
    const filenameSpan = document.createElement("span");
    filenameSpan.textContent = "scratch";
    filenameSpan.style = "";

    const extensionIcon = document.createElement("span");
    extensionIcon.innerHTML = getExtensionIcon(filenameSpan.textContent);
    extensionIcon.style = "";

    const closeSpan = document.createElement("span");
    closeSpan.innerHTML = '<ion-icon name="close-circle"></ion-icon>';
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

    closeFileStyle();
    return;
  }

  let fileindex = 0;
  for (const file of openedFiles) {
    const filenameSpan = document.createElement("span");
    filenameSpan.classList.add("file-name-span");

    filenameSpan.textContent = file.changed
      ? `${file.filename} * `
      : file.filename;
    filenameSpan.onclick = changeCurrentOpenedTab;
    filenameSpan.dataset.fileindex = fileindex;
    filenameSpan.style = "";

    const extensionIcon = document.createElement("span");
    extensionIcon.innerHTML = getExtensionIcon(file.filename);
    extensionIcon.style = "";

    const closeSpan = document.createElement("span");
    closeSpan.innerHTML = '<ion-icon name="close-circle"></ion-icon>';
    closeSpan.onclick = closeTab;
    closeSpan.dataset.fileindex = fileindex;
    closeSpan.style = "";

    const p = document.createElement("div");
    p.appendChild(extensionIcon);
    p.appendChild(filenameSpan);
    p.appendChild(closeSpan);

    const li = document.createElement("li");
    li.appendChild(p);
    li.onclick = setOpenFile;
    li.dataset.filepath = file.filepath;
    if (currentOpenTab === fileindex) {
      li.classList.add("active-tab");
    }
    tabs.appendChild(li);
    fileindex++;
  }
}

function changeCurrentOpenedTab(event) {
  const tabindex = parseInt(event.target.dataset.fileindex);
  const file = openedFiles[tabindex];
  const filepath = file.filepath;

  openFile(filepath);
}

function changeCurrentOpenedTabWithFile(file) {
  closeFileStyle();
  setActionFileStyle(file.filename, false);

  const tabindex = openedFiles.findIndex(function (currentFile) {
    return currentFile.filepath === file.filepath;
  });
  editor.swapDoc(file.doc);
  changeEditorConfigsAndMode(file.filename);
  currentOpenTab = tabindex;
  renderFilesTabs();
}

function closeTab(event) {
  setActionFileStyle(
    event.target.parentNode.parentNode.querySelector(".file-name-span")
      .textContent,
    true
  );

  const tabindex = parseInt(event.target.parentNode.dataset.fileindex);
  openedFiles.splice(tabindex, 1);
  if (openedFiles.length == 0) {
    currentOpenTab = -1;
  } else {
    changeCurrentOpenedTabWithFile(openedFiles[openedFiles.length - 1]);
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
  div.innerHTML = `<ion-icon class="filesystem-folder-icon" name="folder"></ion-icon>`;
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
  li.classList.add("file-item");
  const div = document.createElement("div");
  div.innerHTML = getExtensionIcon(child.name, false);
  const span = document.createElement("span");
  span.textContent = child.name;
  span.classList.add("file-item-name");
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
