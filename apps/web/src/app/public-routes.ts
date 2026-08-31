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
  "/community",
]);

const COMMUNITY_POST_PATH =
  /^\/community\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizePublicPath(pathname: string | null | undefined): string {
  if (!pathname) return "/";
  const base = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (base === "/") return "/";
  return base.replace(/\/+$/, "") || "/";
}

export function isPublicCommunityPostPath(pathname: string): boolean {
  return COMMUNITY_POST_PATH.test(pathname);
}

export function isPublicPath(pathname: string | null | undefined): boolean {
  const normalized = normalizePublicPath(pathname);
  if (PUBLIC_PATHS.has(normalized)) return true;
  if (isPublicCommunityPostPath(normalized)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
