export default class ComputerUnit {
  constructor(containerInstance, tempDirPath, projectId) {
    if (containerInstance) {
      this.id = containerInstance.id;
      this.containerId = containerInstance.id;
      this.containerInstance = containerInstance;
    }
    this.tempDirPath = tempDirPath;
    this.projectId = projectId;
    this.ws = null;
  }

  toJSON() {
    return {
      "container-id": this.containerId,
      "temp-dir-path": this.tempDirPath,
      "project-id": this.projectId,
      ws: this.ws,
    };
  }
}
