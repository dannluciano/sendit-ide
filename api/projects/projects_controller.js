import fs from "node:fs";
import os from "node:os";
import { Readable } from "stream";

import archiver from "archiver";

import { log } from "../utils.js";
import DB from "../database.js";

function downloadProject(c) {
  try {
    log("DOWNLOAD-PROJECT", "Gererating Zip File");
    const projectId = c.req.param("pid");
    const cuJSON = DB.get(projectId);
    const output = fs.createWriteStream(`${os.tmpdir}/${projectId}.zip`);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.on("warning", function (err) {
      if (err.code === "ENOENT") {
        log("DOWNLOAD-PROJECT", err);
      } else {
        throw err;
      }
    });
    archive.on("error", function (err) {
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

export { downloadProject };
