import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useHealth } from "../useHealth";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useHealth", () => {
  it("starts in a loading state, then resolves to success with the parsed body", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ status: "ok", uptime: 42 })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useHealth(), { wrapper: makeWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ status: "ok", uptime: 42 });
    expect(fetchMock).toHaveBeenCalledWith("/api/health", { credentials: "include" });
  });

  it("resolves to an error state when the health endpoint returns a non-2xx", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response("down", { status: 503, statusText: "Service Unavailable" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useHealth(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
    expect((result.current.error as Error).message).toContain("503");
  });
});
