import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { api, type UploadLifecycleController } from "@/api/client";
import { useUploadStore } from "@/stores/upload";

interface UploadItemState {
  id: string;
  name: string;
  relativePath?: string;
  totalBytes: number;
  sentBytes: number;
  status: "pending" | "uploading" | "done" | "failed" | "aborted";
}

interface UploadStoreShape {
  totalBytes: number;
  sentBytes: number;
  items: UploadItemState[];
  speedBytesPerSecond: number;
  etaSeconds: number | null;
  abort: () => void;
}

function uploadControllerFromStore(): UploadLifecycleController {
  const uploadStore = useUploadStore();
  return {
    beginBatch: (items) => uploadStore.beginBatch(items),
    setAbortHandler: (handler) => uploadStore.setAbortHandler(handler),
    applyAggregateProgress: (sentBytes, totalBytes) => uploadStore.applyAggregateProgress(sentBytes, totalBytes),
    markBatchDone: () => uploadStore.markBatchDone(),
    markBatchAborted: () => uploadStore.markBatchAborted(),
    markFailedAt: (sentBytes) => uploadStore.markFailedAt(sentBytes),
    isAbortRequested: () => uploadStore.abortRequested,
    sentBytes: () => uploadStore.sentBytes,
  };
}

type UploadFilesPayload = Parameters<typeof api.uploadFiles>[0];

function uploadFilesWithStore(payload: Omit<UploadFilesPayload, "controller">): ReturnType<typeof api.uploadFiles> {
  return api.uploadFiles({
    ...payload,
    controller: uploadControllerFromStore(),
  });
}

class SuccessfulXMLHttpRequest {
  method = "";
  url = "";
  withCredentials = false;
  requestHeaders = new Map<string, string>();
  status = 201;
  responseText = JSON.stringify({
    items: [],
    summary: {
      createdCount: 1,
      replacedCount: 0,
      renamedCount: 0,
      skippedCount: 0,
    },
  });
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  upload = {
    onprogress: null as ((event: ProgressEvent<EventTarget>) => void) | null,
  };
  sentBody: FormData | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.requestHeaders.set(name, value);
  }

  send(body: Document | XMLHttpRequestBodyInit | null | undefined) {
    this.sentBody = body as FormData;
    this.upload.onprogress?.({
      lengthComputable: true,
      loaded: 4,
      total: 4,
    } as ProgressEvent<EventTarget>);
    this.onload?.();
  }
}

