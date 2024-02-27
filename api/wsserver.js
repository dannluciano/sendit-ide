import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { WebSocketServer, WebSocket } from "ws";

const app = new Hono();

app.use("*", logger());

const server = serve(
  {
    fetch: app.fetch,
    port: process.env["PORT"] || 7001,
  },
  (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
  },
);

const wss = new WebSocketServer({
  server,
});

wss.on("connection", connection);

async function connection(clientToServerWS, req) {
  console.info(
    `WebSocket -> Server Connection opened: ${JSON.stringify(req.url)}`,
  );

  const serverToDockerWS = new WebSocket(
    `ws+unix:///var/run/docker.sock:${req.url}`,
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
