import { setSignedCookie } from "hono/cookie";

import configs from "../configs.js";

export default async function verifyUser(username, password, c) {
  if (configs.BYPASS_AUTH) {
    return true;
  }
  const authFormData = new FormData();
  authFormData.set("username", username);
  authFormData.set("password", password);
  const response = await fetch(
    `${configs.AUTH_SERVER_URL_INTERNAL}/api/auth/`,
    {
      body: authFormData,
      method: "POST",
    },
  );
  if (response.status !== 403) {
    const authDataJSON = await response.json();
    c.set("auth-data", authDataJSON);
    setSignedCookie(c, "user_id", authDataJSON.user.id, configs.COOKIE_SECRET);
    setSignedCookie(
      c,
      "user_username",
      authDataJSON.user.username,
      configs.COOKIE_SECRET,
    );
    log("AUTH", "Success");
    return true;
  }
  log("AUTH", "Failure");
  return false;
}
