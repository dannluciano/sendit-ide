let containerId;
let tempDirPath;
let editor;

function fitTerminal() {
  fitAddon.fit();
  term.scrollToBottom();
}

window.addEventListener("resize", fitTerminal);

const term = new Terminal({
  theme: {
    background: 'var(--black)',
    black: 'var(--black)',
    brightBlack: 'var(--blackSecondary)',
    white: 'var(--white)',
    red: 'var(--red)',
    yellow: 'var(--yellow)',
    green: 'var(--green)',
    blue: 'var(--blue)',
    cyan: 'var(--cyan)',
    magenta: 'var(--pink)',
  }
});
const fitAddon = new FitAddon.FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById("terminal"));
term.write("\x1B[1;3;31mCarregando...\x1B[0m $ ");


document.addEventListener("DOMContentLoaded", () => {

  editor = CodeMirror.fromTextArea(document.querySelector("#editor"), {
    lineNumbers: true,
    styleActiveLine: true,
    matchBrackets: true
  });

  editor.setOption('theme', 'dracula')

  const newFileButton = document.getElementById('new-file-button')
  newFileButton.addEventListener('click', function () {
    const data = {
      'temp-dir-path': tempDirPath,
      'filename': 'hello.txt',
    }
    fetch("/fs/file/create", {
        method: "POST",
        body: JSON.stringify(data)
      })
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
      })
  })

  const stopButton = document.getElementById('stop-button')
  stopButton.addEventListener('click', function () {
    const data = {
      'container-id': containerId,
    }
    fetch("/stop", {
        method: "POST",
        body: JSON.stringify(data)
      })
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
      })
  })

  fetch("/create", {
      method: "POST",
    })
    .then((res) => res.json())
    .then((data) => {
      containerId = data["container-id"];
      tempDirPath = data["temp-dir-path"];
      setTimeout(() => {
        try {
          const containerURL = `ws://localhost/containers/${containerId}/attach/ws?logs=true&stream=true&stdin=true&stdout=true&stderr=true&stdout=true`;
          const containerSocket = new WebSocket(containerURL);
          containerSocket.onopen = function () {
            const attachAddon = new AttachAddon.AttachAddon(containerSocket);
            term.loadAddon(attachAddon);
            fitTerminal();
            term.reset();
            term.paste("clear\n");
          };
          console.info(containerSocket)

          containerSocket.onclose = function (code, reason) {
            apiSocket.close();
            term.reset();
            term.writeln('Disconnected');
            console.log("Containet WebSocket Disconnected:", code, reason);
          };
          containerSocket.onerror = function (err) {
            console.error(err);
          };

          const containerWSURL = `ws://localhost:8000/vmws?cid=${containerId}`;
          const apiSocket = new WebSocket(containerWSURL);
          apiSocket.onopen = function () {
            console.info('API WebSocket Connection Opened')
            apiSocket.send(JSON.stringify({
              'type': 'resize',
              params: {
                'w': term.cols,
                'h': term.rows,
              }
            }))
          };
          console.info(apiSocket)

          apiSocket.onclose = function (code, reason) {
            console.log("API WebSocket Disconnected:", code, reason);
          };
          apiSocket.onerror = function (err) {
            console.error(err);
          };

          apiSocket.addEventListener("message", event => {
            const root = document.getElementById('root')
            Idiomorph.morph(root, event.data)
          })

        } catch (error) {
          console.error(error)
        }
      }, 1000);
    });
  // fetch("/run", {
  //     method: "POST",
  //     body: JSON.stringify({
  //       code: editor.value,
  //       containerId: containerId,
  //     }),
  //   })
  //   .then((res) => res.json())
  //   .then((data) => {
  //     console.info(data);
  //   });
});