import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import { Readable } from "node:stream";

import archiver from "archiver";

import DB, { WSDB } from "../database.js";
import { log } from "../utils.js";

import { nanoid } from "nanoid";
import ComputerUnit from "../computer_unit/computer_unit.js";
import { createTempDirAndCopyFilesFromPath } from "../computer_unit/temp_dir.js";

function downloadProject(c) {
  try {
    log("DOWNLOAD-PROJECT", "Gererating Zip File");
    const projectId = c.req.param("pid");
    const cuJSON = DB.get(projectId);
    const output = createWriteStream(`${os.tmpdir}/${projectId}.zip`);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.on("warning", (err) => {
      if (err.code === "ENOENT") {
        log("DOWNLOAD-PROJECT", err);
      } else {
        throw err;
      }
    });
    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);
    archive.directory(cuJSON["temp-dir-path"], false);
    archive.finalize();
    log("DOWNLOAD-PROJECT", "Done");

    const stream = Readable.toWeb(archive);
    return c.body(stream);
  } catch (error) {
    console.error(error);
    return new Response("Error on Server", {
      status: 500,
    });
  }
}

async function showProject(c) {
  const indexPath = new URL("./index.html", import.meta.url).pathname;
  try {
    const content = await fs.readFile(indexPath);
    return c.html(content, 200);
  } catch (error) {
    console.error(error);
    return new Response("Error on Server", {
      status: 500,
    });
  }
}

async function duplicateProject(c) {
  try {
    log("DUPLICATE-PROJECT", "Starting");
    const projectId = nanoid();
    const sourceProjectId = c.req.param("pid");
    const sourceTempDir = DB.get(sourceProjectId)["temp-dir-path"];
    const tempDirPath = await createTempDirAndCopyFilesFromPath(sourceTempDir);
    const computerUnit = new ComputerUnit(null, tempDirPath, projectId);
    DB.set(computerUnit.projectId, computerUnit.toJSON());

    log("DUPLICATE-PROJECT", "Done");
    return c.json({
      path: `/p/${projectId}`,
    });
  } catch (error) {
    console.error(error);
    return c.json(
      {
        msg: error.msg,
      },
      500,
    );
  }
}

function openProjectFile(dockerConnection, computeUnitService) {
  return async (c) => {
    try {
      const cid = c.req.param("cid");
      const pathEncoded = c.req.param("pathenc");
      const filename = Buffer.from(pathEncoded, "base64")
        .toString("utf-8")
        .substring(1);
      const containerInfo = await dockerConnection.getContainer(cid).inspect();

      log(
        "OPEN",
        `opening ${filename} on container ${cid} - ${containerInfo.Id}`,
      );

      const cuJSON = DB.get(containerInfo.Id);
      if (cuJSON) {
        const computerUnit = computeUnitService.fromJSON(cuJSON);

        const filepath = `${computerUnit.tempDirPath}/${filename}`;
        const content = await fs.readFile(filepath);

        const ws = WSDB.get(computerUnit.containerId);
        if (ws) {
          log(
            "OPEN",
            `sending content of ${filename} on container ${cid} via websocket`,
          );
          ws.send(
            JSON.stringify({
              type: "open",
              params: {
                filename,
                filepath,
                content: content.toString("utf-8"),
              },
            }),
          );
        }
        return new Response("Ok");
      }
    } catch (error) {
      console.error(error);
      return new Response("File not found", {
        status: 404,
      });
    }
  };
}

export { downloadProject, showProject, duplicateProject, openProjectFile };
