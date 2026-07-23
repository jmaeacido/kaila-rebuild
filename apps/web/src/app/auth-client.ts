export type ApiError = {
  error?: {
    message?: string;
    fields?: Record<string, string[]>;
  };
};

export function csrfToken(): string | undefined {
  const value = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : undefined;
}

export async function prepareCsrf(): Promise<string | undefined> {
  await fetch("/api/v1/auth/csrf", { credentials: "include" });
  return csrfToken();
}

export function safeDestination(value: string | null, fallback = "/"): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
