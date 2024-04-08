import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parse } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import { Hono } from "hono";
import { logger } from "hono/logger";
import { WebSocketServer, WebSocket } from "ws";
import * as dockerode from "dockerode";

import { default as directoryTree } from "directory-tree";
import configs from "./configs.js";
import ComputerUnitService from "./computer_unit/computer_unit_service.js";
import DB from "./database.js";
import { nanoid } from "nanoid";
import ComputerUnit from "./computer_unit/computer_unit.js";

const __dirname = new URL("./assets/", import.meta.url).pathname;

let dockerConnection;
const WSDB = new Map();

function log() {
  console.info("API ==>", ...arguments);
}

log(__dirname)

try {
  log("Connecting to Docker Daemon");
  dockerConnection = new dockerode.default(configs.DOCKER_ENGINE_SOCKET);
  const infos = await dockerConnection.version();
  log("Docker Daemon Connection Info");
  console.info(infos);
} catch (error) {
  console.error(error);
  console.error("==> Cannot Connect to Docker Daemon!");
  console.error("==> Exiting...");
  process.exit(1);
}

const computeUnitService = new ComputerUnitService(dockerConnection);
const app = new Hono();

app.use("*", logger());

app.use("/assets/*", serveStatic({ root: './api' }));

app.get("/", async (c) => {
  const projectId = nanoid();
  return c.redirect(`/p/${projectId}`);
});

app.get("/p/:pid", async (c) => {
  const indexPath = new URL("./index.html", import.meta.url).pathname;
  try {
    const content = await fs.readFile(indexPath);
    return c.html(content, 200, {
      "X-Frame-Options": "SAMEORIGIN",
    });
  } catch (error) {
    console.error(error);
    return new Response("Error on Server", {
      status: 500,
    });
  }
});

app.post("/container/create/:pid", async (c) => {
  try {
    const projectId = c.req.param("pid");
    const cuJSON = DB.get(projectId);
    let computerUnit = new ComputerUnit(null, null, projectId);
    if (cuJSON) {
      computerUnit = computeUnitService.fromJSON(cuJSON);
    }
    computerUnit = await computeUnitService.getOrCreateComputerUnit(
      computerUnit
    );

    DB.set(computerUnit.containerId, computerUnit.toJSON());
    DB.set(computerUnit.projectId, computerUnit.toJSON());

    const containerCreateResponse = computerUnit.toJSON();
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
    const containerInfo = await dockerConnection.getContainer(cid).inspect();

    let computerUnit;
    const cuJSON = DB.get(containerInfo.Id);
    if (cuJSON) {
      computerUnit = computeUnitService.fromJSON(cuJSON);
    }
    const filepath = `${computerUnit.tempDirPath}/${filename}`;
    const content = await fs.readFile(filepath);

    const ws = WSDB.get(computerUnit.containerId);
    if (ws) {
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

const server = serve(
  {
    fetch: app.fetch,
    port: configs.PORT,
  },
  (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
  }
);

const apiWS = new WebSocketServer({ noServer: true });
const dockerWS = new WebSocketServer({ noServer: true });

server.on("upgrade", function upgrade(request, socket, head) {
  const { pathname } = parse(request.url);

  if (pathname.match("^/containers/(.*)$")) {
    dockerWS.handleUpgrade(request, socket, head, function done(ws) {
      dockerWS.emit("connection", ws, request);
    });
  } else if (pathname.match("^/vmws/(.*)$")) {
    apiWS.handleUpgrade(request, socket, head, function done(ws) {
      apiWS.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

apiWS.on("connection", apiWSConnection);

async function apiWSConnection(ws, req) {
  console.info(`WebSocket Connection opened: ${JSON.stringify(req.url)}`);

  const containerId = new URL(req.url, "http://localhost").searchParams.get(
    "cid"
  );

  let computerUnit;
  const cuJSON = DB.get(containerId);
  if (cuJSON) {
    computerUnit = computeUnitService.fromJSON(cuJSON);
  } else {
    return;
  }

  computerUnit.ws = ws;

  WSDB.set(computerUnit.containerId, ws);

  const tree = directoryTree(computerUnit.tempDirPath, {
    exclude: /\.npm|\.cache|env|\.node_repl_history/,
  });

  ws.send(
    JSON.stringify({
      type: "fs",
      params: tree,
    })
  );

  const containerInfo = await dockerConnection
    .getContainer(containerId)
    .inspect();
  log(containerInfo.NetworkSettings);
  const hostPort = containerInfo.NetworkSettings.Ports["8080/tcp"][0].HostPort;
  ws.send(
    JSON.stringify({
      type: "host-port",
      params: hostPort,
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
        const tempDirPath = computerUnit.tempDirPath;
        const path = `${tempDirPath}/${filename}`;
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
    log("Connecting to Docker Daemon");
    try {
      const container = dockerConnection.getContainer(containerId);
      log("Removing Docker ComputerUnit: ", containerId);
      await container.stop();
      // await container.remove()
    } catch (error) {
      if (error.reason === "no such container") return;
      console.error(error);
    }
  });
  ws.on("error", console.error);
}

dockerWS.on("connection", dockerWSConnection);

async function dockerWSConnection(clientToServerWS, req) {
  console.info(
    `WebSocket -> Server Connection opened: ${JSON.stringify(req.url)}`
  );

  const serverToDockerWS = new WebSocket(
    `ws+unix:///var/run/docker.sock:${req.url}`
  );
  serverToDockerWS.on("open", function () {
    console.info(`WebSocket -> Docker Connection Opened:`);
  });

  serverToDockerWS.on("message", async function message(message) {
    clientToServerWS.send(message);
  });

  serverToDockerWS.on("close", async function close() {
    console.info(`WebSocket -> Docker Connection closed:`);
  });
  serverToDockerWS.on("error", console.error);

  clientToServerWS.on("message", async function message(message) {
    if (serverToDockerWS.readyState === serverToDockerWS.OPEN) {
      serverToDockerWS.send(message);
    }
  });

  clientToServerWS.on("close", async function close() {
    console.info(`WebSocket -> Server Connection closed:`);
  });
  clientToServerWS.on("error", console.error);
}

async function handle_signals() {
  console.log("Ctrl-C was pressed");
  // computeUnitService && (await computeUnitService.removeComputerUnits());
  server.close();
  apiWS.close();
}

process.on("SIGINT", handle_signals);
process.on("SIGTERM", handle_signals);
