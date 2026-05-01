import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Force NODE_ENV=test so Vite resolves React's development build, which
// is required by @testing-library/react (act() throws in prod builds).
process.env.NODE_ENV = "test";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("test"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["client/src/**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    css: false,
  },
});
