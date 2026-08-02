import type { ResolvedTheme } from "../app/theme";

export const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
export const MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";

export function mapStyleForTheme(resolved: ResolvedTheme): string {
  return resolved === "dark" ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
}
