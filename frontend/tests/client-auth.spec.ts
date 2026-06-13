import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, setUnauthorizedHandler } from "@/api/client";

describe("api unauthorized handling", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
    document.cookie = "classdrive_csrf=; Max-Age=0; path=/";
  });

  it("notifies ordinary teacher API 401 responses so old logins can return to login", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "unauthorized",
          message: "未登录",
        },
      }),
    }));

    await expect(api.files(new URLSearchParams({ space: "library", path: "/" }))).rejects.toMatchObject({ status: 401 });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      input: "/api/files?space=library&path=%2F",
    }));
  });

  it("does not notify session restore 401 responses", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "unauthorized",
          message: "未登录",
        },
      }),
    }));

    await expect(api.studentSession()).rejects.toMatchObject({ status: 401 });

    expect(handler).not.toHaveBeenCalled();
  });

  it("adds the csrf token cookie to same-origin write requests", async () => {
    document.cookie = "classdrive_csrf=token-123; path=/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.logout();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("token-123");
  });

  it("does not add csrf headers to read requests", async () => {
    document.cookie = "classdrive_csrf=token-123; path=/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 1, username: "admin", displayName: "示例老师" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await api.session();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).has("X-CSRF-Token")).toBe(false);
  });
});
