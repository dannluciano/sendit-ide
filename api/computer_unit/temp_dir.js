import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";

function log() {
  console.info("TMP ==>", ...arguments);
}

async function createTempDir() {
  log("Creating Temp Folder");
  const tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), "ide-vm-home-"));
  log(`Created Temp Folder: ${tempDirPath}`);
  return tempDirPath;
}

async function createTempDirAndCopyFilesFromPath(sourceTempDirPath) {
  const tempDirPath = await createTempDir();

  log(`Copying Temp Folder ${sourceTempDirPath} -> ${tempDirPath}`);
  await fs.cp(sourceTempDirPath, tempDirPath, { recursive: true });
  log(`Copyed Temp Folder: ${sourceTempDirPath} == ${tempDirPath}`);
  return tempDirPath;
}

export { createTempDir, createTempDirAndCopyFilesFromPath };
