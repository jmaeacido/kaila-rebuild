import { z } from "zod";

const environmentSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  KAILA_API_ORIGIN: z.url(),
  REALTIME_TICKET_PUBLIC_KEY_PEM: z.string().min(1),
});

export const loadConfig = (environment: NodeJS.ProcessEnv) =>
  environmentSchema.parse(environment);
