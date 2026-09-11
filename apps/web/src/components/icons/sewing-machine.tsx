import { createLucideIcon } from "lucide-react";

/** Lucide-style sewing machine for the Tailoring service category. */
export const SewingMachine = createLucideIcon("SewingMachine", [
  ["path", { d: "M2 20h16", key: "base" }],
  ["path", { d: "M4 20V11h9v9", key: "body" }],
  ["path", { d: "M13 11h7v5h-4", key: "arm" }],
  ["path", { d: "M16 16v5", key: "needle" }],
  ["circle", { cx: "17", cy: "6.5", r: "2.5", key: "spool" }],
  ["path", { d: "M17 9v2", key: "spool-stem" }],
  ["circle", { cx: "8.5", cy: "15.5", r: "2.5", key: "handwheel" }],
]);
