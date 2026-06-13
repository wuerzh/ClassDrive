import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, flushPromises, enableAutoUnmount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FilesView from "@/views/FilesView.vue";
import { computed } from "vue";
import { createRouter, createMemoryHistory, matchedRouteKey } from "vue-router";
import { api } from "@/api/client";

enableAutoUnmount(afterEach);

function okJson(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function isFilesRequest(input: string, expected: Record<string, string>): boolean {
  if (!input.startsWith("/api/files?")) {
    return false;
  }
  const searchParams = new URL(input, "http://localhost").searchParams;
  return Object.entries(expected).every(([key, value]) => searchParams.get(key) === value);
}

function isLibraryFilesRequest(input: string): boolean {
  return isFilesRequest(input, { space: "library" });
}

function isClassFilesRequest(input: string, classId: number): boolean {
  return isFilesRequest(input, { space: "class", classId: String(classId) });
}

describe("FilesView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders file entries for library space", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 10,
            name: "教学安排.txt",
            path: "/教学安排.txt",
            kind: "file",
            size: 18,
            downloadUrl: "/api/files/10/download",
            previewUrl: "/api/files/10/preview"
          }
        ]
      }),
    }));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="files-workspace"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="files-workspace"]').find('[data-testid="files-grid"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="files-view-grid"]').classes()).toContain("button--primary");
    expect(wrapper.text()).toContain("教学安排.txt");
  });

  it("passes the selected conflict mode into file upload requests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [],
      }),
    ));
    const uploadSpy = vi.spyOn(api, "uploadFiles").mockResolvedValue({
      items: [],
      summary: {
        createdCount: 1,
        replacedCount: 0,
        renamedCount: 0,
        skippedCount: 0,
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="upload-material-open"]').trigger("click");
    await wrapper.get('[data-testid="upload-conflict-mode"]').setValue("rename");

    const input = wrapper.get('[data-testid="upload-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["body"], "重名文件.txt", { type: "text/plain" })],
    });

    await wrapper.get('[data-testid="upload-input"]').trigger("change");
    await flushPromises();

    expect(uploadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictMode: "rename",
      }),
    );
    const payload = uploadSpy.mock.calls[0]?.[0];
    expect(payload?.files).toHaveLength(1);
    expect(payload?.files[0]?.file.name).toBe("重名文件.txt");
    expect(payload?.files[0]?.relativePath).toBeUndefined();
  });

  it("uploads directory entries with preserved relative paths", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [],
      }),
    ));
    const uploadSpy = vi.spyOn(api, "uploadFiles").mockResolvedValue({
      items: [],
      summary: {
        createdCount: 2,
        replacedCount: 0,
        renamedCount: 0,
        skippedCount: 0,
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="upload-material-open"]').trigger("click");
    await wrapper.get('[data-testid="upload-conflict-mode"]').setValue("replace");

    const firstFile = new File(["guide"], "guide.txt", { type: "text/plain" });
    Object.defineProperty(firstFile, "webkitRelativePath", {
      configurable: true,
      value: "目录包/guide.txt",
    });
    const secondFile = new File(["answer"], "answer.txt", { type: "text/plain" });
    Object.defineProperty(secondFile, "webkitRelativePath", {
      configurable: true,
      value: "目录包/作业/answer.txt",
    });
    const archiveFile = new File(["archive"], "作业.rar", { type: "application/x-rar-compressed" });
    Object.defineProperty(archiveFile, "webkitRelativePath", {
      configurable: true,
      value: "目录包/作业.rar",
    });

    const input = wrapper.get('[data-testid="upload-directory-input"]').element as HTMLInputElement;
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [firstFile, archiveFile, secondFile],
    });

    await wrapper.get('[data-testid="upload-directory-input"]').trigger("change");
    await flushPromises();

    expect(uploadSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        conflictMode: "replace",
      }),
    );
    const payload = uploadSpy.mock.calls[0]?.[0];
    expect(payload?.files).toEqual([
      { file: firstFile, relativePath: "目录包/guide.txt" },
      { file: archiveFile, relativePath: "目录包/作业.rar" },
      { file: secondFile, relativePath: "目录包/作业/answer.txt" },
    ]);
  });

  it("uploads dropped directory entries through the common upload flow", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [],
      }),
    ));
    const uploadSpy = vi.spyOn(api, "uploadFiles").mockResolvedValue({
      items: [],
      summary: {
        createdCount: 2,
        replacedCount: 0,
        renamedCount: 0,
        skippedCount: 0,
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    const guideFile = new File(["guide"], "guide.txt", { type: "text/plain" });
    const answerFile = new File(["answer"], "answer.txt", { type: "text/plain" });
    const dataTransfer = {
      items: [
        {
          webkitGetAsEntry: () => ({
            isFile: false,
            isDirectory: true,
            name: "目录包",
            createReader: () => {
              let done = false;
              return {
                readEntries(callback: (entries: unknown[]) => void) {
                  if (done) {
                    callback([]);
                    return;
                  }
                  done = true;
                  callback([
                    {
                      isFile: true,
                      isDirectory: false,
                      name: "guide.txt",
                      file(fileCallback: (file: File) => void) {
                        fileCallback(guideFile);
                      },
                    },
                    {
                      isFile: false,
                      isDirectory: true,
                      name: "作业",
                      createReader: () => {
                        let nestedDone = false;
                        return {
                          readEntries(callback: (entries: unknown[]) => void) {
                            if (nestedDone) {
                              callback([]);
                              return;
                            }
                            nestedDone = true;
                            callback([
                              {
                                isFile: true,
                                isDirectory: false,
                                name: "answer.txt",
                                file(fileCallback: (file: File) => void) {
                                  fileCallback(answerFile);
                                },
                              },
                            ]);
                          },
                        };
                      },
                    },
                  ]);
                },
              };
            },
          }),
        },
      ],
      files: [],
    };

    await wrapper.get('[data-testid="files-dropzone"]').trigger("drop", { dataTransfer });
    await flushPromises();

    const payload = uploadSpy.mock.calls[0]?.[0];
    expect(payload?.files).toEqual([
      { file: guideFile, relativePath: "目录包/guide.txt" },
      { file: answerFile, relativePath: "目录包/作业/answer.txt" },
    ]);
  });

  it("uploads files dropped on the browser window while the files view is mounted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [],
      }),
    ));
    const uploadSpy = vi.spyOn(api, "uploadFiles").mockResolvedValue({
      items: [],
      summary: {
        createdCount: 1,
        replacedCount: 0,
        renamedCount: 0,
        skippedCount: 0,
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    const droppedFile = new File(["lesson"], "课堂示例.txt", { type: "text/plain" });
    const dataTransfer = {
      items: [],
      files: [droppedFile],
    } as unknown as DataTransfer;
    const dropEvent = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(dropEvent, "dataTransfer", {
      configurable: true,
      value: dataTransfer,
    });

    window.dispatchEvent(dropEvent);
    await flushPromises();

    expect(dropEvent.defaultPrevented).toBe(true);
    expect(uploadSpy).toHaveBeenCalledWith(expect.objectContaining({
      files: [{ file: droppedFile }],
    }));
  });

  it("loads class files without placing the class selector inside the files workspace", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" }
          ]
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          space: "class",
          classId: 1,
          currentPath: "/",
          items: []
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/classes/:classId", component: FilesView }],
    });
    await router.push("/files/classes/1");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="files-class-select"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="files-context-bar"]').html()).toContain('data-testid="breadcrumb-root"');
    expect(fetchMock).toHaveBeenCalledWith("/api/files?space=class&classId=1&page=1&pageSize=50", expect.any(Object));
  });

  it("keeps the files context bar aligned with other file pages and defaults invalid class routes to the first class", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          classes: [
            { id: 1, name: "24家具1班" },
            { id: 2, name: "24家具2班" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          space: "class",
          classId: 1,
          currentPath: "/",
          items: [],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/classes/:classId", component: FilesView }],
    });
    await router.push("/files/classes/999");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="files-class-select"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="files-context-bar"]').html()).toContain('data-testid="breadcrumb-root"');
    expect(router.currentRoute.value.fullPath).toBe("/files/classes/1");
    expect(fetchMock).toHaveBeenCalledWith("/api/files?space=class&classId=1&page=1&pageSize=50", expect.any(Object));
  });

  it("keeps class files page mounted when an empty class returns null items", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(
        okJson({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "class",
          classId: 2,
          currentPath: "/",
          items: null,
        })
      ));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/classes/:classId", component: FilesView }],
    });
    await router.push("/files/classes/2");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="files-class-select"]').exists()).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe("/files/classes/2");
    expect(wrapper.text()).toContain("当前目录暂无文件。");
  });

  it("enters a directory when directory name is clicked", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 11,
              name: "课程资料",
              path: "/课程资料",
              kind: "dir",
              size: 1536,
              downloadUrl: "",
              archiveUrl: "/api/files/11/archive",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/课程资料",
          items: [],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();
    expect(wrapper.get('[data-testid="files-grid"]').text()).toContain("1.5 KB");
    expect(wrapper.get('[data-testid="download-entry-11"]').text()).toContain("下载压缩包");
    await wrapper.get('[data-testid="entry-open-11"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.path).toBe("/课程资料");
  });

  it("opens entries from teacher file rows while keeping row actions scoped", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/files?")) {
        const searchParams = new URL(input, "http://localhost").searchParams;
        const path = searchParams.get("path") ?? "/";
        if (path === "/课程资料") {
          return okJson({
            space: "library",
            currentPath: "/课程资料",
            items: [],
          });
        }
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 21,
              name: "课程资料",
              path: "/课程资料",
              kind: "dir",
              size: 1536,
              downloadUrl: "",
              archiveUrl: "/api/files/21/archive",
              previewUrl: "",
              updatedAt: "2026-05-01T08:10:00.000Z",
            },
            {
              id: 22,
              name: "教学安排.txt",
              path: "/教学安排.txt",
              kind: "file",
              size: 18,
              mimeType: "text/plain",
              downloadUrl: "/api/files/22/download",
              archiveUrl: "",
              previewUrl: "/api/files/22/preview",
              updatedAt: "2026-05-01T08:20:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/22/preview") {
        return {
          ok: true,
          status: 200,
          text: async () => "教学安排正文",
        };
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    const rowDownload = wrapper.get('[data-testid="download-entry-21"]');
    rowDownload.element.addEventListener("click", (event) => event.preventDefault());
    await rowDownload.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBeUndefined();

    await wrapper.get('[data-testid="select-entry-21"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBeUndefined();

    await wrapper.get('[data-testid="entry-updated-22"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("教学安排.txt");
    expect(wrapper.get('[data-testid="file-preview-text"]').text()).toContain("教学安排正文");

    await wrapper.get('[data-testid="file-preview-close"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="entry-updated-21"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.path).toBe("/课程资料");
  });

  it("opens entries from teacher file cards while keeping card actions scoped", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/files?")) {
        const searchParams = new URL(input, "http://localhost").searchParams;
        const path = searchParams.get("path") ?? "/";
        if (path === "/课程资料") {
          return okJson({
            space: "library",
            currentPath: "/课程资料",
            items: [],
          });
        }
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 31,
              name: "课程资料",
              path: "/课程资料",
              kind: "dir",
              size: 1536,
              downloadUrl: "",
              archiveUrl: "/api/files/31/archive",
              previewUrl: "",
              updatedAt: "2026-05-01T08:10:00.000Z",
            },
            {
              id: 32,
              name: "教学安排.txt",
              path: "/教学安排.txt",
              kind: "file",
              size: 18,
              mimeType: "text/plain",
              downloadUrl: "/api/files/32/download",
              archiveUrl: "",
              previewUrl: "/api/files/32/preview",
              updatedAt: "2026-05-01T08:20:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/32/preview") {
        return {
          ok: true,
          status: 200,
          text: async () => "教学安排正文",
        };
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=grid");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();

    const cardDownload = wrapper.get('[data-testid="download-entry-31"]');
    cardDownload.element.addEventListener("click", (event) => event.preventDefault());
    await cardDownload.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBeUndefined();

    await wrapper.get('[data-testid="card-more-actions-32"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="file-preview-dialog"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="card-secondary-actions-32"]').attributes("style") ?? "").not.toContain("display: none");

    const cards = wrapper.findAll(".files-grid__card");
    const fileCard = cards.find((card) => card.text().includes("教学安排.txt"));
    if (!fileCard) {
      throw new Error("missing teacher file card");
    }
    await fileCard.trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("教学安排.txt");
    expect(wrapper.get('[data-testid="file-preview-text"]').text()).toContain("教学安排正文");

    await wrapper.get('[data-testid="file-preview-close"]').trigger("click");
    await flushPromises();
    const directoryCard = cards.find((card) => card.text().includes("课程资料"));
    if (!directoryCard) {
      throw new Error("missing teacher directory card");
    }
    await directoryCard.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.path).toBe("/课程资料");
  });

  it("supports breadcrumb navigation to parent and root", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/课程/课件",
          items: [],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/课程",
          items: [],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [],
        })
      ));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?path=%2F%E8%AF%BE%E7%A8%8B%2F%E8%AF%BE%E4%BB%B6");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="breadcrumb-课程"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBe("/课程");

    await wrapper.get('[data-testid="breadcrumb-root"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBeUndefined();
  });

  it("separates page context, primary actions, filters, and selection state controls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/课程资料",
        items: [],
      }),
    ));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?path=%2F%E8%AF%BE%E7%A8%8B%E8%B5%84%E6%96%99&view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const contextBar = wrapper.get('[data-testid="files-context-bar"]');
    expect(contextBar.text()).toContain("课程资料");
    expect(contextBar.get('[data-testid="breadcrumb-root"]').exists()).toBe(true);

    const primaryActions = wrapper.get('[data-testid="files-primary-actions"]');
    expect(primaryActions.get('[data-testid="create-file-button"]').exists()).toBe(true);
    expect(primaryActions.get('[data-testid="upload-material-open"]').exists()).toBe(true);
    expect(primaryActions.find('[data-testid="upload-conflict-mode"]').exists()).toBe(false);

    const toolbarTop = wrapper.get(".files-toolbar__top");
    const toolbarBottom = wrapper.get(".files-toolbar__bottom");
    const filterBar = toolbarBottom.get('[data-testid="files-filter-bar"]');
    expect(filterBar.get('[data-testid="files-search-input"]').exists()).toBe(true);
    expect(toolbarTop.find('[data-testid="files-filter-bar"]').exists()).toBe(false);
    const secondaryControls = wrapper.get('[data-testid="files-secondary-controls"]');
    expect(secondaryControls.find('[data-testid="files-sort-select"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="files-sort-name"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="files-sort-updated"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="files-sort-size"]').exists()).toBe(true);
    expect(primaryActions.get('[data-testid="files-view-grid"]').exists()).toBe(true);

    expect(wrapper.find('[data-testid="files-selection-toolbar"]').exists()).toBe(false);
  });

  it("refreshes the current folder from the toolbar without changing path", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/课程资料",
          items: [
            {
              id: 151,
              name: "旧课件.txt",
              path: "/课程资料/旧课件.txt",
              kind: "file",
              size: 8,
              downloadUrl: "/api/files/151/download",
              previewUrl: "/api/files/151/preview",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/课程资料",
          items: [
            {
              id: 152,
              name: "新课件.txt",
              path: "/课程资料/新课件.txt",
              kind: "file",
              size: 12,
              downloadUrl: "/api/files/152/download",
              previewUrl: "/api/files/152/preview",
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?path=%2F%E8%AF%BE%E7%A8%8B%E8%B5%84%E6%96%99");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain("旧课件.txt");

    await wrapper.get('[data-testid="files-refresh"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("新课件.txt");
    expect(wrapper.text()).not.toContain("旧课件.txt");
    expect(router.currentRoute.value.query.path).toBe("/课程资料");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const fileRequests = fetchMock.mock.calls.map(([input]) => String(input));
    expect(fileRequests.every((input) => isFilesRequest(input, { space: "library", path: "/课程资料" }))).toBe(true);
  });

  it("shows image thumbnails in grid view", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/效果示例",
        items: [
          {
            id: 161,
            name: "海报效果.jpg",
            path: "/效果示例/海报效果.jpg",
            kind: "file",
            size: 2048,
            mimeType: "image/jpeg",
            downloadUrl: "/api/files/161/download",
            previewUrl: "/api/files/161/preview",
          },
          {
            id: 162,
            name: "说明.txt",
            path: "/效果示例/说明.txt",
            kind: "file",
            size: 32,
            mimeType: "text/plain",
            downloadUrl: "/api/files/162/download",
            previewUrl: "/api/files/162/preview",
          },
        ],
      }),
    ));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?path=%2F%E6%95%88%E6%9E%9C%E7%A4%BA%E4%BE%8B&view=grid");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const thumbnail = wrapper.get('[data-testid="grid-thumbnail-161"]');
    expect(thumbnail.attributes("src")).toBe("/api/files/161/preview");
    expect(thumbnail.attributes("alt")).toBe("海报效果.jpg");
    expect(wrapper.find('[data-testid="grid-thumbnail-162"]').exists()).toBe(false);
  });

  it("navigates between previewable files in the current folder", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/效果示例",
        items: [
          {
            id: 171,
            name: "任务1.jpg",
            path: "/效果示例/任务1.jpg",
            kind: "file",
            size: 2048,
            mimeType: "image/jpeg",
            downloadUrl: "/api/files/171/download",
            archiveUrl: "/api/files/171/archive",
            previewUrl: "/api/files/171/preview",
            updatedAt: "2026-05-01T08:00:00Z",
          },
          {
            id: 172,
            name: "任务2.jpg",
            path: "/效果示例/任务2.jpg",
            kind: "file",
            size: 2048,
            mimeType: "image/jpeg",
            downloadUrl: "/api/files/172/download",
            archiveUrl: "/api/files/172/archive",
            previewUrl: "/api/files/172/preview",
            updatedAt: "2026-05-01T08:01:00Z",
          },
        ],
      }),
    ));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?path=%2F%E6%95%88%E6%9E%9C%E7%A4%BA%E4%BE%8B");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="preview-entry-171"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("任务1.jpg");
    expect(wrapper.get('[data-testid="file-preview-previous"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-testid="file-preview-next"]').attributes("disabled")).toBeUndefined();

    await wrapper.get('[data-testid="file-preview-next"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("任务2.jpg");
    expect(wrapper.get('[data-testid="file-preview-previous"]').attributes("disabled")).toBeUndefined();
    expect(wrapper.get('[data-testid="file-preview-next"]').attributes("disabled")).toBeDefined();
  });

  it("lets teachers adjust file grid thumbnail density from the toolbar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 161,
            name: "海报效果.jpg",
            path: "/海报效果.jpg",
            kind: "file",
            size: 2048,
            downloadUrl: "/api/files/161/download",
            archiveUrl: "",
            previewUrl: "/api/files/161/preview",
            updatedAt: "2026-05-01T08:00:00Z",
          },
        ],
      }),
    ));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=grid");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="files-grid-size-controls"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="files-grid"]').classes()).toContain("files-grid--medium");
    await wrapper.get('[data-testid="files-grid-size-small"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.gridSize).toBe("small");
    expect(wrapper.get('[data-testid="files-grid"]').classes()).toContain("files-grid--small");
  });

  it("shows copy entry for directory with natural prompt text", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 21,
              name: "课堂照片",
              path: "/课堂照片",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ items: [] }))
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [],
        })
      )
      .mockResolvedValueOnce(okJson({ id: 22 }));
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-21"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="copy-dialog"]').text()).toContain("课堂照片");
    expect(wrapper.get('[data-testid="copy-space-select"]').element).toBeTruthy();
    expect(wrapper.get('[data-testid="copy-space-select"]').classes()).toContain("copy-dialog__search");
    expect(wrapper.find(".copy-dialog__destination-label").exists()).toBe(false);
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/copy",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("copies into the selected destination subdirectory", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 31,
              name: "教学资源",
              path: "/教学资源",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ items: [] }))
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 32,
              name: "公开资料夹",
              path: "/公开资料夹",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/公开资料夹",
          items: [],
        })
      )
      .mockResolvedValueOnce(okJson({ id: 33 }));
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-31"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-destination-entry-32"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/copy",
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 31,
          destinationSpace: "public",
          destinationParentPath: "/公开资料夹",
        }),
      })
    );
  });

  it("loads class options in copy dialog when destination space is class", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 22,
              name: "作业素材",
              path: "/作业素材",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ items: [] }))
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "class",
          classId: 1,
          currentPath: "/",
          items: [],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-22"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-space-select"]').setValue("class");
    await flushPromises();

    const classOptions = wrapper.get('[data-testid="copy-class-select"]').findAll("option");
    expect(classOptions.map((option) => option.text())).toContain("一年级一班");
    expect(wrapper.get('[data-testid="copy-class-select"]').classes()).toContain("copy-dialog__search");
    expect(fetchMock).toHaveBeenCalledWith("/api/classes", expect.any(Object));
  });

  it("filters destination folders by search keyword", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 41,
              name: "教学资源",
              path: "/教学资源",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ items: [] }))
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 42,
              name: "公开资料夹",
              path: "/公开资料夹",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
            {
              id: 43,
              name: "历史归档",
              path: "/历史归档",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-41"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-search-input"]').setValue("公开");
    await flushPromises();

    expect(wrapper.find('[data-testid="copy-destination-entry-42"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="copy-destination-entry-43"]').exists()).toBe(false);
  });

  it("recursively searches nested destination folders", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 61,
              name: "课程模板",
              path: "/课程模板",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ items: [] }))
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 62,
              name: "教学资料",
              path: "/教学资料",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/教学资料",
          items: [
            {
              id: 63,
              name: "归档目录",
              path: "/教学资料/归档目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/教学资料/归档目录",
          items: [],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-61"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-search-input"]').setValue("归档");
    await flushPromises();

    expect(wrapper.find('[data-testid="copy-destination-entry-63"]').exists()).toBe(true);
  });

  it("recursively searches nested destination folders and allows selecting deep path", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/files/copy") {
        return okJson({ id: 75 });
      }
      if (!input.startsWith("/api/files?")) {
        throw new Error(`unexpected request: ${input}`);
      }
      const searchParams = new URL(input, "http://localhost").searchParams;
      const space = searchParams.get("space");
      const path = searchParams.get("path") ?? "/";
      if (space === "library") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 71,
              name: "教学资源",
              path: "/教学资源",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/") {
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 72,
              name: "公开资料",
              path: "/公开资料",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/公开资料") {
        return okJson({
          space: "public",
          currentPath: "/公开资料",
          items: [
            {
              id: 73,
              name: "二级目录",
              path: "/公开资料/二级目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/公开资料/二级目录") {
        return okJson({
          space: "public",
          currentPath: "/公开资料/二级目录",
          items: [
            {
              id: 74,
              name: "深层命中目录",
              path: "/公开资料/二级目录/深层命中目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/公开资料/二级目录/深层命中目录") {
        return okJson({
          space: "public",
          currentPath: "/公开资料/二级目录/深层命中目录",
          items: [],
        });
      }
      throw new Error(`unexpected path request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-71"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-search-input"]').setValue("深层命中");
    await flushPromises();

    expect(wrapper.find('[data-testid="copy-destination-entry-74"]').exists()).toBe(true);

    await wrapper.get('[data-testid="copy-destination-entry-74"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/copy",
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 71,
          destinationSpace: "public",
          destinationParentPath: "/公开资料/二级目录/深层命中目录",
        }),
      })
    );
  });

  it("shows recent copy destination on next dialog open in same session", async () => {
    let savedRecentTargets: Array<{ space: string; path: string; label: string }> = [];
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: savedRecentTargets });
      }
      if (input === "/api/files/copy") {
        return okJson({ id: 83 });
      }
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: savedRecentTargets });
      }
      if (!input.startsWith("/api/files?")) {
        throw new Error(`unexpected request: ${input}`);
      }
      const searchParams = new URL(input, "http://localhost").searchParams;
      const space = searchParams.get("space");
      const path = searchParams.get("path") ?? "/";

      if (space === "library") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 81,
              name: "备课资料",
              path: "/备课资料",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/") {
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 82,
              name: "目标目录A",
              path: "/目标目录A",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/目标目录A") {
        return okJson({
          space: "public",
          currentPath: "/目标目录A",
          items: [],
        });
      }
      throw new Error(`unexpected path request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
      if (input === "/api/preferences/recent-copy-targets" && init?.method === "PUT") {
        savedRecentTargets = JSON.parse(String(init.body)).items;
        return okJson({ items: savedRecentTargets });
      }
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: savedRecentTargets });
      }
      if (input === "/api/files/copy") {
        return okJson({ id: 83 });
      }
      if (!input.startsWith("/api/files?")) {
        throw new Error(`unexpected request: ${input}`);
      }
      const searchParams = new URL(input, "http://localhost").searchParams;
      const space = searchParams.get("space");
      const path = searchParams.get("path") ?? "/";

      if (space === "library") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 81,
              name: "备课资料",
              path: "/备课资料",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/") {
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 82,
              name: "目标目录A",
              path: "/目标目录A",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/目标目录A") {
        return okJson({
          space: "public",
          currentPath: "/目标目录A",
          items: [],
        });
      }
      throw new Error(`unexpected path request: ${input}`);
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-81"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-destination-entry-82"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    await wrapper.get('[data-testid="copy-81"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="copy-recent-target-0"]').exists()).toBe(true);
    await wrapper.get('[data-testid="copy-recent-target-0"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    const copyRequests = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    const copyCalls = copyRequests.filter(([url]) => url === "/api/files/copy");
    expect(copyCalls).toHaveLength(2);
    expect(copyCalls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 81,
          destinationSpace: "public",
          destinationParentPath: "/目标目录A",
        }),
      })
    );
  });

  it("creates destination folder inside copy dialog and copies into it", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 51,
              name: "单元资料",
              path: "/单元资料",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ items: [] }))
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          id: 52,
          name: "新目标目录",
          path: "/新目标目录",
          kind: "dir",
          size: 0,
          downloadUrl: "",
          previewUrl: "",
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/新目标目录",
          items: [],
        })
      )
      .mockResolvedValueOnce(okJson({ id: 53 }));
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-51"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-create-folder-input"]').setValue("新目标目录");
    await wrapper.get('[data-testid="copy-create-folder-submit"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/folder",
      expect.objectContaining({
        body: JSON.stringify({
          space: "public",
          parentPath: "/",
          name: "新目标目录",
        }),
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/copy",
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 51,
          destinationSpace: "public",
          destinationParentPath: "/新目标目录",
        }),
      })
    );
  });

  it("shows recent destination targets after a successful copy", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 71,
              name: "范例文件",
              path: "/范例文件",
              kind: "file",
              size: 1,
              downloadUrl: "/api/files/71/download",
              previewUrl: "/api/files/71/preview",
            },
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ items: [] }))
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 72,
              name: "示例目录",
              path: "/示例目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/示例目录",
          items: [],
        })
      )
      .mockResolvedValueOnce(okJson({ id: 73 }))
      .mockResolvedValueOnce(okJson({ items: [{ space: "public", path: "/示例目录", label: "示例目录" }] }))
      .mockResolvedValueOnce(
        okJson({
          items: [{ space: "public", path: "/示例目录", label: "示例目录" }],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 72,
              name: "示例目录",
              path: "/示例目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          space: "public",
          currentPath: "/示例目录",
          items: [],
        })
      )
      .mockResolvedValueOnce(okJson({ id: 74 }))
      .mockResolvedValueOnce(okJson({ items: [{ space: "public", path: "/示例目录", label: "示例目录" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-71"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-destination-entry-72"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    await wrapper.get('[data-testid="copy-71"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="copy-recent-target-0"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("示例目录");
    await wrapper.get('[data-testid="copy-recent-target-0"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    const copyCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/files/copy");
    expect(copyCalls).toHaveLength(2);
  });

  it("pins recent target and clears non-pinned records", async () => {
    let savedRecentTargets = [
      { space: "public", path: "/示例目录", label: "示例目录" },
      { space: "public", path: "/临时目录", label: "临时目录" },
    ];
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/preferences/recent-copy-targets" && init?.method === "PUT") {
        savedRecentTargets = JSON.parse(String(init.body)).items;
        return okJson({ items: savedRecentTargets });
      }
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: savedRecentTargets });
      }
      if (input.startsWith("/api/files?")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 91,
              name: "示例文件",
              path: "/示例文件",
              kind: "file",
              size: 1,
              downloadUrl: "/api/files/91/download",
              previewUrl: "/api/files/91/preview",
            },
          ],
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-91"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-recent-pin-0"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-recent-clear"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("示例目录");
    expect(wrapper.text()).not.toContain("临时目录");
  });

  it("reorders pinned recent targets and persists the pinned order", async () => {
    let savedRecentTargets = [
      { space: "public", path: "/固定目录A", label: "固定目录A", pinned: true },
      { space: "public", path: "/固定目录B", label: "固定目录B", pinned: true },
      { space: "public", path: "/临时目录", label: "临时目录" },
    ];
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/preferences/recent-copy-targets" && init?.method === "PUT") {
        savedRecentTargets = JSON.parse(String(init.body)).items;
        return okJson({ items: savedRecentTargets });
      }
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: savedRecentTargets });
      }
      if (input.startsWith("/api/files?")) {
        const searchParams = new URL(input, "http://localhost").searchParams;
        const space = searchParams.get("space");
        if (space === "library") {
          return okJson({
            space: "library",
            currentPath: "/",
            items: [
              {
                id: 111,
                name: "排序测试文件",
                path: "/排序测试文件",
                kind: "file",
                size: 1,
                downloadUrl: "/api/files/111/download",
                previewUrl: "/api/files/111/preview",
              },
            ],
          });
        }
        return okJson({
          space: "public",
          currentPath: "/",
          items: [],
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-111"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="copy-recent-target-0"]').text()).toContain("固定目录A");
    expect(wrapper.get('[data-testid="copy-recent-target-1"]').text()).toContain("固定目录B");

    await wrapper.get('[data-testid="copy-recent-move-down-0"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="copy-recent-target-0"]').text()).toContain("固定目录B");
    expect(wrapper.get('[data-testid="copy-recent-target-1"]').text()).toContain("固定目录A");
    expect(savedRecentTargets.map((item) => item.label)).toEqual(["固定目录B", "固定目录A", "临时目录"]);
  });

  it("keeps pinned order stable when a new recent target is added", async () => {
    let savedRecentTargets = [
      { space: "public", path: "/固定目录A", label: "固定目录A", pinned: true },
      { space: "public", path: "/固定目录B", label: "固定目录B", pinned: true },
      { space: "public", path: "/临时目录", label: "临时目录" },
    ];
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/preferences/recent-copy-targets" && init?.method === "PUT") {
        savedRecentTargets = JSON.parse(String(init.body)).items;
        return okJson({ items: savedRecentTargets });
      }
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: savedRecentTargets });
      }
      if (input === "/api/files/copy") {
        return okJson({ id: 123 });
      }
      if (!input.startsWith("/api/files?")) {
        throw new Error(`unexpected request: ${input}`);
      }

      const searchParams = new URL(input, "http://localhost").searchParams;
      const space = searchParams.get("space");
      const path = searchParams.get("path") ?? "/";
      if (space === "library") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 121,
              name: "新资料",
              path: "/新资料",
              kind: "file",
              size: 1,
              downloadUrl: "/api/files/121/download",
              previewUrl: "/api/files/121/preview",
            },
          ],
        });
      }
      if (space === "public" && path === "/") {
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 122,
              name: "新目标目录",
              path: "/新目标目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              previewUrl: "",
            },
          ],
        });
      }
      if (space === "public" && path === "/新目标目录") {
        return okJson({
          space: "public",
          currentPath: "/新目标目录",
          items: [],
        });
      }
      throw new Error(`unexpected path request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="copy-121"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-destination-entry-122"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    expect(savedRecentTargets.map((item) => item.label)).toEqual(["固定目录A", "固定目录B", "新目标目录", "临时目录"]);
  });

  it("shows batch toolbar and copies selected entries through the target dialog", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/preferences/recent-copy-targets" && init?.method === "PUT") {
        return okJson({ items: JSON.parse(String(init.body)).items });
      }
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: [] });
      }
      if (input === "/api/files/copy") {
        return okJson({ id: 205 });
      }
      if (!input.startsWith("/api/files?")) {
        throw new Error(`unexpected request: ${input}`);
      }

      const searchParams = new URL(input, "http://localhost").searchParams;
      const space = searchParams.get("space");
      const path = searchParams.get("path") ?? "/";

      if (space === "library") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 201,
              name: "单元课件",
              path: "/单元课件",
              kind: "file",
              size: 12,
              downloadUrl: "/api/files/201/download",
              archiveUrl: "",
              previewUrl: "/api/files/201/preview",
              updatedAt: "2026-04-20T10:00:00.000Z",
            },
            {
              id: 202,
              name: "课堂照片",
              path: "/课堂照片",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/202/archive",
              previewUrl: "",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
          ],
        });
      }

      if (space === "public" && path === "/") {
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 203,
          name: "公共练习",
          path: "/公共练习",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/203/archive",
              previewUrl: "",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
        });
      }

      if (space === "public" && path === "/公共练习") {
        return okJson({
          space: "public",
          currentPath: "/公共练习",
          items: [],
        });
      }

      throw new Error(`unexpected path request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="select-entry-201"]').setValue(true);
    await wrapper.get('[data-testid="select-entry-202"]').setValue(true);
    await flushPromises();

    expect(wrapper.get('[data-testid="files-selection-toolbar"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="files-selection-toolbar-summary"]').text()).toContain("已选 2 项");
    expect(wrapper.get('[data-testid="batch-action-download"]').classes()).toContain("button--primary");
    expect(wrapper.get('[data-testid="batch-action-copy"]').classes()).toContain("button--secondary");
    expect(wrapper.get('[data-testid="batch-action-move"]').classes()).toContain("button--accent");
    expect(wrapper.get('[data-testid="batch-action-delete"]').classes()).toContain("button--danger");

    await wrapper.get('[data-testid="batch-action-copy"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="copy-dialog"]').text()).toContain("已选择 2 项");
    expect(wrapper.get('[data-testid="target-dialog-summary"]').text()).toContain("复制 2 项");
    expect(wrapper.get('[data-testid="target-dialog-space-section"]').text()).toContain("目标空间");
    expect(wrapper.get('[data-testid="target-dialog-destination-section"]').text()).toContain("目标目录");
    expect(wrapper.find(".copy-dialog__destination-label").exists()).toBe(false);

    await wrapper.get('[data-testid="copy-destination-entry-203"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    const copyCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/files/copy");
    expect(copyCalls).toHaveLength(2);
    expect(copyCalls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 201,
          destinationSpace: "public",
          destinationParentPath: "/公共练习",
        }),
      }),
    );
    expect(copyCalls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 202,
          destinationSpace: "public",
          destinationParentPath: "/公共练习",
        }),
      }),
    );
  });

  it("moves selected entries through the target dialog in move mode", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/preferences/recent-copy-targets" && init?.method === "PUT") {
        return okJson({ items: JSON.parse(String(init.body)).items });
      }
      if (input === "/api/preferences/recent-copy-targets") {
        return okJson({ items: [] });
      }
      if (input === "/api/files/move") {
        return okJson({ id: 305 });
      }
      if (!input.startsWith("/api/files?")) {
        throw new Error(`unexpected request: ${input}`);
      }

      const searchParams = new URL(input, "http://localhost").searchParams;
      const space = searchParams.get("space");
      const path = searchParams.get("path") ?? "/";

      if (space === "library") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 301,
              name: "待移动课件",
              path: "/待移动课件",
              kind: "file",
              size: 10,
              downloadUrl: "/api/files/301/download",
              archiveUrl: "",
              previewUrl: "/api/files/301/preview",
              updatedAt: "2026-04-20T10:00:00.000Z",
            },
            {
              id: 302,
              name: "待移动目录",
              path: "/待移动目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/302/archive",
              previewUrl: "",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
          ],
        });
      }

      if (space === "public" && path === "/") {
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 303,
              name: "归档区",
              path: "/归档区",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/303/archive",
              previewUrl: "",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
        });
      }

      if (space === "public" && path === "/归档区") {
        return okJson({
          space: "public",
          currentPath: "/归档区",
          items: [],
        });
      }

      throw new Error(`unexpected path request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="select-entry-301"]').setValue(true);
    await wrapper.get('[data-testid="select-entry-302"]').setValue(true);
    await flushPromises();

    await wrapper.get('[data-testid="batch-action-move"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="copy-dialog"]').text()).toContain("移动目标");
    expect(wrapper.get('[data-testid="target-dialog-summary"]').text()).toContain("移动 2 项");
    expect(wrapper.get('[data-testid="target-dialog-space-section"]').text()).toContain("目标空间");
    expect(wrapper.get('[data-testid="target-dialog-destination-section"]').text()).toContain("目标目录");
    expect(wrapper.find(".copy-dialog__destination-label").exists()).toBe(false);

    await wrapper.get('[data-testid="copy-destination-entry-303"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="copy-submit"]').trigger("click");
    await flushPromises();

    const moveCalls = fetchMock.mock.calls.filter(([url]) => url === "/api/files/move");
    expect(moveCalls).toHaveLength(2);
    expect(moveCalls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 301,
          destinationSpace: "public",
          destinationParentPath: "/归档区",
        }),
      }),
    );
    expect(moveCalls[1]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          entryId: 302,
          destinationSpace: "public",
          destinationParentPath: "/归档区",
        }),
      }),
    );
  });

  it("batch-deletes selected entries and refreshes the list", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/files/501") {
        return okJson({ ok: true });
      }
      if (input === "/api/files/502") {
        return okJson({ ok: true });
      }
      if (input.startsWith("/api/files?")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 501,
              name: "待删除文件",
              path: "/待删除文件",
              kind: "file",
              size: 2,
              downloadUrl: "/api/files/501/download",
              archiveUrl: "",
              previewUrl: "/api/files/501/preview",
              updatedAt: "2026-04-20T10:00:00.000Z",
            },
            {
              id: 502,
              name: "待删除目录",
              path: "/待删除目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/502/archive",
              previewUrl: "",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
          ],
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="select-entry-501"]').setValue(true);
    await wrapper.get('[data-testid="select-entry-502"]').setValue(true);
    await flushPromises();
    await wrapper.get('[data-testid="batch-action-delete"]').trigger("click");
    expect(wrapper.get('[data-testid="delete-selected-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="delete-selected-confirm"]').trigger("click");
    await flushPromises();

    const deleteRequests = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    const deleteCalls = deleteRequests.filter(([url]) => url === "/api/files/501" || url === "/api/files/502");
    expect(deleteCalls).toHaveLength(2);
    expect(deleteCalls[0]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
    expect(deleteCalls[1]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });

  it("continues batch delete when one selected entry fails", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/files/601") {
        return {
          ok: false,
          status: 422,
          json: async () => ({
            error: {
              code: "invalid_request",
              message: "参数错误",
            },
          }),
        };
      }
      if (input === "/api/files/602") {
        return okJson({ ok: true });
      }
      if (input.startsWith("/api/files?")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 601,
              name: "异常目录",
              path: "/异常目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/601/archive",
              previewUrl: "",
              updatedAt: "2026-04-20T10:00:00.000Z",
            },
            {
              id: 602,
              name: "普通文件",
              path: "/普通文件",
              kind: "file",
              size: 2,
              downloadUrl: "/api/files/602/download",
              archiveUrl: "",
              previewUrl: "/api/files/602/preview",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
          ],
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="select-entry-601"]').setValue(true);
    await wrapper.get('[data-testid="select-entry-602"]').setValue(true);
    await flushPromises();
    await wrapper.get('[data-testid="batch-action-delete"]').trigger("click");
    await wrapper.get('[data-testid="delete-selected-confirm"]').trigger("click");
    await flushPromises();

    const deleteRequests = fetchMock.mock.calls as unknown as Array<[string, RequestInit | undefined]>;
    const deleteCalls = deleteRequests.filter(([url]) => url === "/api/files/601" || url === "/api/files/602");
    expect(deleteCalls).toHaveLength(2);
    expect(deleteCalls[0]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
    expect(deleteCalls[1]?.[1]).toEqual(expect.objectContaining({ method: "DELETE" }));
  });

  it("uses direct file download, folder archive links, and one batch archive for multiple selected entries", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/files?")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 401,
              name: "归档目录",
              path: "/归档目录",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/401/archive",
              previewUrl: "",
              updatedAt: "2026-04-20T10:00:00.000Z",
            },
            {
              id: 402,
              name: "通知.pdf",
              path: "/通知.pdf",
              kind: "file",
              size: 15,
              downloadUrl: "/api/files/402/download",
              archiveUrl: "",
              previewUrl: "/api/files/402/preview",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
          ],
          pagination: { page: 1, pageSize: 30, total: 2, totalPages: 1 },
        });
      }
      throw new Error(`unexpected request ${input}`);
    });
    const downloadClicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function clickDownloadLink() {
      downloadClicks.push(this.getAttribute("href") ?? "");
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const folderDownload = wrapper.get('[data-testid="download-entry-401"]');
    expect(folderDownload.text()).toBe("下载压缩包");
    expect(folderDownload.element.tagName).toBe("A");
    expect(folderDownload.attributes("href")).toBe("/api/files/401/archive");
    expect(wrapper.get('[data-testid="download-entry-402"]').text()).toBe("下载");
    expect(wrapper.get('[data-testid="download-entry-402"]').attributes("href")).toBe("/api/files/402/download");

    await wrapper.get('[data-testid="select-entry-401"]').setValue(true);
    await wrapper.get('[data-testid="select-entry-402"]').setValue(true);
    await flushPromises();
    await wrapper.get('[data-testid="batch-action-download"]').trigger("click");
    await flushPromises();

    expect(downloadClicks).toHaveLength(1);
    const archiveUrl = new URL(downloadClicks[0] ?? "", "http://localhost");
    expect(archiveUrl.pathname).toBe("/api/files/batch/archive");
    expect(archiveUrl.searchParams.get("entryIds")).toBe("401,402");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("downloads a single selected file directly and a single selected folder as an archive", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/files?")) {
        return okJson({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 401,
            name: "归档目录",
            path: "/归档目录",
            kind: "dir",
            size: 0,
            downloadUrl: "",
            archiveUrl: "/api/files/401/archive",
            previewUrl: "",
            updatedAt: "2026-04-20T10:00:00.000Z",
          },
          {
            id: 402,
            name: "通知.pdf",
            path: "/通知.pdf",
            kind: "file",
            size: 15,
            downloadUrl: "/api/files/402/download",
            archiveUrl: "",
            previewUrl: "/api/files/402/preview",
            updatedAt: "2026-04-21T10:00:00.000Z",
          },
          ],
          pagination: { page: 1, pageSize: 30, total: 1, totalPages: 1 },
        });
      }
      throw new Error(`unexpected request ${input}`);
    });
    const downloadClicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function clickDownloadLink() {
      downloadClicks.push(this.getAttribute("href") ?? "");
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="select-entry-402"]').setValue(true);
    await flushPromises();
    await wrapper.get('[data-testid="batch-action-download"]').trigger("click");
    await flushPromises();

    expect(downloadClicks).toEqual(["/api/files/402/download"]);

    await wrapper.get('[data-testid="select-entry-402"]').setValue(false);
    await wrapper.get('[data-testid="select-entry-401"]').setValue(true);
    await flushPromises();
    await wrapper.get('[data-testid="batch-action-download"]').trigger("click");
    await flushPromises();

    expect(downloadClicks).toEqual(["/api/files/402/download", "/api/files/401/archive"]);
  });

  it("searches files recursively via the backend and clears back to the current directory listing", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/files?space=library")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 601,
              name: "课程资料",
              path: "/课程资料",
              kind: "dir",
              size: 0,
              downloadUrl: "",
              archiveUrl: "/api/files/601/archive",
              previewUrl: "",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
          ],
        });
      }
      if (input.startsWith("/api/files/search?")) {
        const searchParams = new URL(input, "http://localhost").searchParams;
        expect(searchParams.get("space")).toBe("library");
        expect(searchParams.get("page")).toBe("1");
        expect(searchParams.get("pageSize")).toBe("30");
        expect(searchParams.get("q")).toBe("讲义 type:pdf case:insensitive");
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 602,
              name: "单元讲义.pdf",
              path: "/课程资料/单元讲义.pdf",
              kind: "file",
              size: 128,
              downloadUrl: "/api/files/602/download",
              archiveUrl: "",
              previewUrl: "/api/files/602/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    const searchInput = wrapper.get('[data-testid="files-search-input"]');
    expect(searchInput.attributes("placeholder")).toContain("搜索当前资料");

    await searchInput.setValue("讲义 type:pdf case:insensitive");
    await wrapper.get('[data-testid="files-search-submit"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/search?space=library&page=1&pageSize=30&q=%E8%AE%B2%E4%B9%89+type%3Apdf+case%3Ainsensitive",
      expect.any(Object),
    );
    expect(wrapper.text()).toContain("单元讲义.pdf");
    expect(wrapper.text()).toContain("/课程资料/单元讲义.pdf");
    expect(wrapper.get('[data-testid="files-search-summary"]').text()).toContain("当前过滤条件：关键词：讲义；类型：PDF；大小写：不区分大小写");

    await wrapper.get('[data-testid="files-search-clear"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith("/api/files?space=library&page=1&pageSize=30", expect.any(Object));
    expect(wrapper.text()).toContain("课程资料");
    expect(wrapper.find('[data-testid="files-search-summary"]').exists()).toBe(false);
  });

  it("uses server pagination params and keeps file paging state in the route", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (!input.startsWith("/api/files?")) {
        throw new Error(`unexpected request: ${input}`);
      }
      const searchParams = new URL(input, "http://localhost").searchParams;
      expect(searchParams.get("space")).toBe("library");
      expect(searchParams.get("sort")).toBe("size-desc");
      expect(searchParams.get("pageSize")).toBeTruthy();

      if (searchParams.get("page") === "2" && searchParams.get("pageSize") === "1") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 612,
              name: "分页资料-B.pdf",
              path: "/分页资料-B.pdf",
              kind: "file",
              size: 20,
              downloadUrl: "/api/files/612/download",
              archiveUrl: "",
              previewUrl: "/api/files/612/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
          pagination: {
            page: 2,
            pageSize: 1,
            total: 2,
            totalPages: 2,
          },
        });
      }

      if (searchParams.get("page") === "1" && searchParams.get("pageSize") === "1") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 611,
              name: "分页资料-A.pdf",
              path: "/分页资料-A.pdf",
              kind: "file",
              size: 10,
              downloadUrl: "/api/files/611/download",
              archiveUrl: "",
              previewUrl: "/api/files/611/preview",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
          ],
          pagination: {
            page: 1,
            pageSize: 1,
            total: 2,
            totalPages: 2,
          },
        });
      }

      if (searchParams.get("page") === "1" && searchParams.get("pageSize") === "30") {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 611,
              name: "分页资料-A.pdf",
              path: "/分页资料-A.pdf",
              kind: "file",
              size: 10,
              downloadUrl: "/api/files/611/download",
              archiveUrl: "",
              previewUrl: "/api/files/611/preview",
              updatedAt: "2026-04-21T10:00:00.000Z",
            },
            {
              id: 612,
              name: "分页资料-B.pdf",
              path: "/分页资料-B.pdf",
              kind: "file",
              size: 20,
              downloadUrl: "/api/files/612/download",
              archiveUrl: "",
              previewUrl: "/api/files/612/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
          pagination: {
            page: 1,
            pageSize: 30,
            total: 2,
            totalPages: 1,
          },
        });
      }

      throw new Error(`unexpected paged request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?page=2&pageSize=1&sort=size-desc&view=grid");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="files-pagination-summary"]').text()).toContain("第 2 / 2 页 · 共 2 条");
    expect(wrapper.get('[data-testid="files-page-size-select"]').element).toHaveProperty("value", "1");
    expect(wrapper.find('[data-testid="files-grid"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("分页资料-B.pdf");
    const workspaceHtml = wrapper.get('[data-testid="files-workspace"]').html();
    expect(workspaceHtml.indexOf('data-testid="files-pagination-summary"')).toBeLessThan(
      workspaceHtml.indexOf('data-testid="files-grid"'),
    );

    await wrapper.get('[data-testid="files-page-prev"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBeUndefined();
    expect(router.currentRoute.value.query.pageSize).toBe("1");
    expect(router.currentRoute.value.query.sort).toBe("size-desc");
    expect(router.currentRoute.value.query.view).toBeUndefined();
    expect(wrapper.text()).toContain("分页资料-A.pdf");

    await wrapper.get('[data-testid="files-page-size-select"]').setValue("30");
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBeUndefined();
    expect(router.currentRoute.value.query.pageSize).toBeUndefined();
    expect(wrapper.get('[data-testid="files-pagination-summary"]').text()).toContain("第 1 / 1 页 · 共 2 条");
  });

  it("sorts displayed entries by update time and size", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 701,
            name: "alpha.txt",
            path: "/alpha.txt",
            kind: "file",
            size: 15,
            downloadUrl: "/api/files/701/download",
            archiveUrl: "",
            previewUrl: "/api/files/701/preview",
            updatedAt: "2026-04-20T10:00:00.000Z",
          },
          {
            id: 702,
            name: "beta.txt",
            path: "/beta.txt",
            kind: "file",
            size: 30,
            downloadUrl: "/api/files/702/download",
            archiveUrl: "",
            previewUrl: "/api/files/702/preview",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
          {
            id: 703,
            name: "gamma.txt",
            path: "/gamma.txt",
            kind: "file",
            size: 20,
            downloadUrl: "/api/files/703/download",
            archiveUrl: "",
            previewUrl: "/api/files/703/preview",
            updatedAt: "2026-04-21T10:00:00.000Z",
          },
          {
            id: 704,
            name: "omega-folder",
            path: "/omega-folder",
            kind: "dir",
            size: 0,
            downloadUrl: "",
            archiveUrl: "",
            previewUrl: "",
            updatedAt: "2026-04-23T10:00:00.000Z",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="files-sort-updated"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("updated-desc");
    let names = wrapper.findAll('[data-testid^="entry-name-"]').map((node) => node.text());
    expect(names).toEqual(["omega-folder", "beta.txt", "gamma.txt", "alpha.txt"]);

    await wrapper.get('[data-testid="files-sort-updated"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("updated-asc");
    names = wrapper.findAll('[data-testid^="entry-name-"]').map((node) => node.text());
    expect(names).toEqual(["alpha.txt", "gamma.txt", "beta.txt", "omega-folder"]);

    await wrapper.get('[data-testid="files-sort-size"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("size-desc");
    names = wrapper.findAll('[data-testid^="entry-name-"]').map((node) => node.text());
    expect(names).toEqual(["beta.txt", "gamma.txt", "alpha.txt", "omega-folder"]);

    await wrapper.get('[data-testid="files-sort-size"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("size-asc");
    names = wrapper.findAll('[data-testid^="entry-name-"]').map((node) => node.text());
    expect(names).toEqual(["omega-folder", "alpha.txt", "gamma.txt", "beta.txt"]);

    await wrapper.get('[data-testid="files-sort-name"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("name-asc");
    names = wrapper.findAll('[data-testid^="entry-name-"]').map((node) => node.text());
    expect(names).toEqual(["alpha.txt", "beta.txt", "gamma.txt", "omega-folder"]);

    await wrapper.get('[data-testid="files-sort-name"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.sort).toBe("name-desc");
    names = wrapper.findAll('[data-testid^="entry-name-"]').map((node) => node.text());
    expect(names).toEqual(["omega-folder", "gamma.txt", "beta.txt", "alpha.txt"]);
  });

  it("switches between list and grid views while keeping secondary actions inside overflow panels", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 801,
            name: "示例文档.txt",
            path: "/示例文档.txt",
            kind: "file",
            size: 9,
            downloadUrl: "/api/files/801/download",
            archiveUrl: "",
            previewUrl: "/api/files/801/preview",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="files-table"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="files-view-grid"]').classes()).toContain("button--primary");
    expect(wrapper.get('[data-testid="files-grid"]').text()).toContain("示例文档.txt");
    expect(wrapper.get('[data-testid="download-entry-801"]').attributes("href")).toBe("/api/files/801/download");
    expect(wrapper.get('[data-testid="card-primary-actions-801"]').text()).toContain("预览");
    expect(wrapper.get('[data-testid="card-primary-actions-801"]').text()).toContain("下载");
    expect(wrapper.get('[data-testid="card-secondary-actions-801"]').attributes("style") ?? "").toContain("display: none;");
    await wrapper.get('[data-testid="card-more-actions-801"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="card-secondary-actions-801"]').element.parentElement).toBe(
      wrapper.get('[data-testid="card-actions-overflow-801"]').element,
    );
    expect(wrapper.get('[data-testid="card-secondary-actions-801"]').attributes("style") ?? "").not.toContain("display: none");
    expect(wrapper.get('[data-testid="card-secondary-actions-801"]').text()).toContain("复制");
    expect(wrapper.get('[data-testid="card-secondary-actions-801"]').text()).toContain("移动");
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();
    expect(wrapper.get('[data-testid="card-secondary-actions-801"]').attributes("style") ?? "").toContain("display: none;");

    await wrapper.get('[data-testid="files-view-list"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="files-table"]').exists()).toBe(true);
    expect(router.currentRoute.value.query.view).toBe("list");
    expect(wrapper.get('[data-testid="row-primary-actions-801"]').text()).toContain("预览");
    expect(wrapper.get('[data-testid="row-primary-actions-801"]').text()).toContain("下载");
    expect(wrapper.get('[data-testid="row-secondary-actions-801"]').attributes("style") ?? "").toContain("display: none;");
    await wrapper.get('[data-testid="row-more-actions-801"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="row-secondary-actions-801"]').element.parentElement).toBe(
      wrapper.get('[data-testid="row-actions-overflow-801"]').element,
    );
    expect(wrapper.get('[data-testid="row-secondary-actions-801"]').attributes("style") ?? "").not.toContain("display: none");
    expect(wrapper.get('[data-testid="row-secondary-actions-801"]').text()).toContain("复制");
    expect(wrapper.get('[data-testid="row-secondary-actions-801"]').text()).toContain("移动");
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flushPromises();
    expect(wrapper.get('[data-testid="row-secondary-actions-801"]').attributes("style") ?? "").toContain("display: none;");
  });

  it("shows inline text preview in a dialog", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/files?space=library")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 901,
              name: "教学安排.txt",
              path: "/教学安排.txt",
              kind: "file",
              size: 18,
              mimeType: "text/plain",
              downloadUrl: "/api/files/901/download",
              archiveUrl: "",
              previewUrl: "/api/files/901/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/901/preview") {
        return {
          ok: true,
          status: 200,
          text: async () => "本周完成课程导入与资料整理。",
        };
      }
      throw new Error(`unexpected request: ${input}`);
    });
    const openMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("open", openMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="preview-entry-901"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("教学安排.txt");
    expect(wrapper.get('[data-testid="file-preview-text"]').text()).toContain("本周完成课程导入与资料整理。");
    expect(openMock).not.toHaveBeenCalled();
  });

  it("opens the editor directly from a text preview", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.startsWith("/api/files?space=library")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 924,
              name: "教学安排.txt",
              path: "/教学安排.txt",
              kind: "file",
              size: 18,
              mimeType: "text/plain",
              downloadUrl: "/api/files/924/download",
              archiveUrl: "",
              previewUrl: "/api/files/924/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/924/preview" && !init?.method) {
        return {
          ok: true,
          status: 200,
          text: async () => "本周完成课程导入与资料整理。",
        };
      }
      if (input === "/api/files/924/content" && !init?.method) {
        return okJson({
          item: {
            id: 924,
            name: "教学安排.txt",
            path: "/教学安排.txt",
            kind: "file",
            size: 18,
            mimeType: "text/plain",
            downloadUrl: "/api/files/924/download",
            archiveUrl: "",
            previewUrl: "/api/files/924/preview",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
          content: "本周完成课程导入与资料整理。",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="preview-entry-924"]').trigger("click");
    await flushPromises();
    expect(wrapper.get('[data-testid="file-preview-edit"]').exists()).toBe(true);

    await wrapper.get('[data-testid="file-preview-edit"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="file-preview-dialog"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="file-editor-dialog"]').text()).toContain("教学安排.txt");
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe("本周完成课程导入与资料整理。");
  });

  it("shows pdf preview in an iframe dialog", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 902,
            name: "通知.pdf",
            path: "/通知.pdf",
            kind: "file",
            size: 88,
            mimeType: "application/pdf",
            downloadUrl: "/api/files/902/download",
            archiveUrl: "",
            previewUrl: "/api/files/902/preview",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="preview-entry-902"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-pdf"]').attributes("src")).toBe("/api/files/902/preview");
  });

  it("shows image preview in a dialog", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 903,
            name: "课堂照片.png",
            path: "/课堂照片.png",
            kind: "file",
            size: 120,
            mimeType: "image/png",
            downloadUrl: "/api/files/903/download",
            archiveUrl: "",
            previewUrl: "/api/files/903/preview",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="preview-entry-903"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-image"]').attributes("src")).toBe("/api/files/903/preview");
  });

  it("falls back to a new tab for unsupported preview types", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        space: "library",
        currentPath: "/",
        items: [
          {
            id: 904,
            name: "归档包.zip",
            path: "/归档包.zip",
            kind: "file",
            size: 120,
            mimeType: "application/zip",
            downloadUrl: "/api/files/904/download",
            archiveUrl: "",
            previewUrl: "/api/files/904/preview",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
        ],
      }),
    );
    const openMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("open", openMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="preview-entry-904"]').trigger("click");

    expect(openMock).toHaveBeenCalledWith("/api/files/904/preview", "_blank", "noopener");
    expect(wrapper.find('[data-testid="file-preview-dialog"]').exists()).toBe(false);
  });

  it("opens a text editor for supported files and saves changes", async () => {
    const updatedContent = "更新后的教学安排";
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.startsWith("/api/files?space=library")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 905,
              name: "教学安排.md",
              path: "/教学安排.md",
              kind: "file",
              size: 18,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/905/download",
              archiveUrl: "",
              previewUrl: "/api/files/905/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
            {
              id: 906,
              name: "课堂照片.png",
              path: "/课堂照片.png",
              kind: "file",
              size: 88,
              mimeType: "image/png",
              downloadUrl: "/api/files/906/download",
              archiveUrl: "",
              previewUrl: "/api/files/906/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/905/content" && !init?.method) {
        return okJson({
          item: {
            id: 905,
            name: "教学安排.md",
            path: "/教学安排.md",
            kind: "file",
            size: 18,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/905/download",
            archiveUrl: "",
            previewUrl: "/api/files/905/preview",
            updatedAt: "2026-04-22T10:00:00.000Z",
          },
          content: "初始教学安排",
        });
      }
      if (input === "/api/files/905/content" && init?.method === "PUT") {
        return okJson({
          item: {
            id: 905,
            name: "教学安排.md",
            path: "/教学安排.md",
            kind: "file",
            size: updatedContent.length,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/905/download",
            archiveUrl: "",
            previewUrl: "/api/files/905/preview",
            updatedAt: "2026-04-25T10:00:00.000Z",
          },
          content: updatedContent,
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="edit-entry-905"]').text()).toBe("编辑");
    expect(wrapper.find('[data-testid="edit-entry-906"]').exists()).toBe(false);

    await wrapper.get('[data-testid="edit-entry-905"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-editor-dialog"]').text()).toContain("教学安排.md");
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe("初始教学安排");

    await wrapper.get('[data-testid="file-editor-textarea"]').setValue(updatedContent);
    await wrapper.get('[data-testid="file-editor-save"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/905/content",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          content: updatedContent,
        }),
      }),
    );
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe(updatedContent);
  });

  it("shows a create file action and opens the editor after creating a markdown file", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.startsWith("/api/files?space=library")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [],
        });
      }
      if (input === "/api/files/file" && init?.method === "POST") {
        return okJson({
          item: {
            id: 908,
            name: "新建文档.md",
            path: "/新建文档.md",
            kind: "file",
            size: 0,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/908/download",
            archiveUrl: "",
            previewUrl: "/api/files/908/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="create-file-button"]').text()).toBe("新建文件");

    await wrapper.get('[data-testid="create-file-button"]').trigger("click");
    expect(wrapper.get('[data-testid="create-file-dialog"]').exists()).toBe(true);
    expect((wrapper.get('[data-testid="create-file-input"]').element as HTMLInputElement).value).toBe("新建文档.md");
    await wrapper.get('[data-testid="create-file-confirm"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/file",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          space: "library",
          parentPath: "/",
          name: "新建文档.md",
          content: "",
        }),
      }),
    );
    expect(wrapper.get('[data-testid="file-editor-dialog"]').text()).toContain("新建文档.md");
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe("");
  });

  it("does not open the editor when a stale create-file response returns after class switching", async () => {
    const createFileDeferred = createDeferred<ReturnType<typeof okJson>>();
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/classes") {
        return okJson({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" },
          ],
        });
      }
      if (isClassFilesRequest(input, 1)) {
        return okJson({
          space: "class",
          classId: 1,
          currentPath: "/",
          items: [],
        });
      }
      if (isClassFilesRequest(input, 2)) {
        return okJson({
          space: "class",
          classId: 2,
          currentPath: "/",
          items: [],
        });
      }
      if (input === "/api/files/file" && init?.method === "POST") {
        return createFileDeferred.promise;
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/classes/:classId", component: FilesView }],
    });
    await router.push("/files/classes/1");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="create-file-button"]').trigger("click");
    await wrapper.get('[data-testid="create-file-confirm"]').trigger("click");
    await flushPromises();

    await router.push("/files/classes/2");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/files/classes/2");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(false);

    const resolveCreateFile = createFileDeferred.resolve;
    if (!resolveCreateFile) {
      throw new Error("createFileDeferred.resolve is not ready");
    }
    resolveCreateFile(okJson({
      item: {
        id: 933,
        name: "新建文档.md",
        path: "/新建文档.md",
        kind: "file",
        size: 0,
        mimeType: "text/markdown",
        downloadUrl: "/api/files/933/download",
        archiveUrl: "",
        previewUrl: "/api/files/933/preview",
        updatedAt: "2026-04-26T10:00:00.000Z",
      },
      content: "",
    }));
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/files/classes/2");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(false);
  });

  it("confirms before creating a new file when the current editor has unsaved content", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.startsWith("/api/files?space=library")) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 934,
              name: "原始文档.md",
              path: "/原始文档.md",
              kind: "file",
              size: 10,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/934/download",
              archiveUrl: "",
              previewUrl: "/api/files/934/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/934/content" && !init?.method) {
        return okJson({
          item: {
            id: 934,
            name: "原始文档.md",
            path: "/原始文档.md",
            kind: "file",
            size: 10,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/934/download",
            archiveUrl: "",
            previewUrl: "/api/files/934/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 原始内容",
        });
      }
      if (input === "/api/files/file" && init?.method === "POST") {
        return okJson({
          item: {
            id: 935,
            name: "新建文档.md",
            path: "/新建文档.md",
            kind: "file",
            size: 0,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/935/download",
            archiveUrl: "",
            previewUrl: "/api/files/935/preview",
            updatedAt: "2026-04-26T10:01:00.000Z",
          },
          content: "",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-934"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");

    await wrapper.get('[data-testid="create-file-button"]').trigger("click");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-cancel"]').trigger("click");
    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/files/file",
      expect.objectContaining({ method: "POST" }),
    );
    expect(wrapper.get('[data-testid="file-editor-dialog"]').text()).toContain("原始文档.md");
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe("# 已修改");

    await wrapper.get('[data-testid="create-file-button"]').trigger("click");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-confirm"]').trigger("click");
    expect(wrapper.get('[data-testid="create-file-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="create-file-confirm"]').trigger("click");
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files/file",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          space: "library",
          parentPath: "/",
          name: "新建文档.md",
          content: "",
        }),
      }),
    );
    expect(wrapper.get('[data-testid="file-editor-dialog"]').text()).toContain("新建文档.md");
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe("");
  });

  it("switches markdown editor into preview mode", async () => {
    const markdownContent = "# 标题\n\n正文内容";
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (isLibraryFilesRequest(input)) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 909,
              name: "预览文档.md",
              path: "/预览文档.md",
              kind: "file",
              size: 18,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/909/download",
              archiveUrl: "",
              previewUrl: "/api/files/909/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/909/content" && !init?.method) {
        return okJson({
          item: {
            id: 909,
            name: "预览文档.md",
            path: "/预览文档.md",
            kind: "file",
            size: markdownContent.length,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/909/download",
            archiveUrl: "",
            previewUrl: "/api/files/909/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: markdownContent,
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-909"]').trigger("click");
    await flushPromises();

    await wrapper.get('[data-testid="file-editor-toggle-preview"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-editor-preview"]').text()).toContain("标题");
    expect(wrapper.get('[data-testid="file-editor-preview"]').text()).toContain("正文内容");
  });

  it("confirms before closing the editor with unsaved content", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (isLibraryFilesRequest(input)) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 910,
              name: "未保存文档.md",
              path: "/未保存文档.md",
              kind: "file",
              size: 18,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/910/download",
              archiveUrl: "",
              previewUrl: "/api/files/910/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/910/content" && !init?.method) {
        return okJson({
          item: {
            id: 910,
            name: "未保存文档.md",
            path: "/未保存文档.md",
            kind: "file",
            size: 18,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/910/download",
            archiveUrl: "",
            previewUrl: "/api/files/910/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 初稿",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-910"]').trigger("click");
    await flushPromises();

    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");
    await wrapper.get('[data-testid="file-editor-close"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);
  });

  it("keeps the editor open and disables close actions while saving", async () => {
    const saveResponseDeferred = createDeferred<ReturnType<typeof okJson>>();
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (isLibraryFilesRequest(input)) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 911,
              name: "保存中.md",
              path: "/保存中.md",
              kind: "file",
              size: 8,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/911/download",
              archiveUrl: "",
              previewUrl: "/api/files/911/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/911/content" && !init?.method) {
        return okJson({
          item: {
            id: 911,
            name: "保存中.md",
            path: "/保存中.md",
            kind: "file",
            size: 8,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/911/download",
            archiveUrl: "",
            previewUrl: "/api/files/911/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 初稿",
        });
      }
      if (input === "/api/files/911/content" && init?.method === "PUT") {
        return saveResponseDeferred.promise;
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-911"]').trigger("click");
    await flushPromises();

    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");
    await wrapper.get('[data-testid="file-editor-save"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-editor-close"]').attributes("disabled")).toBeDefined();
    const cancelButton = wrapper.findAll("button").find((item) => item.text() === "取消");
    expect(cancelButton?.attributes("disabled")).toBeDefined();

    await wrapper.get('[data-testid="file-editor-close"]').trigger("click");
    await wrapper.get('[data-testid="file-editor-dialog"]').trigger("click");
    if (cancelButton) {
      await cancelButton.trigger("click");
    }
    await flushPromises();

    expect(wrapper.find('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);

    saveResponseDeferred.resolve(okJson({
      item: {
        id: 911,
        name: "保存中.md",
        path: "/保存中.md",
        kind: "file",
        size: 12,
        mimeType: "text/markdown",
        downloadUrl: "/api/files/911/download",
        archiveUrl: "",
        previewUrl: "/api/files/911/preview",
        updatedAt: "2026-04-26T10:01:00.000Z",
      },
      content: "# 已修改",
    }));
    await flushPromises();
  });

  it("does not reopen the editor when a stale load response returns after class switching", async () => {
    const readDeferred = createDeferred<ReturnType<typeof okJson>>();
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/classes") {
        return okJson({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" },
          ],
        });
      }
      if (isClassFilesRequest(input, 1)) {
        return okJson({
          space: "class",
          classId: 1,
          currentPath: "/",
          items: [
            {
              id: 930,
              name: "班级一文档.md",
              path: "/班级一文档.md",
              kind: "file",
              size: 12,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/930/download",
              archiveUrl: "",
              previewUrl: "/api/files/930/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (isClassFilesRequest(input, 2)) {
        return okJson({
          space: "class",
          classId: 2,
          currentPath: "/",
          items: [],
        });
      }
      if (input === "/api/files/930/content" && !init?.method) {
        return readDeferred.promise;
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/classes/:classId", component: FilesView }],
    });
    await router.push("/files/classes/1");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-930"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);

    await router.push("/files/classes/2");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/files/classes/2");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(false);

    if (!readDeferred.resolve) {
      throw new Error("readDeferred.resolve is not ready");
    }
    const resolveRead = readDeferred.resolve;
    if (!resolveRead) {
      throw new Error("readDeferred.resolve is not ready");
    }
    resolveRead(okJson({
      item: {
        id: 930,
        name: "班级一文档.md",
        path: "/班级一文档.md",
        kind: "file",
        size: 12,
        mimeType: "text/markdown",
        downloadUrl: "/api/files/930/download",
        archiveUrl: "",
        previewUrl: "/api/files/930/preview",
        updatedAt: "2026-04-26T10:00:00.000Z",
      },
      content: "# 班级一内容",
    }));
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/files/classes/2");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(false);
  });

  it("does not overwrite the current editor when a stale save response returns after the editor context changes", async () => {
    const saveDeferred = createDeferred<ReturnType<typeof okJson>>();
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (isLibraryFilesRequest(input)) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 931,
              name: "原始文档.md",
              path: "/原始文档.md",
              kind: "file",
              size: 10,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/931/download",
              archiveUrl: "",
              previewUrl: "/api/files/931/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
            {
              id: 932,
              name: "当前文档.md",
              path: "/当前文档.md",
              kind: "file",
              size: 10,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/932/download",
              archiveUrl: "",
              previewUrl: "/api/files/932/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/931/content" && !init?.method) {
        return okJson({
          item: {
            id: 931,
            name: "原始文档.md",
            path: "/原始文档.md",
            kind: "file",
            size: 10,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/931/download",
            archiveUrl: "",
            previewUrl: "/api/files/931/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 原始内容",
        });
      }
      if (input === "/api/files/931/content" && init?.method === "PUT") {
        return saveDeferred.promise;
      }
      if (input === "/api/files/932/content" && !init?.method) {
        return okJson({
          item: {
            id: 932,
            name: "当前文档.md",
            path: "/当前文档.md",
            kind: "file",
            size: 10,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/932/download",
            archiveUrl: "",
            previewUrl: "/api/files/932/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 当前内容",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-931"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已保存中的旧内容");
    await wrapper.get('[data-testid="file-editor-save"]').trigger("click");
    await flushPromises();

    await wrapper.get('[data-testid="edit-entry-932"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-editor-dialog"]').text()).toContain("当前文档.md");
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe("# 当前内容");

    if (!saveDeferred.resolve) {
      throw new Error("saveDeferred.resolve is not ready");
    }
    const resolveDeferredSave = saveDeferred.resolve;
    if (!resolveDeferredSave) {
      throw new Error("saveDeferred.resolve is not ready");
    }
    resolveDeferredSave(okJson({
      item: {
        id: 931,
        name: "原始文档.md",
        path: "/原始文档.md",
        kind: "file",
        size: 12,
        mimeType: "text/markdown",
        downloadUrl: "/api/files/931/download",
        archiveUrl: "",
        previewUrl: "/api/files/931/preview",
        updatedAt: "2026-04-26T10:01:00.000Z",
      },
      content: "# 已保存中的旧内容",
    }));
    await flushPromises();

    expect(wrapper.get('[data-testid="file-editor-dialog"]').text()).toContain("当前文档.md");
    expect((wrapper.get('[data-testid="file-editor-textarea"]').element as HTMLTextAreaElement).value).toBe("# 当前内容");
  });

  it("confirms before internal navigation paths discard unsaved editor content", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input.startsWith("/api/files?space=library")) {
        return okJson({
          space: "library",
          currentPath: "/课程/课件",
          items: [
            {
              id: 912,
              name: "课件.md",
              path: "/课程/课件/课件.md",
              kind: "file",
              size: 9,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/912/download",
              archiveUrl: "",
              previewUrl: "/api/files/912/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
            {
              id: 913,
              name: "子目录",
              path: "/课程/课件/子目录",
              kind: "dir",
              size: 0,
              mimeType: "",
              downloadUrl: "",
              archiveUrl: "/api/files/913/archive",
              previewUrl: "",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/912/content" && !init?.method) {
        return okJson({
          item: {
            id: 912,
            name: "课件.md",
            path: "/课程/课件/课件.md",
            kind: "file",
            size: 9,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/912/download",
            archiveUrl: "",
            previewUrl: "/api/files/912/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 初稿",
        });
      }
      if (input === "/api/files/912/preview" && !init?.method) {
        return {
          ok: true,
          status: 200,
          text: async () => "# 初稿",
        };
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?path=%2F%E8%AF%BE%E7%A8%8B%2F%E8%AF%BE%E4%BB%B6");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-912"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");

    await wrapper.get('[data-testid="entry-open-913"]').trigger("click");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-cancel"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBe("/课程/课件");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);

    await wrapper.get('[data-testid="breadcrumb-课程"]').trigger("click");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-cancel"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBe("/课程/课件");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);

    await wrapper.get('[data-testid="preview-entry-912"]').trigger("click");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-cancel"]').trigger("click");
    await flushPromises();
    expect(wrapper.find('[data-testid="file-preview-dialog"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);

  });

  it("keeps current class and editor open when class switch confirmation is canceled", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/classes") {
        return okJson({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" },
          ],
        });
      }
      if (isClassFilesRequest(input, 1)) {
        return okJson({
          space: "class",
          classId: 1,
          currentPath: "/",
          items: [
            {
              id: 920,
              name: "班级文档.md",
              path: "/班级文档.md",
              kind: "file",
              size: 9,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/920/download",
              archiveUrl: "",
              previewUrl: "/api/files/920/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/920/content" && !init?.method) {
        return okJson({
          item: {
            id: 920,
            name: "班级文档.md",
            path: "/班级文档.md",
            kind: "file",
            size: 9,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/920/download",
            archiveUrl: "",
            previewUrl: "/api/files/920/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 初稿",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/classes/:classId", component: FilesView }],
    });
    await router.push("/files/classes/1");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-920"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");

    await router.push("/files/classes/2");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-cancel"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/files/classes/1");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);
  });

  it("switches class and closes the editor when class switch confirmation is accepted", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/classes") {
        return okJson({
          classes: [
            { id: 1, name: "一年级一班" },
            { id: 2, name: "一年级二班" },
          ],
        });
      }
      if (isClassFilesRequest(input, 1)) {
        return okJson({
          space: "class",
          classId: 1,
          currentPath: "/",
          items: [
            {
              id: 921,
              name: "班级文档.md",
              path: "/班级文档.md",
              kind: "file",
              size: 9,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/921/download",
              archiveUrl: "",
              previewUrl: "/api/files/921/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (isClassFilesRequest(input, 2)) {
        return okJson({
          space: "class",
          classId: 2,
          currentPath: "/",
          items: [],
        });
      }
      if (input === "/api/files/921/content" && !init?.method) {
        return okJson({
          item: {
            id: 921,
            name: "班级文档.md",
            path: "/班级文档.md",
            kind: "file",
            size: 9,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/921/download",
            archiveUrl: "",
            previewUrl: "/api/files/921/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 初稿",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/classes/:classId", component: FilesView }],
    });
    await router.push("/files/classes/1");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
        provide: {
          [matchedRouteKey as symbol]: computed(() => router.currentRoute.value.matched[0]),
        },
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-921"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");

    await router.push("/files/classes/2");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-confirm"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/files/classes/2");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(false);
  });

  it("stays on the files page when leaving to another route is canceled", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (isLibraryFilesRequest(input)) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 922,
              name: "离开确认.md",
              path: "/离开确认.md",
              kind: "file",
              size: 9,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/922/download",
              archiveUrl: "",
              previewUrl: "/api/files/922/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/922/content" && !init?.method) {
        return okJson({
          item: {
            id: 922,
            name: "离开确认.md",
            path: "/离开确认.md",
            kind: "file",
            size: 9,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/922/download",
            archiveUrl: "",
            previewUrl: "/api/files/922/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 初稿",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/files/library", component: FilesView },
        { path: "/settings", component: { template: "<div data-testid='settings-page'>settings</div>" } },
      ],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount({ template: "<router-view />" }, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-922"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");

    await router.push("/settings");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-cancel"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/files/library");
    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);
  });

  it("allows leaving the files page when the leave confirmation is accepted", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (isLibraryFilesRequest(input)) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 923,
              name: "离开确认.md",
              path: "/离开确认.md",
              kind: "file",
              size: 9,
              mimeType: "text/markdown",
              downloadUrl: "/api/files/923/download",
              archiveUrl: "",
              previewUrl: "/api/files/923/preview",
              updatedAt: "2026-04-26T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/923/content" && !init?.method) {
        return okJson({
          item: {
            id: 923,
            name: "离开确认.md",
            path: "/离开确认.md",
            kind: "file",
            size: 9,
            mimeType: "text/markdown",
            downloadUrl: "/api/files/923/download",
            archiveUrl: "",
            previewUrl: "/api/files/923/preview",
            updatedAt: "2026-04-26T10:00:00.000Z",
          },
          content: "# 初稿",
        });
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/files/library", component: FilesView },
        { path: "/settings", component: { template: "<div data-testid='settings-page'>settings</div>" } },
      ],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount({ template: "<router-view />" }, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-923"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="file-editor-textarea"]').setValue("# 已修改");

    await router.push("/settings");
    expect(wrapper.get('[data-testid="file-editor-unsaved-dialog"]').exists()).toBe(true);
    await wrapper.get('[data-testid="file-editor-unsaved-confirm"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/settings");
    expect(wrapper.find('[data-testid="settings-page"]').exists()).toBe(true);
  });

  it("shows editor load errors when reading text content fails", async () => {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
      if (isLibraryFilesRequest(input)) {
        return okJson({
          space: "library",
          currentPath: "/",
          items: [
            {
              id: 907,
              name: "课程记录.txt",
              path: "/课程记录.txt",
              kind: "file",
              size: 9,
              mimeType: "text/plain",
              downloadUrl: "/api/files/907/download",
              archiveUrl: "",
              previewUrl: "/api/files/907/preview",
              updatedAt: "2026-04-22T10:00:00.000Z",
            },
          ],
        });
      }
      if (input === "/api/files/907/content" && !init?.method) {
        return {
          ok: false,
          status: 422,
          json: async () => ({
            error: {
              code: "invalid_request",
              message: "当前文件不支持在线编辑",
            },
          }),
        };
      }
      throw new Error(`unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="edit-entry-907"]').trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="file-editor-dialog"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="file-editor-error"]').text()).toContain("当前文件不支持在线编辑");
  });

  it("keeps overflow actions focused on file operations after legacy entry removal", async () => {
    vi.spyOn(api, "files").mockResolvedValue({
      space: "library",
      currentPath: "/",
      items: [
        {
          id: 1300,
          name: "课堂讲义.pdf",
          path: "/课堂讲义.pdf",
          kind: "file",
          size: 2048,
          mimeType: "application/pdf",
          downloadUrl: "/api/files/1300/download",
          archiveUrl: "/api/files/1300/archive",
          previewUrl: "/api/files/1300/preview",
          updatedAt: "2026-04-28T08:00:00Z",
        },
      ],
    });
    vi.spyOn(api, "classes").mockResolvedValue({ classes: [] });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/files/library", component: FilesView }],
    });
    await router.push("/files/library?view=list");
    await router.isReady();

    const wrapper = mount(FilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();
    await wrapper.get('[data-testid="row-more-actions-1300"]').trigger("click");

    const actionMenu = wrapper.get('[data-testid="row-secondary-actions-1300"]');
    expect(actionMenu.text()).toContain("复制");
    expect(actionMenu.text()).toContain("移动");
    expect(actionMenu.text()).toContain("分享");
    expect(actionMenu.text()).toContain("重命名");
    expect(actionMenu.text()).toContain("删除");
  });
});
