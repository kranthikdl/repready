import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

describe("TICKET-003: dead attached_assets directory removed", () => {
  it("attached_assets/ no longer exists in the repository tree", () => {
    expect(existsSync(resolve(repoRoot, "attached_assets"))).toBe(false);
  });
});
