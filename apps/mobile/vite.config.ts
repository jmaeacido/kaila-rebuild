import { defineConfig } from "vitest/config";

export default defineConfig({
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
  test: { environment: "node" },
});
