import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";
import { io as createSocketClient } from "socket.io-client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

let redisUrl = process.env.REDIS_URL;
let redisProcess: ChildProcess | undefined;
let redisDirectory: string | undefined;

describe("Socket.IO Redis multi-node coordination", () => {
  const cleanup: Array<() => Promise<void> | void> = [];

  beforeAll(async () => {
    if (redisUrl) return;
    const port = await availablePort();
    redisDirectory = await mkdtemp(join(tmpdir(), "kaila-redis-test-"));
    redisProcess = spawn("redis-server", [
      "--bind", "127.0.0.1",
      "--port", String(port),
      "--save", "",
      "--appendonly", "no",
      "--dir", redisDirectory,
    ], { stdio: "ignore" });
    redisUrl = `redis://127.0.0.1:${port}`;
    await waitForRedis(redisUrl);
  });

  afterEach(async () => {
    await Promise.all(cleanup.splice(0).map((close) => close()));
  });

  afterAll(async () => {
    redisProcess?.kill("SIGTERM");
    if (redisProcess) await new Promise<void>((resolve) => redisProcess?.once("exit", () => resolve()));
    if (redisDirectory) await rm(redisDirectory, { recursive: true, force: true });
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
    const publisher = createClient({ url: redisUrl! });
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

async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a Redis test port.");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function waitForRedis(url: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const client = createClient({ url });
    client.on("error", () => undefined);
    try {
      await client.connect();
      await client.quit();
      return;
    } catch {
      client.destroy();
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error("The isolated Redis test server did not start.");
}
