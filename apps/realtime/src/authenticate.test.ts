import { generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { beforeEach, describe, expect, it } from "vitest";

import { authenticateConnectionTicket } from "./authenticate.js";

describe("realtime connection ticket authentication", () => {
  const consumed = new Set<string>();
  const consume = (jti: string) => {
    if (consumed.has(jti)) return false;
    consumed.add(jti);
    return true;
  };

  beforeEach(() => consumed.clear());

  it("accepts valid identity claims and rejects replay", async () => {
    const { privateKey, publicKey } = await generateKeyPair("EdDSA");
    const ticket = await ticketFor(privateKey, "ticket-1");

    await expect(authenticateConnectionTicket(ticket, publicKey, consume)).resolves.toMatchObject({
      sub: "42",
      sessionId: "session-123",
    });
    await expect(authenticateConnectionTicket(ticket, publicKey, consume)).rejects.toThrow("TICKET_ALREADY_USED");
  });

  it("rejects forged and expired tickets", async () => {
    const trusted = await generateKeyPair("EdDSA");
    const attacker = await generateKeyPair("EdDSA");
    const forged = await ticketFor(attacker.privateKey, "forged");
    const expired = await ticketFor(trusted.privateKey, "expired", -10);

    await expect(authenticateConnectionTicket(forged, trusted.publicKey, consume)).rejects.toThrow();
    await expect(authenticateConnectionTicket(expired, trusted.publicKey, consume)).rejects.toThrow();
  });
});

const ticketFor = async (privateKey: CryptoKey, jti: string, lifetimeSeconds = 60) => {
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({ sessionId: "session-123" })
    .setProtectedHeader({ alg: "EdDSA", typ: "JWT" })
    .setSubject("42")
    .setAudience("kaila-realtime")
    .setIssuer("kaila-api")
    .setIssuedAt(now)
    .setExpirationTime(now + lifetimeSeconds)
    .setJti(jti)
    .sign(privateKey);
};
