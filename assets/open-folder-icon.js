function toggleFolderIcon(element) {
  const icon = element.querySelector(".filesystem-folder-icon");
  if (icon.getAttribute("name") === "folder") {
    icon.setAttribute("name", "folder-open");
  } else {
    icon.setAttribute("name", "folder");
  }
}
