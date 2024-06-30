import { exec } from "node:child_process";
import { URL } from "node:url";
import { promisify } from "node:util";
const execP = promisify(exec);

import { nanoid } from "nanoid";

import { HTTPException } from "hono/http-exception";
import ComputerUnit from "../computer_unit/computer_unit.js";
import { createTempDir } from "../computer_unit/temp_dir.js";
import DB from "../database.js";
import { log } from "../utils.js";

async function gitClone(c) {
  try {
    const url = new URL(c.req.url);
    const repositoryUrl = new URL(url.pathname.substring(7));
    const projectId = nanoid();
    const tempDir = await createTempDir();
    const ownerUUID = c.get("user-uuid");

    log("GIT CLONE", "Running git clone");
    await runCommand(`git clone ${repositoryUrl.toString()} .`, tempDir);
    log("GIT CLONE", "Done");

    const computerUnit = new ComputerUnit(null, tempDir, projectId, ownerUUID);

    DB.set(computerUnit.projectId, computerUnit.toJSON());

    return c.redirect(`/api/p/${projectId}`);
  } catch (error) {
    console.error(error);
    throw new HTTPException(400, { message: "Invalid URL" });
  }
}

async function runCommand(command, cwd) {
  try {
    log("COMMAND", cwd, command);
    const { stdout, stderr } = await execP(command, {
      cwd: cwd,
    });

    log("COMMAND", `stdout: ${stdout}`);

    if (stderr) {
      console.error("COMMAND", `stderr: ${stderr}`);
    }
  } catch (error) {
    console.error(error);
  }
}

export { gitClone };
