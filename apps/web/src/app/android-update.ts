export type AndroidUpdateMetadata = {
  versionName: string;
  versionCode: number;
};

export type InstalledAppInfo = {
  version: string;
  build: string;
};

const SUPPRESS_PREFIX = "kaila.android-update.suppress.";
export const ANDROID_UPDATE_SUPPRESS_MS = 24 * 60 * 60 * 1000;

export function parseInstalledVersionCode(build: string | number | null | undefined): number | null {
  if (typeof build === "number" && Number.isFinite(build) && build > 0) {
    return Math.floor(build);
  }
  if (typeof build !== "string" || build.trim() === "") return null;
  const parsed = Number.parseInt(build, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function isAndroidUpdateAvailable(
  installed: InstalledAppInfo | null | undefined,
  latest: AndroidUpdateMetadata,
): boolean {
  const installedCode = parseInstalledVersionCode(installed?.build);
  if (installedCode === null) return false;
  return latest.versionCode > installedCode;
}

export function suppressStorageKey(latestVersionCode: number): string {
  return `${SUPPRESS_PREFIX}${latestVersionCode}`;
}

export function isAndroidUpdateSuppressed(
  latestVersionCode: number,
  nowMs: number = Date.now(),
  storage: Pick<Storage, "getItem"> | null = typeof localStorage === "undefined" ? null : localStorage,
): boolean {
  if (!storage) return false;
  const raw = storage.getItem(suppressStorageKey(latestVersionCode));
  if (!raw) return false;
  const until = Number.parseInt(raw, 10);
  if (!Number.isFinite(until)) return false;
  return until > nowMs;
}

export function suppressAndroidUpdate(
  latestVersionCode: number,
  nowMs: number = Date.now(),
  storage: Pick<Storage, "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage,
): void {
  storage?.setItem(suppressStorageKey(latestVersionCode), String(nowMs + ANDROID_UPDATE_SUPPRESS_MS));
}

export function clearAndroidUpdateSuppress(
  latestVersionCode: number,
  storage: Pick<Storage, "removeItem"> | null = typeof localStorage === "undefined" ? null : localStorage,
): void {
  storage?.removeItem(suppressStorageKey(latestVersionCode));
}
