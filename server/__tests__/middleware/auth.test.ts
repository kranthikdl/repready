import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "../../middleware/auth";

function makeRes() {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as unknown as Response["status"];
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as unknown as Response["json"];
  return res as Response & { statusCode?: number; body?: unknown };
}

describe("requireAuth middleware", () => {
  it("returns 401 when no session is present", () => {
    const req = {} as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when session has no user", () => {
    const req = { session: {} } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when an authenticated session exists", () => {
    const req = { session: { user: { id: "u1" } } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
