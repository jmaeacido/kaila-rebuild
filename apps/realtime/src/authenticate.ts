import { connectionTicketClaimsSchema } from "@kaila/contracts";
import { jwtVerify, type CryptoKey } from "jose";

type ConsumeTicket = (jti: string, expiresAt: number) => boolean | Promise<boolean>;

export const authenticateConnectionTicket = async (
  ticket: string,
  publicKey: CryptoKey,
  consume: ConsumeTicket,
) => {
  const result = await jwtVerify(ticket, publicKey, {
    algorithms: ["EdDSA"],
    audience: "kaila-realtime",
    issuer: "kaila-api",
  });
  const claims = connectionTicketClaimsSchema.parse(result.payload);

  if (!(await consume(claims.jti, claims.exp))) {
    throw new Error("TICKET_ALREADY_USED");
  }

  return claims;
};
