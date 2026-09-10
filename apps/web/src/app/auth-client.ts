export type ApiError = {
  error?: {
    message?: string;
    fields?: Record<string, string[]>;
  };
};

export type SignedInUser = {
  activeMode: "client" | "provider" | null;
  providerEligible: boolean;
};

export const SESSION_REQUEST_TIMEOUT_MS = 8_000;

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = SESSION_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  return fetch(input, { ...init, signal });
}

export function signedInHome(user: SignedInUser): string {
  void user;
  return "/home";
}

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
