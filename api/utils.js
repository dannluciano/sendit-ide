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

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    clearTimeout(timeout);
    if (immediate && !timeout) func.apply(context, args);
    timeout = setTimeout(function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    }, wait);
  };
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

export { log, sleep, throttle, debounce, sortTree };
