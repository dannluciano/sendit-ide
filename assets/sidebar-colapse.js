function toggleFilesystemSidebar() {
  const filesystem = document.querySelector("#filesystem");
  const noFilesystem = document.querySelector("#sidebar-no-show-filesystem");
  const editor = document.querySelector("#editor-container");

  if (filesystem.classList.contains("display-none")) {
    filesystem.classList.remove("display-none");
    noFilesystem.classList.add("display-none");
    editor.classList.remove("filsystem-colapsed");
  } else {
    filesystem.classList.add("display-none");
    noFilesystem.classList.remove("display-none");
    editor.classList.add("filsystem-colapsed");
  }
}
