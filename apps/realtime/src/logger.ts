const sensitiveKeys = new Set([
  "authorization",
  "password",
  "token",
  "ticket",
  "messageBody",
  "coordinates",
  "latitude",
  "longitude",
]);

export const redactLogContext = (
  context: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKeys.has(key)
        ? "[REDACTED]"
        : isRecord(value)
          ? redactLogContext(value)
          : value,
    ]),
  );

export const structuredLog = (
  level: "info" | "warn" | "error",
  message: string,
  context: Record<string, unknown> = {},
) =>
  JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redactLogContext(context),
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
