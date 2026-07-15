import { createServer } from "node:http";

import { connectionTicketClaimsSchema } from "@kaila/contracts";
import { importSPKI, jwtVerify } from "jose";
import { Server } from "socket.io";

import { loadConfig } from "./config.js";

const config = loadConfig(process.env);
const publicKey = await importSPKI(
  config.REALTIME_TICKET_PUBLIC_KEY_PEM.replaceAll("\\n", "\n"),
  "EdDSA",
);

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
    const result = await jwtVerify(ticket, publicKey, {
      algorithms: ["EdDSA"],
      audience: "kaila-realtime",
      issuer: "kaila-api",
    });
    const claims = connectionTicketClaimsSchema.parse(result.payload);

    socket.data.userId = claims.sub;
    socket.data.sessionId = claims.sessionId;
    next();
  } catch {
    next(new Error("AUTHENTICATION_INVALID"));
  }
});

io.on("connection", (socket) => {
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
