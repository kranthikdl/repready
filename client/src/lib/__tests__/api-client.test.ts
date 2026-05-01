import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet } from "../api-client";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiGet", () => {
  it("returns parsed JSON on a 2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, n: 7 }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiGet<{ ok: boolean; n: number }>("/api/thing");

    expect(data).toEqual({ ok: true, n: 7 });
    expect(fetchMock).toHaveBeenCalledWith("/api/thing", { credentials: "include" });
  });

  it("throws ApiError on a non-2xx response with the status and body text", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response("nope", { status: 500, statusText: "Internal Server Error" }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const err = await apiGet("/api/broken").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 500, body: "nope" });
  });

  it("propagates network errors thrown by fetch", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiGet("/api/offline")).rejects.toThrow("Failed to fetch");
  });

  it("falls back to statusText when an error response has an empty body", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response("", { status: 404, statusText: "Not Found" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const err = await apiGet("/api/missing").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 404, body: "Not Found" });
  });
});
