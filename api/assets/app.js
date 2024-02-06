let containerId;
let tempDirPath;
let editor;
let apiSocket;
let containerSocket;

function fitTerminal() {
  console.info("Term Resize");
  fitAddon.fit();
  term.scrollToBottom();
}

window.addEventListener("resize", fitTerminal);

const term = new Terminal({
  theme: {
    background: "var(--black)",
    black: "var(--black)",
    brightBlack: "var(--blackSecondary)",
    white: "var(--white)",
    red: "var(--red)",
    yellow: "var(--yellow)",
    green: "var(--green)",
    blue: "var(--blue)",
    cyan: "var(--cyan)",
    magenta: "var(--pink)",
  },
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById("terminal"));
term.write("\x1B[1;3;31mCarregando...\x1B[0m $ ");

document.addEventListener("DOMContentLoaded", () => {
  editor = CodeMirror.fromTextArea(document.querySelector("#editor"), {
    mode: {
      name: "python",
      version: 3,
      singleLineStringErrors: false,
    },
    theme: "dracula",
    lineNumbers: true,
    indentUnit: 4,
    matchBrackets: true,
    styleActiveLine: true,
    matchBrackets: true,
  });

  editor.setSize("100%", "59vh");
  editor.setValue("print('ola mundo')");

  const newFileButton = document.getElementById("new-file-button");
  newFileButton.addEventListener("click", function () {
    const filename = document.getElementById("file-name").value;
    const data = {
      tempDirPath,
      filename,
    };
    fetch("/fs/file/create", {
      method: "POST",
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
      });
  });

  const newFolderButton = document.getElementById("new-folder-button");
  newFolderButton.addEventListener("click", function () {
    const filename = document.getElementById("file-name").value;
    const data = {
      tempDirPath,
      filename,
    };
    fetch("/fs/folder/create", {
      method: "POST",
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
      });
  });

  const languageSelect = document.getElementById("language-select");

  const runButton = document.getElementById("run-button");
  runButton.addEventListener("click", function () {
    const language = languageSelect.value;
    const source = editor.getValue();
    const filename = "main.py";

    apiSocket.send(
      JSON.stringify({
        type: "write",
        params: {
          filename,
          source,
        },
      }),
    );

    if (language === "py") {
      containerSocket.send(`python3 ${filename}\n`);
    }
  });

  const stopButton = document.getElementById("stop-button");
  stopButton.addEventListener("click", function () {
    const data = {
      "container-id": containerId,
    };
    fetch("/stop", {
      method: "POST",
      body: JSON.stringify(data),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
      });
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
          const containerURL = `ws://localhost:81/containers/${containerId}/attach/ws?logs=true&stream=true&stdin=true&stdout=true`; //&stderr=true
          containerSocket = new WebSocket(containerURL);
          containerSocket.onopen = function () {
            const attachAddon = new AttachAddon.AttachAddon(containerSocket);
            term.loadAddon(attachAddon);
            fitTerminal();
            term.reset();
            term.paste("clear\n");
          };
          console.info(containerSocket);

          containerSocket.onclose = function (code, reason) {
            apiSocket.close();
            term.reset();
            term.writeln("Disconnected");
            console.log("Containet WebSocket Disconnected:", code, reason);
          };
          containerSocket.onerror = function (err) {
            console.error(err);
          };

          const apiWSURL = `ws://localhost:8001/vmws?cid=${containerId}`;
          apiSocket = new WebSocket(apiWSURL);
          apiSocket.onopen = function () {
            console.info("API WebSocket Connection Opened");
            setTimeout(function () {
              apiSocket.send(
                JSON.stringify({
                  type: "resize",
                  params: {
                    w: term.cols,
                    h: term.rows,
                  },
                }),
              );
            }, 1000);
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
            console.log(event, type, params);
            if (type === "fs") {
              const root = document.getElementById("root");
              root.innerHTML = JSON.stringify(params);
            }
            if (type === "open") {
              editor.setValue(params);
            }
          });
        } catch (error) {
          console.error(error);
        }
      }, 1000);
    })
    .catch((error) => console.error(error));
});
