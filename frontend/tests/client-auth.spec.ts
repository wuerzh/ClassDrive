import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, setUnauthorizedHandler } from "@/api/client";

describe("api unauthorized handling", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
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
});
