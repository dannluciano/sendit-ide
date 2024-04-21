function log(moduleName = "API") {
  const args = Array.from(arguments);
  args.unshift();
  return function () {
    console.info(args[0], "==>", ...arguments);
  };
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
