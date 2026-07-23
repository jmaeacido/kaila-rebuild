export async function prepareCsrf(): Promise<string | undefined> {
  await fetch("/api/v1/auth/csrf", { credentials: "include" });
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
}

export type ApiError = {
  error?: {
    message?: string;
    fields?: Record<string, string[]>;
  };
};
