import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { WebSocketServer, WebSocket } from "ws";

const app = new Hono();

app.use("*", logger());

const server = serve(
  {
    fetch: app.fetch,
    port: process.env["PORT"] || 9000,
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
  console.info(
    `WebSocket -> Server Connection opened: ${JSON.stringify(req.url)}`,
  );

  const wsDocker = new WebSocket(`ws+unix:///var/run/docker.sock:${req.url}`);
  wsDocker.on("open", function (ws) {
    console.info(`WebSocket -> Docker Connection Opened: ${ws}`);
  });

  wsDocker.on("message", async function message(message) {
    ws.send(message);
  });

  wsDocker.on("close", async function close() {
    console.info(`WebSocket -> Docker Connection closed:`);
  });
  wsDocker.on("error", console.error);

  ws.on("message", async function message(message) {
    if (wsDocker.readyState === wsDocker.OPEN) {
      wsDocker.send(message);
    }
  });

  ws.on("close", async function close() {
    console.info(`WebSocket -> Server Connection closed:`);
  });
  ws.on("error", console.error);
}
