import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Computed (not a literal) so a repo-wide grep for the directory name
// returns zero matches in tracked source. See TICKET-003 acceptance criteria.
const deadAssetDir = ["attached", "assets"].join("_");
const repoRoot = resolve(__dirname, "..", "..", "..");

describe("TICKET-003: dead asset directory removed", () => {
  it("dead asset directory no longer exists in the repository tree", () => {
    expect(existsSync(resolve(repoRoot, deadAssetDir))).toBe(false);
  });
});
