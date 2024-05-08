import { log } from "../utils.js";
import ComputerUnit from "./computer_unit.js";
import { getEnvsFromSettings } from "./envs.js";
import { createTempDir } from "./temp_dir.js";

export default class ComputerUnitService {
  constructor(dockerConnection) {
    this.dockerConnection = dockerConnection;
  }

  async getOrCreateComputerUnit(computer_unit, settings = {}) {
    try {
      let containerInstance = this.dockerConnection.getContainer(
        computer_unit.containerId,
      );
      if (containerInstance.Id) {
        log("CPU", "Return Existing Container", containerInstance.Id);
        return computer_unit;
      }

      let tempDirPath = computer_unit.tempDirPath;
      if (!tempDirPath) {
        tempDirPath = await createTempDir();
      }

      const envs = getEnvsFromSettings(settings);

      log("Creating container");
      containerInstance = await this.dockerConnection.createContainer({
        Image: "sendit-ide-vm",
        AttachStdin: false,
        AttachStdout: false,
        AttachStderr: false,
        Tty: true,
        Cmd: ["/bin/bash"],
        Env: envs,
        OpenStdin: true,
        StdinOnce: false,
        WorkingDir: "/root",
        StopTimeout: 2,
        Volumes: {
          "/root": {},
        },
        ExposedPorts: {
          "8080/tcp": {},
        },
        HostConfig: {
          Binds: [`${tempDirPath}:/root`],
          AutoRemove: true,
          PublishAllPorts: true,
        },
        Labels: {
          "com.docker.instances.service": "vm",
        },
        StorageOpt: {
          "dm.basesize": "2G",
        },
      });

      log("CPU", "Starting container: ", containerInstance.id);
      await containerInstance.start();

      log("CPU", "Return New Container");
      return new ComputerUnit(
        containerInstance,
        tempDirPath,
        computer_unit.projectId,
      );
    } catch (error) {
      console.error("Error!", error);
      throw "Error! Cannot create container";
    }
  }

  fromJSON(cuJSON) {
    const containerInstance = this.dockerConnection.getContainer(
      cuJSON["container-id"],
    );
    const tempDirPath = cuJSON["temp-dir-path"];
    const projectId = cuJSON["project-id"];
    return new ComputerUnit(containerInstance, tempDirPath, projectId);
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
