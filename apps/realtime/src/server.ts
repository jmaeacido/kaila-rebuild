import { createServer } from "node:http";

import { importSPKI } from "jose";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";

import { loadConfig } from "./config.js";
import { authenticateConnectionTicket } from "./authenticate.js";
import { parseRealtimePublication } from "./publication.js";
import { structuredLog } from "./logger.js";

const config = loadConfig(process.env);
const publicKey = await importSPKI(
  config.REALTIME_TICKET_PUBLIC_KEY_PEM.replaceAll("\\n", "\n"),
  "EdDSA",
);
const redisPublisher = createClient({ url: config.REDIS_URL });
const redisSubscriber = redisPublisher.duplicate();
const deliverySubscriber = redisPublisher.duplicate();

for (const client of [redisPublisher, redisSubscriber, deliverySubscriber]) {
  client.on("error", (error) => {
    process.stderr.write(structuredLog("error", "redis.error", { error: error.message }) + "\n");
  });
}

await Promise.all([
  redisPublisher.connect(),
  redisSubscriber.connect(),
  deliverySubscriber.connect(),
]);

const consumeTicket = async (jti: string, expiresAt: number) => {
  const result = await redisPublisher.sendCommand([
    "SET",
    `kaila:realtime:ticket:${jti}`,
    "1",
    "NX",
    "EXAT",
    String(expiresAt),
  ]);

  return result?.toString() === "OK";
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
    origin: config.allowedOrigins,
    credentials: true,
  },
});
io.adapter(createAdapter(redisPublisher, redisSubscriber));

await deliverySubscriber.subscribe(config.OUTBOX_REALTIME_CHANNEL, (message) => {
  const publication = parseRealtimePublication(message);
  if (!publication) {
    process.stderr.write(structuredLog("warn", "realtime.publication_rejected") + "\n");
    return;
  }

  if ("recipientUserIds" in publication) {
    const rooms = publication.recipientUserIds.map((userId) => `user:${userId}`);
    let target = io.to(rooms[0]);
    for (const room of rooms.slice(1)) target = target.to(room);
    process.stdout.write(structuredLog("info", "realtime.event_published", {
      eventId: publication.event.eventId,
      eventType: publication.event.type,
      recipientCount: publication.recipientUserIds.length,
      broadcast: null,
      connectedSocketCount: io.sockets.sockets.size,
    }) + "\n");
    target.timeout(2_000).emit("domain.event", publication.event, (error: Error | null, responses: unknown[]) => {
      process.stdout.write(structuredLog(error ? "warn" : "info", "realtime.event_delivery", {
        eventId: publication.event.eventId,
        eventType: publication.event.type,
        recipientCount: publication.recipientUserIds.length,
        acknowledgementCount: responses?.length ?? 0,
        timedOut: Boolean(error),
      }) + "\n");
    });
    return;
  }

  const recipientCount = io.sockets.sockets.size;
  process.stdout.write(structuredLog("info", "realtime.event_published", {
    eventId: publication.event.eventId,
    eventType: publication.event.type,
    recipientCount,
    broadcast: publication.broadcast,
    connectedSocketCount: io.sockets.sockets.size,
  }) + "\n");
  io.to("broadcast:authenticated").timeout(2_000).emit("domain.event", publication.event, (error: Error | null, responses: unknown[]) => {
    process.stdout.write(structuredLog(error ? "warn" : "info", "realtime.event_delivery", {
      eventId: publication.event.eventId,
      eventType: publication.event.type,
      recipientCount,
      acknowledgementCount: responses?.length ?? 0,
      timedOut: Boolean(error),
    }) + "\n");
  });
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
  } catch (error) {
    process.stderr.write(structuredLog("warn", "realtime.authentication_rejected", {
      reason: error instanceof Error ? error.message : "UNKNOWN",
    }) + "\n");
    next(new Error("AUTHENTICATION_INVALID"));
  }
});

io.on("connection", async (socket) => {
  // Authorization context comes only from verified claims. Handshake payloads
  // and client events are never accepted as room identifiers.
  const userId = socket.data.userId as string;
  await socket.join(`user:${userId}`);
  await socket.join("broadcast:authenticated");
  process.stdout.write(
    structuredLog("info", "realtime.connected", { connectionId: socket.id, userId }) + "\n",
  );
  socket.on("disconnect", (reason) => {
    process.stdout.write(structuredLog("info", "realtime.disconnected", {
      connectionId: socket.id,
      userId,
      reason,
    }) + "\n");
  });
});

httpServer.listen(config.PORT, config.HOST, () => {
  process.stdout.write(
    structuredLog("info", "realtime.started", { host: config.HOST, port: config.PORT }) + "\n",
  );
});
