import { describe, it, expect } from "vitest";

describe("smoke test", () => {
  it("verifies the test runner executes assertions", () => {
    expect(1 + 1).toBe(2);
  });

  it("supports async assertions", async () => {
    const value = await Promise.resolve("ok");
    expect(value).toBe("ok");
  });
});
