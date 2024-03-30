import * as chokidar from "chokidar";
import { default as directoryTree } from "directory-tree";

export default class Container {
  constructor(containerInstance, tempDirPath, projectId) {
    this.id = containerInstance.id;
    this.containerInstance = containerInstance;
    this.tempDirPath = tempDirPath;
    this.projectId = projectId;
    this.ws = null;

    console.info(`==> Watching Temp Dir: ${tempDirPath}`);
    chokidar
      .watch(tempDirPath, {
        ignoreInitial: true,
      })
      .on("all", (event, path) => {
        console.log(event, path);
        if (this.ws) {
          const tree = directoryTree(tempDirPath);
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
