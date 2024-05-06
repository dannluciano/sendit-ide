import { nanoid } from "nanoid";

export default async function home(c) {
  const projectId = nanoid();
  return c.redirect(`/p/${projectId}`);
}
