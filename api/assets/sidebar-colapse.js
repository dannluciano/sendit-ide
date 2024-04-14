function toggleFilesystemSidebar(element) {
  const filesystem = document.querySelector("#filesystem");

  if (filesystem.classList.contains("hidden")) {
    filesystem.classList.remove("hidden");
    element.name = "file-tray"
  } else {
    filesystem.classList.add("hidden");
    element.name = "file-tray-full"
  }
}
