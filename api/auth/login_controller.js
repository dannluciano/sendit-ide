import fs from "node:fs/promises";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import Mailgun from "mailgun.js";
import { nanoid } from "nanoid";
import configs from "../configs.js";
import { db } from "../database.js";
import { log } from "../utils.js";
import { generatePasswordHash, verifyPassword } from "./password_hash_utils.js";

async function render(filename, contextData = undefined) {
  const __dirname = new URL("./", import.meta.url).pathname;
  const filepath = `${__dirname}${filename}`;
  const content = await fs.readFile(filepath);

  if (contextData) {
    let contentOut = content.toString();
    for (const key in contextData) {
      if (Object.hasOwnProperty.call(contextData, key)) {
        const value = contextData[key];
        contentOut = contentOut.replaceAll(`\${${key}}`, value);
      }
    }
    return contentOut;
  }
  return content;
}

async function signInPage(c) {
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

async function signUpPage(c) {
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

function resetPasswordPage(c) {
  return c.html(render("reset_password.html"));
}

function resetPasswordConfirmationPage(c) {
  return c.html(render("reset_password_confirmation.html"));
}

function resetPasswordFormPage(c) {
  const uuid = c.req.param("uuid");
  return c.html(render("reset_password_form.html", { uuid }));
}

function sendResetPasswordLink(redirectTo) {
  return async (c) => {
    log("AUTH", "Reset Password Started");
    const credentials = await c.req.json();

    const stmt = db.prepare(
      "SELECT email, uuid FROM users WHERE email = ? LIMIT 1",
    );
    const user = stmt.get(credentials.email);
    if (user && user.email === credentials.email) {
      try {
        const mailgun = new Mailgun(FormData);
        const mg = mailgun.client({
          username: "api",
          key: configs.MAILGUN_API_KEY,
        });

        const htmlContent = await render("reset_password_mail_template.html", {
          "sendit-ide-url": configs.SENDIT_IDE_URL,
          uuid: user.uuid,
        });

        mg.messages.create(configs.MAILGUN_DOMAIN, {
          from: configs.MAILGUN_FROM_EMAIL,
          to: user.email,
          subject: "Redefinir Senha",
          html: htmlContent,
        });
      } catch (error) {
        log("AUTH", "Erro on send e-mail");
        console.error(error);
      }

      log("AUTH", "Reset Password Done");
      return c.json({
        redirect_to: `${redirectTo}?email=${user.email}`,
      });
    }
    log("AUTH", "Reset Password Failure");
    return c.json(
      {
        errors: ["Usuário não entrontrado e/ou não cadastrado!"],
        fields: ["email"],
      },
      403,
    );
  };
}

async function resetPassword(c) {
  log("AUTH", "Reset Password Started via link");
  const credentials = await c.req.json();

  const stmt = db.prepare("SELECT uuid FROM users WHERE uuid = ? LIMIT 1");
  const user = stmt.get(credentials.uuid);

  const errors = [];
  const fields = [];

  if (user && user.uuid === credentials.uuid) {
    if (credentials.password !== credentials.password_confirmation) {
      log("AUTH", "Passwords Don't Mismatch");
      errors.push("Senhas Diferentes!");
      fields.push("password", "password_confirmation");
    }

    const password_hash = generatePasswordHash(credentials.password);

    const stmt = db.prepare(
      "UPDATE users SET password_hash = ? WHERE uuid = ?",
    );
    stmt.run(password_hash, user.uuid);

    if (errors.length === 0) {
      log("AUTH", "Reset Password Done");
      return c.json({
        redirect_to: `/`,
      });
    }
    log("AUTH", "Reset Password Failure");
  }

  return c.json(
    {
      errors: errors,
      fields: fields,
    },
    403,
  );
}

export {
  createUser,
  logIn,
  logOut,
  resetPassword,
  sendResetPasswordLink,
  resetPasswordConfirmationPage,
  resetPasswordFormPage,
  resetPasswordPage,
  signInPage,
  signUpPage,
};
