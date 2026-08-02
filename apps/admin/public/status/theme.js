try {
  const stored = localStorage.getItem("kaila-admin-appearance");
  const preference = ["light", "dark", "system"].includes(stored)
    ? stored
    : "system";
  const resolved =
    preference === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.theme = resolved;
} catch {
  document.documentElement.dataset.theme = matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
}
