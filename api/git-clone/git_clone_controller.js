import { URL } from "node:url";
import { exec } from "node:child_process";
import { promisify } from "node:util";
const execP = promisify(exec);

import { nanoid } from "nanoid";

import { createTempDir } from "../computer_unit/temp_dir.js";
import { log } from "../utils.js";
import ComputerUnit from "../computer_unit/computer_unit.js";
import DB from "../database.js";

async function gitClone(c) {
  try {
    const url = new URL(c.req.url);
    const repositoryUrl = new URL(url.pathname.substring(3));
    const projectId = nanoid();
    const tempDir = await createTempDir();

    log(tempDir);

    log("GIT CLONE", "Running git clone");
    await runCommand(`git clone ${repositoryUrl.toString()} .`, tempDir);
    log("GIT CLONE", "Done");

    const computerUnit = new ComputerUnit(null, tempDir, projectId);

    DB.set(computerUnit.projectId, computerUnit.toJSON());

    return c.redirect(`/p/${projectId}`);
  } catch (error) {
    console.error(error);
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
