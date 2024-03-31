import * as chokidar from "chokidar";
import { default as directoryTree } from "directory-tree";

export default class ComputerUnit {
  constructor(containerInstance, tempDirPath, projectId) {
    if (containerInstance) {
      this.id = containerInstance.id;
      this.containerId = containerInstance.id;
      this.containerInstance = containerInstance;
    }
    this.tempDirPath = tempDirPath;
    this.projectId = projectId;
    this.ws = null;

    if (!tempDirPath) {
      console.info(`==> Watching Temp Dir Disable`);
      return;
    }

    console.info(`==> Watching Temp Dir: ${tempDirPath} Enable`);
    chokidar
      .watch(tempDirPath, {
        ignored: /(^|[\/\\])\..|.cache|env/,
        ignoreInitial: true,
      })
      .on("all", (event, path) => {
        console.log(event, path);
        if (this.ws) {
          const tree = directoryTree(tempDirPath, {
            exclude: /\.npm|\.cache|env/,
          });
          this.ws.send(
            JSON.stringify({
              type: "fs",
              params: tree,
            })
          );
        }
      });
  }

  to_json() {
    return {
      "container-id": this.containerId,
      "temp-dir-path": this.tempDirPath,
      "project-id": this.projectId,
    };
  }
}
