import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import Container from "./container.js";

export default class DockerEngine {
  constructor(dockerConnection) {
    this.dockerConnection = dockerConnection;
  }

  async createContainer() {
    try {
      console.info("==> Creating Temp Folder");
      const temp_dir_path = await fs.mkdtemp(
        path.join(os.tmpdir(), "ide-vm-home-")
      );
      console.info(`==> Created Temp Folder: ${temp_dir_path}`);

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
          Binds: [`${temp_dir_path}:/root`],
          AutoRemove: true,
        },
        Labels: {
          "com.docker.instances.service": "vm",
        },
      });

      console.info("==> Starting container: ", containerInstance.id);
      await containerInstance.start();

      return new Container(containerInstance, temp_dir_path);
    } catch (error) {
      console.error("Error!", error);
      throw "Error! Cannot create container";
    }
  }

  async removeContainers() {
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
