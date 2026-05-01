import { describe, it, expect } from "vitest";
import * as schema from "@shared/schema";

describe("path alias resolution", () => {
  it("resolves @shared/* via vitest.config alias", () => {
    expect(schema).toBeDefined();
    expect(typeof schema).toBe("object");
  });
});
