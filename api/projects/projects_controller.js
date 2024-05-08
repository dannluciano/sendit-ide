import fs from "node:fs/promises";
import os from "node:os";
import { Readable } from "node:stream";

import archiver from "archiver";

import DB from "../database.js";
import { log } from "../utils.js";

import ComputerUnit from "../computer_unit/computer_unit.js";
import { createTempDirAndCopyFilesFromPath } from "../computer_unit/temp_dir.js";

function downloadProject(c) {
  try {
    log("DOWNLOAD-PROJECT", "Gererating Zip File");
    const projectId = c.req.param("pid");
    const cuJSON = DB.get(projectId);
    const output = fs.createWriteStream(`${os.tmpdir}/${projectId}.zip`);
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
    const projectId = nanoid();
    const sourceProjectId = c.req.param("pid");
    const sourceTempDir = DB.get(sourceProjectId)["temp-dir-path"];
    const tempDirPath = await createTempDirAndCopyFilesFromPath(sourceTempDir);
    const computerUnit = new ComputerUnit(null, tempDirPath, projectId);
    DB.set(computerUnit.projectId, computerUnit.toJSON());

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

export { downloadProject, showProject, duplicateProject };
