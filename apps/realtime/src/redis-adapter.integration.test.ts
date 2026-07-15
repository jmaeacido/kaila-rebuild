import { createServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { io as createSocketClient } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6380";

describe("Socket.IO Redis multi-node coordination", () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  afterEach(async () => {
    await Promise.all(cleanup.splice(0).map((close) => close()));
  });

  it("delivers a server-owned room event across two nodes", async () => {
    const first = await createNode();
    const second = await createNode();
    first.io.on("connection", (socket) => void socket.join("user:42"));

    const client = createSocketClient(`http://127.0.0.1:${first.port}`, {
      transports: ["websocket"],
    });
    cleanup.push(() => {
      client.close();
    });
    await new Promise<void>((resolve) => client.once("connect", resolve));

    const received = new Promise<unknown>((resolve) => client.once("domain.event", resolve));
    second.io.to("user:42").emit("domain.event", { eventId: "cross-node-event" });

    await expect(received).resolves.toEqual({ eventId: "cross-node-event" });
  }, 15_000);

  const createNode = async () => {
    const publisher = createClient({ url: redisUrl });
    const subscriber = publisher.duplicate();
    await Promise.all([publisher.connect(), subscriber.connect()]);
    const httpServer = createServer();
    const io = new Server(httpServer);
    io.adapter(createAdapter(publisher, subscriber));
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port.");

    cleanup.push(async () => {
      await io.close();
      await Promise.all([publisher.quit(), subscriber.quit()]);
    });

    return { io, port: address.port };
  };
});
