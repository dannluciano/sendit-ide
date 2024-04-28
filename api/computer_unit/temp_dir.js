import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

import * as chokidar from "chokidar";
import { default as directoryTree } from "directory-tree";

import { WSDB } from "../database.js";
import { debounce, log } from "../utils.js";

async function createTempDir() {
  log("TMP", "Creating Temp Folder");
  const tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), "ide-vm-home-"));
  log("TMP", `Created Temp Folder: ${tempDirPath}`);
  return tempDirPath;
}

async function createTempDirAndCopyFilesFromPath(sourceTempDirPath) {
  const tempDirPath = await createTempDir();

  log("TMP", `Copying Temp Folder ${sourceTempDirPath} -> ${tempDirPath}`);
  await fs.cp(sourceTempDirPath, tempDirPath, { recursive: true });
  log("TMP", `Copyed Temp Folder: ${sourceTempDirPath} == ${tempDirPath}`);
  return tempDirPath;
}

function watchTempDir(computerUnit) {
  try {
    if (!computerUnit.tempDirPath) {
      log("WATCH", `Watching Temp Dir Disable`);
      return;
    }

    function sendFileSystemChanges() {
      const ws = WSDB.get(computerUnit.containerId);
      if (ws) {
        const tree = directoryTree(computerUnit.tempDirPath, {
          exclude: /\.npm|\.cache|env|\.node_repl_history/,
        });
        ws.send(
          JSON.stringify({
            type: "fs",
            params: tree,
          })
        );
      }
    }

    const sendFileSystemChangesDebouced = debounce(sendFileSystemChanges, 1000);

    log("WATCH", `Watching Temp Dir: ${computerUnit.tempDirPath} Enable`);
    chokidar
      .watch(computerUnit.tempDirPath, {
        ignored: /(^|[\/\\])\..|.cache|env|node_modules/,
        ignoreInitial: true,
      })
      .on("all", function (event, path) {
        sendFileSystemChangesDebouced();
      });
  } catch (error) {
    console.error(error);
  }
}

export { createTempDir, createTempDirAndCopyFilesFromPath, watchTempDir };
