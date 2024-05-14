import fs from "node:fs/promises";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { nanoid } from "nanoid";
import configs from "../configs.js";
import { db } from "../database.js";
import { log } from "../utils.js";
import { generatePasswordHash, verifyPassword } from "./password_hash_utils.js";

async function render(filename) {
  const __dirname = new URL("./", import.meta.url).pathname;
  const filepath = `${__dirname}${filename}`;
  const content = await fs.readFile(filepath);
  return content;
}

async function signin(c) {
  const current_user = await getSignedCookie(
    c,
    configs.COOKIE_SECRET,
    "user_username",
  );
  if (current_user) {
    return c.redirect("/");
  }
  return c.html(render("signin.html"));
}

async function signup(c) {
  const current_user = await getSignedCookie(
    c,
    configs.COOKIE_SECRET,
    "user_username",
  );
  console.log(current_user);
  if (current_user) {
    return c.redirect("/");
  }
  return c.html(render("signup.html"));
}

async function createUser(c) {
  const credentials = await c.req.json();
  const errorsMessages = [];
  const fieldsWithErrors = new Set();

  const requiredFields = ["username", "email", "password"];
  const requiredFieldsNames = {
    username: "Nome de Usuário",
    email: "E-mail",
    password: "Senha",
  };

  for (const field of requiredFields) {
    if (!credentials[field]) {
      errorsMessages.push(
        `Faltando Campos Obrigatótios (${requiredFieldsNames[field]}).`,
      );
      fieldsWithErrors.add(field);
    }
  }

  if (credentials.password !== credentials.password_confirmation) {
    fieldsWithErrors.add("password");
    fieldsWithErrors.add("password_confirmation");
    errorsMessages.push(
      "Senhas diferentes! Verifique a Senha e a Confirmação de Senhas",
    );
  }

  try {
    const password_hash = generatePasswordHash(credentials.password);

    const stmt = db.prepare(
      "INSERT INTO users (uuid, username, email, password_hash) VALUES (?, ?, ?, ?)",
    );
    stmt.run(nanoid(), credentials.username, credentials.email, password_hash);

    log("CREATE USER", "successs");
  } catch (error) {
    log("CREATE USER", "failure");
    console.error(error);
    errorsMessages.push("Erro no Servidor");
  }

  if (errorsMessages.length === 0) {
    return c.json(
      {
        user: {
          username: credentials.username,
          email: credentials.email,
        },
        redirect_to: "/",
      },
      201,
    );
  }
  return c.json(
    {
      errors: errorsMessages,
      fields: Array.from(fieldsWithErrors),
    },
    403,
  );
}

async function logIn(c) {
  log("AUTH", "Authentication Started");
  const credentials = await c.req.json();

  const stmt = db.prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
  const user = stmt.get(credentials.username);
  if (user && verifyPassword(credentials.password, user.password_hash)) {
    await setSignedCookie(
      c,
      "user_username",
      user.username,
      configs.COOKIE_SECRET,
    );
    log("AUTH", "Success");
    return c.json({
      redirect_to: "/",
    });
  }
  log("AUTH", "Failure");
  throw new HTTPException(401);
}

function logOut(redirectTo) {
  return async (c) => {
    deleteCookie(c, "user_username");
    return c.json({
      redirect_to: redirectTo,
    });
  };
}

export { createUser, logIn, logOut, signin, signup };
