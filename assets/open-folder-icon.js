function toggleFolderIcon(element) {
  const icon = element.querySelector(".filesystem-folder-icon");
  if (icon.getAttribute("name") === "folder") {
    icon.setAttribute("name", "folder-outline");
  } else {
    icon.setAttribute("name", "folder");
  }
}
