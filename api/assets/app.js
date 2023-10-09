const term = new Terminal();
term.open(document.getElementById("terminal"));
term.write("\x1B[1;3;31mCarregando...\x1B[0m $ ");

const runButton = document.getElementById("run");
const editor = document.getElementById("editor");
runButton.addEventListener("click", () => {
  fetch("/run", {
    method: "POST",
    body: JSON.stringify({
      code: editor.value,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.info(data);
    });
});

fetch("/create", {
  method: "POST",
})
  .then((res) => res.json())
  .then((data) => {
    setTimeout(() => {
      const containerURL = `ws://localhost:5100/containers/${data.id}/attach/ws?logs=true&stream=true&stdin=true&stdout=true&stderr=true&stdout=true`;
      const socket = new WebSocket(containerURL);
      socket.onopen = function () {
        const attachAddon = new AttachAddon.AttachAddon(socket);
        term.loadAddon(attachAddon);
        term.reset();
        term.paste('cd\n')    
      }
      
    }, 1000);
  });
