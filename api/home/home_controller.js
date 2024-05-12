import { getSignedCookie } from "hono/cookie";
import { nanoid } from "nanoid";
import configs from "../configs.js";

export default async function home(c) {
  try {
    const username = await getSignedCookie(
      c,
      configs.COOKIE_SECRET,
      "user_username",
    );
    if (username) {
      const projectId = nanoid();
      return c.redirect(`/api/p/${projectId}`);
    }
    return c.redirect("/pages/signin");
  } catch (error) {
    return c.redirect("/pages/signin");
  }
}
