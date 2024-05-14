import { serveStatic } from "@hono/node-server/serve-static";

import { Hono } from "hono";
import { logger } from "hono/logger";

import isAuthenticated from "./auth/auth_middleware.js";
import {
  createUser,
  logIn,
  logOut,
  signin,
  signup,
} from "./auth/login_controller.js";
import ComputerUnitController from "./computer_unit/computer_unit_controller.js";
import { gitClone } from "./git-clone/git_clone_controller.js";
import home from "./home/home_controller.js";
import {
  downloadProject,
  duplicateProject,
  openProjectFile,
  showProject,
} from "./projects/projects_controller.js";
import assetlinks from "./pwa/assetslinks.js";

function setupRoutes(dockerConnection, computeUnitService) {
  const computerUnitController = new ComputerUnitController(computeUnitService);
  const app = new Hono();

  app.use("/assets/*", serveStatic({ root: "./api" }));

  app.get("/", home);

  app.use("/pages/*", logger());
  app.get("/pages/signin", signin);
  app.get("/pages/signup", signup);

  app.use("/users/create", logger());
  app.post("/users/create", createUser);
  app.use("/authenticate", logger());
  app.post("/authenticate", logIn);
  app.use("/logout", logger());
  app.post("/logout", logOut("/"));

  app.get("/.well-known/assetlinks.json", assetlinks);

  app.use("/public/*", logger());
  app.post("/public/project/download/:pid", downloadProject);

  app.use("/api/*", logger());
  app.use("/api/*", isAuthenticated);

  app.get("/api/p/:pid", showProject);

  app.get("/api/c/*", gitClone);

  app.post(
    "/api/container/create/:pid",
    computerUnitController.createComputerUnit.bind(computerUnitController),
  );

  app.post("/api/project/duplicate/:pid", duplicateProject);

  app.get("/version", async (c) => {
    return c.text("v0.0.1");
  });

  app.get(
    "/fs/file/open/:cid/:pathenc",
    openProjectFile(dockerConnection, computeUnitService),
  );

  return app;
}

export default setupRoutes;
