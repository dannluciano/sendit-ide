export default {
  DOCKER_ENGINE_SOCKET: {
    socketPath: "/var/run/docker.sock",
  },
  PORT: process.env["PORT"] || 8001,
  DATABASE_NAME: '/var/storages/sendit-ide/sendit-ide.sqlite3'
};
