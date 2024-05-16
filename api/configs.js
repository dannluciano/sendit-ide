const DATABASE_PROD_PATH = "/var/storages/sendit-ide/sendit-ide.sqlite3";

const DATABASE_DEV_PATH = "sendit-ide.sqlite3";

const PORT = process.env.PORT || 8001;

const SENDIT_IDE_URL = process.env.SENDIT_IDE_URL || "http://localhost:8001";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "cookie-secret-random";

const ENV = process.env.ENV || "development";

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
  SENDIT_IDE_URL,
  DATABASE_NAME,
  COOKIE_SECRET,
  ENV,
  MAILGUN_DOMAIN,
  MAILGUN_FROM_EMAIL,
  MAILGUN_API_KEY,
};
