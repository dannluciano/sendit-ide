const DATABASE_PROD_PATH = "/var/storages/sendit-ide/sendit-ide.sqlite3";
const DATABASE_DEV_PATH = "sendit-ide.sqlite3";
let DATABASE_PATH = DATABASE_DEV_PATH;

if (process.env["ENV"] == "production") {
  DATABASE_PATH = DATABASE_PROD_PATH;
}

export default {
  DOCKER_ENGINE_SOCKET: {
    socketPath: "/var/run/docker.sock",
  },
  PORT: process.env["PORT"] || 8001,
  DATABASE_NAME: DATABASE_PATH,
};
