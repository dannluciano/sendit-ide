import * as chokidar from "chokidar";
export default class Container {
  constructor(containerInstance, temp_dir_path) {
    this.id = containerInstance.id;
    this.containerInstance = containerInstance;
    this.temp_dir_path = temp_dir_path;
    this.ws = null;

    console.info(`==> Watching Temp Dir: ${temp_dir_path}`);
    chokidar
      .watch(temp_dir_path, {
        ignoreInitial: true,
      })
      .on("all", (event, path) => {
        console.log(event, path);
        if (this.ws) {
          const tree = directoryTree(temp_dir_path);
          this.ws.send(
            JSON.stringify({
              type: "fs",
              params: tree,
            })
          );
        }
      });
  }
}
