import { getSignedCookie } from "hono/cookie";
import configs from "../configs.js";
import { log } from "../utils.js";

export default async function authMiddleware(c, next) {
  try {
    const username = await getSignedCookie(
      c,
      configs.COOKIE_SECRET,
      "user_username",
    );
    if (username) {
      log("AUTH MIDDLEWARE", "success");
      return await next();
    }
    log("AUTH MIDDLEWARE", "failure");
    return c.redirect("/pages/signin");
  } catch (error) {
    console.error(error);
    return c.redirect("/pages/signin");
  }
}
