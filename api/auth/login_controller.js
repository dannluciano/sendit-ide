import fs from "node:fs/promises";
import { setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import configs from "../configs.js";
import { db } from "../database.js";
import { log } from "../utils.js";
import { verifyPassword } from "./password_hash_utils.js";

async function render(filename) {
  const __dirname = new URL("./", import.meta.url).pathname;
  const filepath = `${__dirname}${filename}`;
  const content = await fs.readFile(filepath);
  return content;
}

async function signin(c) {
  return c.html(render("signin.html"));
}

async function signup(c) {
  return c.html(render("signup.html"));
}

async function authenticate(c) {
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

export { authenticate, signin, signup };
