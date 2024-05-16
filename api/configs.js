const DATABASE_PROD_PATH = "/var/storages/sendit-ide/sendit-ide.sqlite3";
const DATABASE_DEV_PATH = "sendit-ide.sqlite3";
const PORT = process.env.PORT || 8001;

const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || "http://localhost:8000";

const AUTH_SERVER_URL_INTERNAL =
  process.env.AUTH_SERVER_URL || "http://host.docker.internal:8000";

const SENDIT_URL = process.env.SENDIT_URL || "http://localhost:8000";

const SENDIT_IDE_URL = process.env.SENDIT_IDE_URL || "http://localhost:8001";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "cookie-secret-random";

const ENV = process.env.ENV || "development";
const BYPASS_AUTH = ENV === "development";

let DATABASE_PATH = DATABASE_DEV_PATH;

if (process.env.NODE_ENV === "production") {
  DATABASE_PATH = DATABASE_PROD_PATH;
}

const DATABASE_NAME = DATABASE_PATH;

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "mg.dannluciano.com.br";

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || "mailgun-api-key";

const MAILGUN_FROM_EMAIL = "Dann Luciano <dannluciano@ifpi.edu.br>";

export default {
  DOCKER_ENGINE_SOCKET: {
    socketPath: "/var/run/docker.sock",
  },
  PORT,
  AUTH_SERVER_URL,
  AUTH_SERVER_URL_INTERNAL,
  SENDIT_URL,
  SENDIT_IDE_URL,
  DATABASE_NAME,
  COOKIE_SECRET,
  ENV,
  BYPASS_AUTH,
  MAILGUN_DOMAIN,
  MAILGUN_FROM_EMAIL,
  MAILGUN_API_KEY,
};
