"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { prepareCsrf } from "./auth-client";
import {
  applyThemeToDocument,
  isThemePreference,
  readStoredThemePreference,
  resolveTheme,
  themeEventName,
  writeStoredThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => Promise<void>;
  syncStatus: "idle" | "saving" | "error";
  applyAccountTheme: (appearanceTheme: string | null | undefined) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider.");
  return value;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredThemePreference());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredThemePreference()));
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "error">("idle");
  const [authenticated, setAuthenticated] = useState(false);

  const commit = useCallback((next: ThemePreference) => {
    const nextResolved = resolveTheme(next);
    setPreferenceState(next);
    setResolved(nextResolved);
    writeStoredThemePreference(next);
    applyThemeToDocument(next, nextResolved);
  }, []);

  useEffect(() => {
    applyThemeToDocument(preference, resolved);
  }, [preference, resolved]);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => commit("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [commit, preference]);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/auth/session-status", {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!active || !response.ok) return;
        const body = (await response.json()) as { data?: { authenticated?: boolean } };
        const isAuthed = body.data?.authenticated === true;
        setAuthenticated(isAuthed);
        if (!isAuthed) return;
        const me = await fetch("/api/v1/me", {
          credentials: "include",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!active || !me.ok) return;
        const user = (await me.json()) as { data?: { appearanceTheme?: string } };
        if (isThemePreference(user.data?.appearanceTheme)) {
          commit(user.data.appearanceTheme);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [commit]);

  const applyAccountTheme = useCallback((appearanceTheme: string | null | undefined) => {
    if (!isThemePreference(appearanceTheme)) return;
    setAuthenticated(true);
    commit(appearanceTheme);
  }, [commit]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    commit(next);
    if (!authenticated) {
      // Guests stay device-local until login; AuthGuard /me reconcile uses server.
      const status = await fetch("/api/v1/auth/session-status", {
        credentials: "include",
        headers: { Accept: "application/json" },
      }).catch(() => null);
      if (!status?.ok) return;
      const body = (await status.json()) as { data?: { authenticated?: boolean } };
      if (body.data?.authenticated !== true) return;
      setAuthenticated(true);
    }
    setSyncStatus("saving");
    try {
      const token = await prepareCsrf();
      const response = await fetch("/api/v1/me/appearance", {
        method: "PUT",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { "X-XSRF-TOKEN": token } : {}),
        },
        body: JSON.stringify({ appearanceTheme: next }),
      });
      if (!response.ok) throw new Error("Failed to save appearance.");
      setSyncStatus("idle");
    } catch {
      setSyncStatus("error");
    }
  }, [authenticated, commit]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, syncStatus, applyAccountTheme }),
    [applyAccountTheme, preference, resolved, setPreference, syncStatus],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { themeEventName };
