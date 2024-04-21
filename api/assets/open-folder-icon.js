function toggleFolderIcon(element) {
  const icon = element.querySelector(".filesystem-folder-icon");
  const foldername =
    element.parentElement.parentElement.parentElement.dataset["path"]
      .split("/")
      .pop() || "folder";
  if (icon.getAttribute("name") === "folder") {
    const folderIcon = getFolderIcon("folder-open");
    icon.setAttribute("name", folderIcon);
  } else {
    const folderIcon = getFolderIcon(foldername);
    icon.setAttribute("name", folderIcon);
  }
}
