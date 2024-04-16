function log(moduleName = "API") {
  const args = Array.from(arguments);
  args.unshift()
  console.info(args[0], "==>", ...arguments);
}

export { log };
