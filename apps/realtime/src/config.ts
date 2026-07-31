import { z } from "zod";

const environmentSchema = z.object({
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  KAILA_API_ORIGIN: z.url(),
  KAILA_ALLOWED_ORIGINS: z.string().optional(),
  REALTIME_TICKET_PUBLIC_KEY_PEM: z.string().min(1),
  REDIS_URL: z.url(),
  OUTBOX_REALTIME_CHANNEL: z.string().min(1).default("kaila:realtime:events"),
});

export const loadConfig = (environment: NodeJS.ProcessEnv) => {
  const config = environmentSchema.parse(environment);
  const allowedOrigins = (
    config.KAILA_ALLOWED_ORIGINS ?? config.KAILA_API_ORIGIN
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (
    allowedOrigins.length === 0 ||
    allowedOrigins.some((origin) => !z.url().safeParse(origin).success)
  ) {
    throw new Error("KAILA_ALLOWED_ORIGINS must contain valid comma-separated URLs.");
  }

  return { ...config, allowedOrigins };
};
