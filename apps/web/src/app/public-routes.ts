/** Routes reachable without an authenticated session. Keep in sync across guards. */
export const PUBLIC_PATH_PREFIXES = [
  "/status/",
] as const;

export const PUBLIC_PATHS = new Set([
  "/",
  "/download",
  "/forgot-password",
  "/login",
  "/privacy",
  "/register",
  "/reset-password",
  "/terms",
  "/account-deletion",
  "/maintenance",
  "/faqs",
]);

export function normalizePublicPath(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base === "/") return "/";
  return base.replace(/\/+$/, "") || "/";
}

export function isPublicPath(pathname: string | null | undefined): boolean {
  const normalized = normalizePublicPath(pathname);
  if (PUBLIC_PATHS.has(normalized)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
