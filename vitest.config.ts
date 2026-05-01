import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "client/**/*.test.{ts,tsx}",
      "server/**/*.test.{ts,tsx}",
      "shared/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist", "build", ".agents", "attached_assets"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["client/**/*.{ts,tsx}", "server/**/*.ts", "shared/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/__tests__/**",
        "node_modules",
        "dist",
        "build",
      ],
    },
  },
});
