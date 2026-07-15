import { createServer } from "node:http";

import { importSPKI } from "jose";
import { Server } from "socket.io";

import { loadConfig } from "./config.js";
import { authenticateConnectionTicket } from "./authenticate.js";

const config = loadConfig(process.env);
const publicKey = await importSPKI(
  config.REALTIME_TICKET_PUBLIC_KEY_PEM.replaceAll("\\n", "\n"),
  "EdDSA",
);
const consumedTickets = new Set<string>();

const consumeTicket = (jti: string, expiresAt: number) => {
  if (consumedTickets.has(jti)) {
    return false;
  }

  consumedTickets.add(jti);
  const remainingLifetime = Math.max(0, expiresAt * 1000 - Date.now());
  setTimeout(() => consumedTickets.delete(jti), remainingLifetime).unref();
  return true;
};

const httpServer = createServer((request, response) => {
  if (request.url === "/health" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", service: "realtime" }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: { code: "NOT_FOUND" } }));
});

const io = new Server(httpServer, {
  cors: {
    origin: config.KAILA_API_ORIGIN,
    credentials: true,
  },
});

io.use(async (socket, next) => {
  const ticket = socket.handshake.auth.ticket;

  if (typeof ticket !== "string") {
    next(new Error("AUTHENTICATION_REQUIRED"));
    return;
  }

  try {
    const claims = await authenticateConnectionTicket(ticket, publicKey, consumeTicket);

    socket.data.userId = claims.sub;
    socket.data.sessionId = claims.sessionId;
    next();
  } catch {
    next(new Error("AUTHENTICATION_INVALID"));
  }
});

io.on("connection", (socket) => {
  // Authorization context comes only from verified claims. Handshake payloads
  // and client events are never accepted as room identifiers.
  void socket.join(`user:${socket.data.userId as string}`);
});

httpServer.listen(config.PORT, config.HOST, () => {
  process.stdout.write(
    JSON.stringify({
      level: "info",
      message: "realtime.started",
      host: config.HOST,
      port: config.PORT,
    }) + "\n",
  );
});
