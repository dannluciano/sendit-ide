function toggleFilesystemSidebar(element) {
  const filesystem = document.querySelector("#filesystem");
  const editorTermSection = document.querySelector("#editor-term-section");
  if (!element) {
    element = document.getElementById("file-tray-icon");
  }

  if (filesystem.classList.contains("hidden")) {
    if (!onMobile) {
      document.documentElement.style.setProperty("--filesystem-width", "30vw");
    } else {
      document.documentElement.style.setProperty("--filesystem-width", "80vw");
    }
    editorTermSection.classList.toggle("hidden");
    filesystem.classList.toggle("hidden");
    element.name = "file-tray";
  } else {
    document.documentElement.style.setProperty("--filesystem-width", "0vw");
    filesystem.classList.toggle("hidden");
    editorTermSection.classList.toggle("hidden");
    element.name = "file-tray-full";
  }
  terminalResize();
}
