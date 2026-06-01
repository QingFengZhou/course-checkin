import { createServer } from "node:http";
import type { Socket } from "node:net";
import { WebSocket } from "ws";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || hostname}`);
    handle(req, res, parsedUrl);
  });

  // Initialize WebSocket server
  const { WebSocketServer } = require("ws");
  const wss = new WebSocketServer({ noServer: true });
  const { BroadcastManager } = require("./src/lib/ws-broadcast");

  // Heartbeat: ping every 30s, close connections that miss 3 pongs
  const HEARTBEAT_INTERVAL = 30000;
  const HEARTBEAT_TIMEOUT = 90000; // 3 missed pings

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if ((ws as any).__lastPong === undefined) {
        (ws as any).__lastPong = Date.now();
      }
      if (Date.now() - (ws as any).__lastPong > HEARTBEAT_TIMEOUT) {
        ws.terminate();
        return;
      }
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("connection", (ws: WebSocket) => {
    (ws as any).__lastPong = Date.now();
    BroadcastManager.handleConnection(ws);

    ws.on("message", (raw: Buffer) => {
      BroadcastManager.handleMessage(ws, raw.toString());
    });

    ws.on("pong", () => {
      (ws as any).__lastPong = Date.now();
    });

    ws.on("close", () => {
      BroadcastManager.handleDisconnect(ws);
    });

    ws.on("error", () => {
      BroadcastManager.handleDisconnect(ws);
    });
  });

  // Handle upgrade: route WebSocket upgrades to wss, let Next.js handle dev HMR
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || hostname}`);

    // Let Next.js dev HMR handle its own WS upgrades
    if (url.pathname.startsWith("/_next/webpack-hmr")) {
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, req);
    });
  });

  server.listen(port, hostname, () => {
    console.log(
      `> Server ready on http://${hostname}:${port} ${
        dev ? "(development + WS)" : "(production)"
      }`,
    );
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\n> Shutting down gracefully...");
    clearInterval(heartbeatInterval);
    wss.close(() => {
      server.close(() => {
        process.exit(0);
      });
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});
