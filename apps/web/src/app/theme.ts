export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "kaila.theme";
export const themeEventName = "kaila:theme";

export type ThemeEventDetail = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
};

const THEME_META = {
  light: "#f7f9fc",
  dark: "#0c1524",
} as const;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
  } catch {
    // Private mode / blocked storage still receives the public light default.
  }
  return "light";
}

export function writeStoredThemePreference(preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Ignore quota / privacy errors; server sync still owns the account value.
  }
}

export function resolveTheme(preference: ThemePreference, systemDark?: boolean): ResolvedTheme {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  const dark = systemDark ?? (typeof window !== "undefined"
    && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return dark ? "dark" : "light";
}

function ensureThemeColorMeta(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = THEME_META[resolved];
}

async function applyNativeChrome(resolved: ResolvedTheme): Promise<void> {
  if (typeof window === "undefined") return;
  const capacitor = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: resolved === "dark" ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: THEME_META[resolved] });
  } catch {
    // Status bar plugin may be unavailable until a native sync ships it.
  }
}

export function applyThemeToDocument(preference: ThemePreference, resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  ensureThemeColorMeta(resolved);
  void applyNativeChrome(resolved);
  window.dispatchEvent(new CustomEvent<ThemeEventDetail>(themeEventName, {
    detail: { preference, resolved },
  }));
}

/** Inline bootstrap — keep in sync with resolveTheme / storage key. */
export const themeBootstrapScript = `(() => {
  try {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const stored = localStorage.getItem(key);
    const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = preference === "light" ? "light" : preference === "dark" ? "dark" : systemDark ? "dark" : "light";
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", resolved === "dark" ? ${JSON.stringify(THEME_META.dark)} : ${JSON.stringify(THEME_META.light)});
  } catch (_) {}
})();`;
