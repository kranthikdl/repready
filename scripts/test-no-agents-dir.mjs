#!/usr/bin/env node
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentsDir = resolve(repoRoot, ".agents");

const failures = [];

if (existsSync(agentsDir)) {
  failures.push(`.agents directory still exists at ${agentsDir}`);
}

try {
  const matches = execSync(
    "git grep -n '\\.agents' -- ':!.agents' ':!scripts/test-no-agents-dir.mjs' || true",
    { cwd: repoRoot, encoding: "utf8" }
  ).trim();
  if (matches.length > 0) {
    failures.push(`git grep returned references to .agents:\n${matches}`);
  }
} catch (err) {
  failures.push(`git grep failed: ${err.message}`);
}

if (failures.length > 0) {
  console.error("FAIL: TICKET-001 regression checks");
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}

console.log("PASS: .agents directory removed and no references remain");
