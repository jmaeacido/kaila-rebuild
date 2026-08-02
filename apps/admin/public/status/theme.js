try {
  const stored = localStorage.getItem("kaila-admin-appearance");
  const preference = ["light", "dark", "system"].includes(stored)
    ? stored
    : "light";
  const resolved =
    preference === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.theme = resolved;
} catch {
  document.documentElement.dataset.theme = "light";
}
