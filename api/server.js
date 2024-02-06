import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

// import * as process from 'node:process';

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { WebSocketServer } from "ws";

import * as dockerode from "dockerode";
import * as chokidar from "chokidar";
import { default as directoryTree } from "directory-tree";

const wsDB = new Map();

let docker;
try {
  console.info("==> Connecting to Docker Daemon");
  docker = new dockerode.default({
    socketPath: "/var/run/docker.sock",
  });
  const infos = await docker.version();
  console.info("==> Docker Daemon Connection Info");
  console.info(infos);
} catch (error) {
  console.error(error);
  console.error("==> Cannot Connect to Docker Daemon!");
  console.error("==> Exiting...");
  process.exit(1);
}

async function createContainer() {
  try {
    console.info("==> Creating Temp Folder");
    const temp_dir_path = await fs.mkdtemp(
      path.join(os.tmpdir(), "ide-vm-home-"),
    );
    console.info(`==> Created Temp Folder: ${temp_dir_path}`);

    console.info("==> Creating container");
    const container = await docker.createContainer({
      Image: "sendit-ide-vm",
      AttachStdin: false,
      AttachStdout: false,
      AttachStderr: false,
      Tty: true,
      Cmd: ["/bin/bash"],
      OpenStdin: true,
      StdinOnce: false,
      WorkingDir: "/root",
      StopTimeout: 10,
      Volumes: {
        "/root": {},
      },
      HostConfig: {
        Binds: [`${temp_dir_path}:/root`],
        AutoRemove: true,
      },
      Labels: {
        "com.docker.compose.service": "vm",
      },
    });

    console.info("==> Starting container: ", container.id);
    await container.start();

    wsDB.set(container.id, {
      temp_dir_path: temp_dir_path,
      ws: null,
    });

    console.info(`==> Watching Temp Dir: ${temp_dir_path}`);
    chokidar.watch(temp_dir_path).on("all", (event, path) => {
      console.log(event, path);
      const containerInfo = wsDB.get(container.id);
      if (containerInfo.ws) {
        const tree = directoryTree(temp_dir_path);
        containerInfo.ws.send(
          JSON.stringify({
            type: "fs",
            param: tree,
          }),
        );
      }
    });

    return {
      "container-id": container.id,
      "temp-dir-path": temp_dir_path,
    };
  } catch (error) {
    console.error("Error!", error);
    return {
      msg: "Error! Cannot create container",
    };
  }
}

const indexHTML = await fs.readFile("./index.html");

const app = new Hono();

app.use("*", logger());

app.use(
  "/assets/*",
  serveStatic({
    root: "./",
  }),
);

app.get("/", (c) => {
  return c.html(indexHTML);
});

app.get("/fs/file/open/:cid/:pathenc", async (c) => {
  try {
    const cid = c.req.param("cid");
    const pathEncoded = c.req.param("pathenc");
    const path = Buffer.from(pathEncoded, "base64").toString("utf-8");

    const container = await docker.getContainer(cid).inspect();

    const { temp_dir_path, ws } = wsDB.get(container.Id);
    const content = await fs.readFile(`${temp_dir_path}/${path}`);

    ws.send(
      JSON.stringify({
        type: "open",
        param: content,
      }),
    );

    return new Response("");
  } catch (error) {
    console.error(error);

    ws.send(
      JSON.stringify({
        type: "open",
        param: content,
      }),
    );
    return new Response("File not found", {
      status: 404,
    });
  }
});

app.post("/create", async (c) => {
  return c.json(await createContainer());
});

const server = serve(
  {
    fetch: app.fetch,
    port: process.env["PORT"] || 8001,
  },
  (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
  },
);

const wss = new WebSocketServer({
  server,
});

wss.on("connection", connection);

async function connection(ws, req) {
  console.info(`WebSocket Connection opened: ${JSON.stringify(req.url)}`);
  const sessionid = req.headers.sessionid;
  const containerId = new URL(req.url, "http://localhost").searchParams.get(
    "cid",
  );

  const containerInfo = wsDB.get(containerId) || {};
  containerInfo.ws = ws;
  wsDB.set(containerId, containerInfo);

  ws.on("message", async function message(message) {
    try {
      console.info(
        `WebSocket Message Received from: ${JSON.stringify(message)}`,
      );
      const cmd = JSON.parse(message);
      if (cmd.type === "resize") {
        const container = docker.getContainer(containerId);
        await container.resize(cmd.params);
      }
      if (cmd.type === "write") {
        const { filename, source } = cmd.params;
        const temp_dir_path = containerInfo.temp_dir_path;
        const path = `${temp_dir_path}/${filename}`;
        await fs.writeFile(path, source);
      }
    } catch (error) {
      console.error(error);
    }
  });

  ws.on("close", async function close() {
    console.info(`WebSocket Connection closed:`);
    console.info("==> Connecting to Docker Daemon");
    try {
      const container = docker.getContainer(containerId);
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

  const opts = {
    filters: '{"label": ["com.docker.compose.service","vm"]}',
  };

  try {
    const containers = await docker.listContainers({
      opts,
    });
    for (const c of containers) {
      console.info("Removing: ", c.Id);
      try {
        await docker.getContainer(c.Id).remove({
          force: true,
        });
      } catch (error) {
        continue;
      }
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
  }
}

process.on("SIGINT", handle_signals);
process.on("SIGTERM", handle_signals);