describe("api.uploadFiles", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
    document.cookie = "classdrive_csrf=; Max-Age=0; path=/";
  });

  it("keeps upload API independent from Pinia stores", () => {
    const clientSource = readFileSync("src/api/client.ts", "utf8");

    expect(clientSource).not.toContain('from "@/stores/upload"');
    expect(clientSource).not.toContain("useUploadStore");
  });

  it("uses resumable upload flow for a single file upload", async () => {
    document.cookie = "classdrive_csrf=upload-token; path=/";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          Location: "/api/files/upload/sessions/session-1",
        }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({
          "Upload-Offset": "11",
        }),
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        constructor() {
          throw new Error("multipart xhr should not be used");
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const progress: number[] = [];
    const result = await uploadFilesWithStore({
      space: "library",
      parentPath: "/",
      files: [{ file: new File(["hello world"], "hello.txt", { type: "text/plain" }) }],
      onProgress: (sent) => progress.push(sent),
    });

    const [, createInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(createInit.method).toBe("POST");
    expect(createInit.credentials).toBe("same-origin");
    expect(new Headers(createInit.headers).get("Tus-Resumable")).toBe("1.0.0");
    expect(new Headers(createInit.headers).get("Upload-Length")).toBe("11");
    expect(new Headers(createInit.headers).get("X-CSRF-Token")).toBe("upload-token");
    const [, patchInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(patchInit.method).toBe("PATCH");
    expect(patchInit.credentials).toBe("same-origin");
    expect(new Headers(patchInit.headers).get("Tus-Resumable")).toBe("1.0.0");
    expect(new Headers(patchInit.headers).get("Upload-Offset")).toBe("0");
    expect(new Headers(patchInit.headers).get("X-CSRF-Token")).toBe("upload-token");
    expect(progress).toContain(11);
    expect(result.summary.createdCount).toBe(1);

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;
    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "hello.txt",
        totalBytes: 11,
        sentBytes: 11,
        status: "done",
      }),
    ]);
  });

  it("keeps directory uploads on the multipart path", async () => {
    document.cookie = "classdrive_csrf=multipart-token; path=/";
    const xhrInstances: SuccessfulXMLHttpRequest[] = [];
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      class extends SuccessfulXMLHttpRequest {
        constructor() {
          super();
          xhrInstances.push(this);
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const guideFile = new File(["guide"], "guide.txt", { type: "text/plain" });

    const result = await uploadFilesWithStore({
      space: "library",
      parentPath: "/",
      conflictMode: "rename",
      files: [{ file: guideFile, relativePath: "目录包/guide.txt" }],
    });

    expect(xhrInstances).toHaveLength(1);
    expect(xhrInstances[0]?.url).toBe("/api/files/upload");
    expect(xhrInstances[0]?.method).toBe("POST");
    expect(xhrInstances[0]?.requestHeaders.get("X-CSRF-Token")).toBe("multipart-token");
    expect(xhrInstances[0]?.sentBody?.get("conflictMode")).toBe("rename");
    expect(xhrInstances[0]?.sentBody?.getAll("relativePaths")).toEqual(["目录包/guide.txt"]);
    expect(result.summary.createdCount).toBe(1);
  });

  it("maps multipart cumulative progress back to each file item", async () => {
    const xhrInstances: SuccessfulXMLHttpRequest[] = [];
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      class extends SuccessfulXMLHttpRequest {
        constructor() {
          super();
          xhrInstances.push(this);
        }

        override send(body: Document | XMLHttpRequestBodyInit | null | undefined) {
          this.sentBody = body as FormData;
          this.upload.onprogress?.({
            lengthComputable: true,
            loaded: 5,
            total: 10,
          } as ProgressEvent<EventTarget>);
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;
    const promise = uploadFilesWithStore({
      space: "library",
      parentPath: "/",
      files: [
        { file: new File(["1234"], "first.txt", { type: "text/plain" }) },
        { file: new File(["123456"], "second.txt", { type: "text/plain" }) },
      ],
    });

    expect(uploadStore.totalBytes).toBe(10);
    expect(uploadStore.sentBytes).toBe(5);
    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "first.txt",
        totalBytes: 4,
        sentBytes: 4,
        status: "done",
      }),
      expect.objectContaining({
        name: "second.txt",
        totalBytes: 6,
        sentBytes: 1,
        status: "uploading",
      }),
    ]);

    xhrInstances[0]?.onload?.();
    await expect(promise).resolves.toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          createdCount: 1,
        }),
      }),
    );
  });

  it("marks the active multipart file as failed when the request errors", async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      class extends SuccessfulXMLHttpRequest {
        override send(body: Document | XMLHttpRequestBodyInit | null | undefined) {
          this.sentBody = body as FormData;
          this.upload.onprogress?.({
            lengthComputable: true,
            loaded: 5,
            total: 10,
          } as ProgressEvent<EventTarget>);
          this.onerror?.();
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;

    await expect(
      uploadFilesWithStore({
        space: "library",
        parentPath: "/",
        files: [
          { file: new File(["1234"], "first.txt", { type: "text/plain" }) },
          { file: new File(["123456"], "second.txt", { type: "text/plain" }) },
        ],
      }),
    ).rejects.toThrow("上传失败");

    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "first.txt",
        status: "done",
      }),
      expect.objectContaining({
        name: "second.txt",
        status: "failed",
      }),
    ]);
  });

  it("marks the last multipart file as failed when the server rejects after all bytes were sent", async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      class extends SuccessfulXMLHttpRequest {
        status = 500;
        responseText = JSON.stringify({
          error: {
            message: "server rejected upload",
          },
        });

        override send(body: Document | XMLHttpRequestBodyInit | null | undefined) {
          this.sentBody = body as FormData;
          this.upload.onprogress?.({
            lengthComputable: true,
            loaded: 10,
            total: 10,
          } as ProgressEvent<EventTarget>);
          this.onload?.();
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;

    await expect(
      uploadFilesWithStore({
        space: "library",
        parentPath: "/",
        files: [
          { file: new File(["1234"], "first.txt", { type: "text/plain" }) },
          { file: new File(["123456"], "second.txt", { type: "text/plain" }) },
        ],
      }),
    ).rejects.toThrow("server rejected upload");

    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "first.txt",
        status: "done",
      }),
      expect.objectContaining({
        name: "second.txt",
        status: "failed",
      }),
    ]);
  });

  it("does not mark multipart uploads done when a 2xx response body cannot be parsed", async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      class extends SuccessfulXMLHttpRequest {
        status = 201;
        responseText = "{invalid-json";

        override send(body: Document | XMLHttpRequestBodyInit | null | undefined) {
          this.sentBody = body as FormData;
          this.upload.onprogress?.({
            lengthComputable: true,
            loaded: 10,
            total: 10,
          } as ProgressEvent<EventTarget>);
          this.onload?.();
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;

    await expect(
      uploadFilesWithStore({
        space: "library",
        parentPath: "/",
        files: [
          { file: new File(["1234"], "first.txt", { type: "text/plain" }) },
          { file: new File(["123456"], "second.txt", { type: "text/plain" }) },
        ],
      }),
    ).rejects.toThrow();

    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "first.txt",
        status: "done",
      }),
      expect.objectContaining({
        name: "second.txt",
        status: "failed",
      }),
    ]);
  });

  it("aborts the current multipart batch through the upload store", async () => {
    const xhrInstances: Array<SuccessfulXMLHttpRequest & { aborted: boolean }> = [];
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "XMLHttpRequest",
      class extends SuccessfulXMLHttpRequest {
        aborted = false;

        constructor() {
          super();
          xhrInstances.push(this);
        }

        override send(body: Document | XMLHttpRequestBodyInit | null | undefined) {
          this.sentBody = body as FormData;
          this.upload.onprogress?.({
            lengthComputable: true,
            loaded: 2,
            total: 10,
          } as ProgressEvent<EventTarget>);
        }

        abort() {
          this.aborted = true;
          this.onerror?.();
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;
    const promise = uploadFilesWithStore({
      space: "library",
      parentPath: "/",
      files: [
        { file: new File(["1234"], "first.txt", { type: "text/plain" }) },
        { file: new File(["123456"], "second.txt", { type: "text/plain" }) },
      ],
    });

    uploadStore.abort();

    await expect(promise).rejects.toThrow();
    expect(xhrInstances[0]?.aborted).toBe(true);
    expect(uploadStore.items.every((item) => item.status === "aborted" || item.status === "done")).toBe(true);
  });

  it("recovers the upload offset through HEAD after a PATCH conflict", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          Location: "/api/files/upload/sessions/session-2",
        }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        headers: new Headers(),
        json: async () => ({
          error: {
            code: "conflict",
            message: "offset conflict",
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          "Upload-Offset": "0",
        }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers({
          "Upload-Offset": "12",
        }),
        json: async () => ({}),
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        constructor() {
          throw new Error("multipart xhr should not be used");
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const result = await uploadFilesWithStore({
      space: "library",
      parentPath: "/",
      files: [{ file: new File(["hello world!"], "retry.txt", { type: "text/plain" }) }],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/files/upload/sessions/session-2",
      expect.objectContaining({
        method: "HEAD",
        headers: expect.objectContaining({
          "Tus-Resumable": "1.0.0",
        }),
      }),
    );
    expect(result.summary.createdCount).toBe(1);
  });

  it("marks a resumable upload aborted after abort() is called", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          Location: "/api/files/upload/sessions/session-abort",
        }),
        json: async () => ({}),
      })
      .mockImplementationOnce((_input: string, init?: RequestInit) => new Promise((_, reject) => {
        if (init?.signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        constructor() {
          throw new Error("multipart xhr should not be used");
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;
    const promise = uploadFilesWithStore({
      space: "library",
      parentPath: "/",
      files: [{ file: new File(["hello world"], "hello.txt", { type: "text/plain" }) }],
    });

    uploadStore.abort();

    await expect(promise).rejects.toThrow("上传已中止");
    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "hello.txt",
        status: "aborted",
      }),
    ]);
  });

  it("marks a resumable upload failed when a PATCH request returns a non-409 error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({
          Location: "/api/files/upload/sessions/session-fail",
        }),
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({
          error: {
            code: "server_error",
            message: "patch failed",
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        constructor() {
          throw new Error("multipart xhr should not be used");
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;

    await expect(
      uploadFilesWithStore({
        space: "library",
        parentPath: "/",
        files: [{ file: new File(["hello world"], "hello.txt", { type: "text/plain" }) }],
      }),
    ).rejects.toThrow("patch failed");

    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "hello.txt",
        status: "failed",
      }),
    ]);
  });

  it("does not mark resumable uploads done when session creation succeeds without a usable upload URL", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers(),
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal(
      "XMLHttpRequest",
      class {
        constructor() {
          throw new Error("multipart xhr should not be used");
        }
      } as unknown as typeof XMLHttpRequest,
    );

    const uploadStore = useUploadStore() as unknown as UploadStoreShape;

    await expect(
      uploadFilesWithStore({
        space: "library",
        parentPath: "/",
        files: [{ file: new File(["hello world"], "hello.txt", { type: "text/plain" }) }],
      }),
    ).rejects.toThrow("创建上传会话失败");

    expect(uploadStore.items).toEqual([
      expect.objectContaining({
        name: "hello.txt",
        status: "failed",
      }),
    ]);
  });
});
