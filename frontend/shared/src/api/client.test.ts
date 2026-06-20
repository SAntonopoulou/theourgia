import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClient } from "./client.js";
import { ApiError, NetworkError, NotFoundError, UnauthorizedError } from "./errors.js";

type FetchMock = ReturnType<typeof vi.fn>;

describe("ApiClient", () => {
  let originalFetch: typeof globalThis.fetch;
  let fetchMock: FetchMock;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as never;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function jsonResponse(status: number, body: unknown, statusText = "OK"): Response {
    return new Response(JSON.stringify(body), {
      status,
      statusText,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("returns parsed JSON on 2xx", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { hello: "world" }));
    const client = new ApiClient({ baseUrl: "https://api.test", mock: false });
    const result = await client.request<{ hello: string }>("/x");
    expect(result).toEqual({ hello: "world" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/x", expect.any(Object));
  });

  it("returns null on 204", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new ApiClient({ baseUrl: "", mock: false });
    expect(await client.request("/x")).toBeNull();
  });

  it("sends Authorization: Bearer when authToken is set", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const client = new ApiClient({ baseUrl: "", mock: false, authToken: "abc" });
    await client.request("/x");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer abc");
  });

  it("withAuthToken returns a fresh client (immutable)", () => {
    const a = new ApiClient({ baseUrl: "x", mock: false, authToken: null });
    const b = a.withAuthToken("token");
    expect(a).not.toBe(b);
  });

  it("serialises json body + sets Content-Type", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const client = new ApiClient({ baseUrl: "", mock: false });
    await client.request("/x", { method: "POST", json: { a: 1 } });
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    expect((init.headers as Headers).get("Content-Type")).toBe("application/json");
  });

  it("401 → UnauthorizedError carrying the Problem", async () => {
    const problem = {
      type: "about:blank",
      title: "Unauthorized",
      status: 401,
      detail: "Missing session",
    };
    fetchMock.mockResolvedValue(jsonResponse(401, problem, "Unauthorized"));
    const client = new ApiClient({ baseUrl: "", mock: false });
    let caught: unknown;
    try {
      await client.request("/x");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(UnauthorizedError);
    expect((caught as UnauthorizedError).problem.detail).toBe("Missing session");
  });

  it("404 → NotFoundError", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { type: "about:blank", title: "Not Found", status: 404 }),
    );
    const client = new ApiClient({ baseUrl: "", mock: false });
    await expect(client.request("/x")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("5xx → ApiError carrying status + problem", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, { type: "about:blank", title: "Service Unavailable", status: 503 }),
    );
    const client = new ApiClient({ baseUrl: "", mock: false });
    try {
      await client.request("/x");
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(503);
    }
  });

  it("fetch rejection becomes NetworkError", async () => {
    fetchMock.mockRejectedValueOnce(new Error("dns failed"));
    const client = new ApiClient({ baseUrl: "", mock: false });
    await expect(client.request("/x")).rejects.toBeInstanceOf(NetworkError);
  });

  it("AbortSignal cancellation surfaces as NetworkError", async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    );
    const controller = new AbortController();
    const client = new ApiClient({ baseUrl: "", mock: false });
    const promise = client.request("/x", { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(NetworkError);
  });

  describe("mock mode", () => {
    it("requires fixtureFor when mock=true", () => {
      expect(() => new ApiClient({ baseUrl: "", mock: true })).toThrow();
    });

    it("never calls fetch when mocking", async () => {
      const client = new ApiClient({
        baseUrl: "",
        mock: true,
        fixtureFor: () => ({ from: "fixture" }),
      });
      const result = await client.request<{ from: string }>("/x");
      expect(result).toEqual({ from: "fixture" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("throws when the fixture returns an Error instance", async () => {
      const client = new ApiClient({
        baseUrl: "",
        mock: true,
        fixtureFor: () => new NotFoundError({ type: "about:blank", title: "x", status: 404 }),
      });
      await expect(client.request("/missing")).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
