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

export { log, sleep };
