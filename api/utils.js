function log(moduleName = "API", msg) {
  if (msg) {
    const args = Array.from(arguments);
    args.shift();
    console.info(moduleName, "==>", ...args);
  } else {
    console.info(...arguments);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sortTree(treeChildren = [], type = "directory") {
  let targetArray = [];
  let restArray = [];

  for (let index = 0; index < treeChildren.length; ++index) {
    let pathObj = treeChildren[index];
    if (pathObj.children?.length) {
      sortTree(pathObj.children, type);
    }

    if (pathObj.type == type) targetArray.push(pathObj);
    else restArray.push(pathObj);
  }

  let resultTree = [...targetArray, ...restArray];
  for (let index = 0; index < treeChildren.length; ++index) {
    treeChildren[index] = resultTree[index];
  }

  return resultTree;
}

export { log, sleep, sortTree };
