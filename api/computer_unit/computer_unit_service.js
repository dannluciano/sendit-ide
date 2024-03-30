import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import ComputerUnit from "./computer_unit.js";

export default class ComputerUnitService {
  constructor(dockerConnection) {
    this.dockerConnection = dockerConnection;
  }

  async createComputerUnit(projectId, _tempDirPath=null) {
    try {
      let tempDirPath = _tempDirPath
      if (!tempDirPath) {
        console.info("==> Creating Temp Folder");
        tempDirPath = await fs.mkdtemp(
          path.join(os.tmpdir(), "ide-vm-home-")
        );
        console.info(`==> Created Temp Folder: ${tempDirPath}`);
      }

      console.info("==> Creating container");
      const containerInstance = await this.dockerConnection.createContainer({
        Image: "sendit-ide-vm",
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        Tty: true,
        Cmd: ["/bin/bash"],
        OpenStdin: true,
        StdinOnce: false,
        WorkingDir: "/root",
        StopTimeout: 10,
        Volumes: {
          "/root": {},
        },
        HostConfig: {
          Binds: [`${tempDirPath}:/root`],
          AutoRemove: true,
        },
        Labels: {
          "com.docker.instances.service": "vm",
        },
      });

      console.info("==> Starting container: ", containerInstance.id);
      await containerInstance.start();

      return new ComputerUnit(containerInstance, tempDirPath, projectId);
    } catch (error) {
      console.error("Error!", error);
      throw "Error! Cannot create container";
    }
  }

  async removeComputerUnits() {
    const opts = {
      filters: '{"label": ["com.docker.instances.service": "vm"]}',
    };

    try {
      await this.dockerConnection.pruneContainers({
        opts,
      });
    } catch (error) {
      console.error(error);
    }
  }
}
