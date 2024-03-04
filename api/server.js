import * as fs from "node:fs/promises";
import * as path from "node:path";

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { WebSocketServer } from "ws";
import * as dockerode from "dockerode";

import { default as directoryTree } from "directory-tree";
import configs from "./configs.js";
import DockerEngine from "./containers/docker_engine.js";
import DB from "./database.js";

let dockerConnection;

try {
  console.info("==> Connecting to Docker Daemon");
  dockerConnection = new dockerode.default(configs.DOCKER_ENGINE_SOCKET);
  const infos = await dockerConnection.version();
  console.info("==> Docker Daemon Connection Info");
  console.info(infos);
} catch (error) {
  console.error(error);
  console.error("==> Cannot Connect to Docker Daemon!");
  console.error("==> Exiting...");
  process.exit(1);
}

const dockerEngine = new DockerEngine(dockerConnection);
const app = new Hono();

app.use("*", logger());

app.get("/", async (c) => {
  // nanoid;
});

app.get("/version", async (c) => {
  return c.text("v0.0.1");
});

app.get("/fs/file/open/:cid/:pathenc", async (c) => {
  try {
    const cid = c.req.param("cid");
    const pathEncoded = c.req.param("pathenc");
    const filename = Buffer.from(pathEncoded, "base64")
      .toString("utf-8")
      .substring(1);
    const containerInstance = await dockerConnection
      .getContainer(cid)
      .inspect();

    const container = DB.get(containerInstance.Id);
    const filepath = `${container.temp_dir_path}/${filename}`;
    const content = await fs.readFile(filepath);

    if (container.ws) {
      ws.send(
        JSON.stringify({
          type: "open",
          params: {
            filename,
            filepath,
            content: content.toString("utf-8"),
          },
        })
      );
    }

    return new Response("Ok");
  } catch (error) {
    console.error(error);
    return new Response("File not found", {
      status: 404,
    });
  }
});

app.post("/create", async (c) => {
  try {
    const container = await dockerEngine.createContainer();
    DB.set(container.id, container);
    const containerCreateResponse = {
      "container-id": container.id,
      "temp-dir-path": container.temp_dir_path,
    };
    return c.json(containerCreateResponse);
  } catch (error) {
    console.error(error);
    return c.json(
      {
        msg: error.msg,
      },
      500
    );
  }
});

const server = serve(
  {
    fetch: app.fetch,
    port: configs.PORT,
  },
  (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
  }
);

const wss = new WebSocketServer({
  server,
});

wss.on("connection", connection);

async function connection(ws, req) {
  console.info(`WebSocket Connection opened: ${JSON.stringify(req.url)}`);
  const containerId = new URL(req.url, "http://localhost").searchParams.get(
    "cid"
  );

  const container = DB.get(containerId) || {};
  container.ws = ws;

  const tree = directoryTree(container.temp_dir_path);

  ws.send(
    JSON.stringify({
      type: "fs",
      params: tree,
    })
  );

  ws.on("message", async function message(message) {
    try {
      const cmd = JSON.parse(message);
      if (cmd.type === "resize") {
        const container = dockerConnection.getContainer(containerId);
        await container.resize(cmd.params);
      }
      if (cmd.type === "write") {
        const { filename, source } = cmd.params;
        const temp_dir_path = container.temp_dir_path;
        const path = `${temp_dir_path}/${filename}`;
        await fs.writeFile(path, source);
      }
      if (cmd.type === "writeInPath") {
        const { filepath, source } = cmd.params;
        await fs.writeFile(filepath, source);
      }
      if (cmd.type === "mkdir") {
        const { folderpath } = cmd.params;
        await fs.mkdir(folderpath, {
          recursive: true,
        });
      }
      if (cmd.type === "open") {
        const { filepath } = cmd.params;
        const content = await fs.readFile(filepath);
        const filename = path.basename(filepath);

        ws.send(
          JSON.stringify({
            type: "open",
            params: {
              filename,
              filepath,
              content: content.toString("utf-8"),
            },
          })
        );
      }
    } catch (error) {
      console.error(error);
    }
  });

  ws.on("close", async function close() {
    console.info(`WebSocket Connection closed:`);
    console.info("==> Connecting to Docker Daemon");
    try {
      const container = dockerConnection.getContainer(containerId);
      console.info("==> Removing Docker Container: ", containerId);
      await container.stop();
      // await container.remove()
    } catch (error) {
      if (error.reason === "no such container") return;
      console.error(error);
    }
  });
  ws.on("error", console.error);
}

async function handle_signals() {
  console.log("Ctrl-C was pressed");
  dockerConnection.removeContainers();
  server.close();
  wss.close();
}

process.on("SIGINT", handle_signals);
process.on("SIGTERM", handle_signals);
