const DATABASE_PROD_PATH = "/var/storages/sendit-ide/sendit-ide.sqlite3";
const DATABASE_DEV_PATH = "sendit-ide.sqlite3";
const PORT = process.env["PORT"] || 8001;

const AUTH_SERVER_URL =
  process.env["AUTH_SERVER_URL"] || "http://localhost:8000";
const AUTH_SERVER_URL_INTERNAL =
  process.env["AUTH_SERVER_URL"] || "http://host.docker.internal:8000";
const COOKIE_SECRET = process.env["COOKIE_SECRET"] || "cookie-secret-random";

const ENV = process.env["ENV"] || "development";
const BYPASS_AUTH = ENV === "development" ? true : false;

let DATABASE_PATH = DATABASE_DEV_PATH;

if (process.env["NODE_ENV"] == "production") {
  DATABASE_PATH = DATABASE_PROD_PATH;
}

const DATABASE_NAME = DATABASE_PATH;

export default {
  DOCKER_ENGINE_SOCKET: {
    socketPath: "/var/run/docker.sock",
  },
  PORT,
  AUTH_SERVER_URL,
  AUTH_SERVER_URL_INTERNAL,
  DATABASE_NAME,
  COOKIE_SECRET,
  ENV,
  BYPASS_AUTH,
};
