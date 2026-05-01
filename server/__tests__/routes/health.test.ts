import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";

function createApp() {
  const app = express();
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  return app;
}

describe("GET /api/health", () => {
  it("returns 200 with the expected body shape", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("responds with JSON content type", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });
});
