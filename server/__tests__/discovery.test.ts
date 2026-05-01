import { describe, it, expect } from "vitest";

describe("server discovery probe", () => {
  it("is discovered by the root vitest config", () => {
    expect(true).toBe(true);
  });
});
