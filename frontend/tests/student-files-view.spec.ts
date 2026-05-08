import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import StudentFilesView from "@/views/StudentFilesView.vue";

function okJson(payload: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  };
}

describe("StudentFilesView", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.unstubAllGlobals();
  });

  it("renders public and class files as read-only resources", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/student/files?")) {
        const searchParams = new URL(input, "http://localhost").searchParams;
        if (searchParams.get("path") === "/课堂资料") {
          return okJson({
            space: "public",
            currentPath: "/课堂资料",
            items: [
              {
                id: 104,
                space: "public",
                parentPath: "/课堂资料",
                path: "/课堂资料/阅读材料.txt",
                name: "阅读材料.txt",
                kind: "file",
                mimeType: "text/plain",
                size: 18,
                downloadUrl: "/api/student/files/104/download",
                archiveUrl: "/api/student/files/104/archive",
                previewUrl: "/api/student/files/104/preview",
                updatedAt: "2026-05-01T08:30:00Z",
              },
            ],
            pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
          });
        }
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 101,
              space: "public",
              parentPath: "/",
              path: "/通知.txt",
              name: "通知.txt",
              kind: "file",
              mimeType: "text/plain",
              size: 18,
              downloadUrl: "/api/student/files/101/download",
              archiveUrl: "/api/student/files/101/archive",
              previewUrl: "/api/student/files/101/preview",
              updatedAt: "2026-05-01T08:00:00Z",
            },
            {
              id: 103,
              space: "public",
              parentPath: "/",
              path: "/讲义.docx",
              name: "讲义.docx",
              kind: "file",
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              size: 4096,
              downloadUrl: "/api/student/files/103/download",
              archiveUrl: "/api/student/files/103/archive",
              previewUrl: "/api/student/files/103/preview",
              updatedAt: "2026-05-01T08:20:00Z",
            },
            {
              id: 102,
              space: "public",
              parentPath: "/",
              path: "/课堂资料",
              name: "课堂资料",
              kind: "dir",
              mimeType: "",
              size: 0,
              downloadUrl: "/api/student/files/102/download",
              archiveUrl: "/api/student/files/102/archive",
              previewUrl: "/api/student/files/102/preview",
              updatedAt: "2026-05-01T08:10:00Z",
            },
          ],
          pagination: {
            page: 1,
            pageSize: 50,
            total: 3,
            totalPages: 1,
          },
        });
      }
      if (input === "/api/student/files/101/preview") {
        return {
          ok: true,
          status: 200,
          text: async () => "课堂通知内容",
        };
      }
      if (input === "/api/student/files/104/download") {
        return {
          ok: true,
          status: 200,
          blob: async () => new Blob(["阅读材料正文"]),
        };
      }
      throw new Error(`unexpected request ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/student/files/public",
          name: "student-files-public",
          component: StudentFilesView,
        },
      ],
    });
    await router.push("/student/files/public");
    await router.isReady();

    const wrapper = mount(StudentFilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find(".classes-page__header").exists()).toBe(false);
    expect(wrapper.find(".classes-page__eyebrow").exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-files-workspace"]').exists()).toBe(true);
    expect(wrapper.find(".files-toolbar").exists()).toBe(true);
    expect(wrapper.get('[data-testid="student-files-up-button"]').attributes("disabled")).toBeDefined();
    expect(wrapper.find('[data-testid="student-files-refresh"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="student-files-grid"]').text()).toContain("通知.txt");
    expect(wrapper.get('[data-testid="student-files-view-grid"]').classes()).toContain("button--primary");
    await wrapper.get('[data-testid="student-file-preview-101"]').trigger("click");
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledWith("/api/student/files/101/preview", expect.objectContaining({ credentials: "same-origin" }));
    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("通知.txt");
    expect(wrapper.get('[data-testid="file-preview-text"]').text()).toContain("课堂通知内容");
    await wrapper.get('[data-testid="file-preview-close"]').trigger("click");
    await wrapper.get('[data-testid="student-file-preview-103"]').trigger("click");
    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("讲义.docx");
    expect(wrapper.get('[data-testid="file-preview-external"]').text()).toContain("该文件不支持预览");
    expect(wrapper.get('[data-testid="student-file-download-101"]').attributes("href")).toBe("/api/student/files/101/download");
    expect(wrapper.get('[data-testid="student-file-enter-102"]').text()).toContain("进入");
    const folderDownload = wrapper.get('[data-testid="student-file-download-102"]');
    expect(folderDownload.text()).toBe("下载压缩包");
    expect(folderDownload.element.tagName).toBe("A");
    expect(folderDownload.attributes("href")).toBe("/api/student/files/102/archive");
    expect(wrapper.get('[data-testid="student-files-pagination-summary"]').text()).toContain("共 3 条");
    expect(wrapper.html().indexOf('data-testid="student-files-pagination-summary"')).toBeLessThan(
      wrapper.html().indexOf('data-testid="student-files-grid"'),
    );
    expect(wrapper.text()).not.toContain("老师资料");
    expect(wrapper.text()).not.toContain("上传");
    expect(wrapper.text()).not.toContain("编辑");
    expect(wrapper.text()).not.toContain("重命名");
    expect(wrapper.text()).not.toContain("移动");
    expect(wrapper.text()).not.toContain("复制");
    expect(wrapper.text()).not.toContain("删除");
    expect(fetchMock).toHaveBeenCalledWith("/api/student/files?space=public&path=%2F&page=1&pageSize=30", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("opens entries from student file rows while keeping row actions scoped", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/student/files?")) {
        const searchParams = new URL(input, "http://localhost").searchParams;
        const path = searchParams.get("path") ?? "/";
        if (path === "/课堂资料") {
          return okJson({
            space: "public",
            currentPath: "/课堂资料",
            items: [],
            pagination: { page: 1, pageSize: 30, total: 0, totalPages: 1 },
          });
        }
        return okJson({
          space: "public",
          currentPath: "/",
          items: [
            {
              id: 101,
              space: "public",
              parentPath: "/",
              path: "/通知.txt",
              name: "通知.txt",
              kind: "file",
              mimeType: "text/plain",
              size: 18,
              downloadUrl: "/api/student/files/101/download",
              archiveUrl: "/api/student/files/101/archive",
              previewUrl: "/api/student/files/101/preview",
              updatedAt: "2026-05-01T08:00:00Z",
            },
            {
              id: 102,
              space: "public",
              parentPath: "/",
              path: "/课堂资料",
              name: "课堂资料",
              kind: "dir",
              mimeType: "",
              size: 0,
              downloadUrl: "/api/student/files/102/download",
              archiveUrl: "/api/student/files/102/archive",
              previewUrl: "",
              updatedAt: "2026-05-01T08:10:00Z",
            },
          ],
          pagination: { page: 1, pageSize: 30, total: 2, totalPages: 1 },
        });
      }
      if (input === "/api/student/files/101/preview") {
        return {
          ok: true,
          status: 200,
          text: async () => "课堂通知内容",
        };
      }
      throw new Error(`unexpected request ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/student/files/public",
          name: "student-files-public",
          component: StudentFilesView,
        },
      ],
    });
    await router.push("/student/files/public?view=list");
    await router.isReady();

    const wrapper = mount(StudentFilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    const folderDownload = wrapper.get('[data-testid="student-file-download-102"]');
    folderDownload.element.addEventListener("click", (event) => event.preventDefault());
    await folderDownload.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBeUndefined();

    await wrapper.get('[data-testid="student-file-row-101"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("通知.txt");
    expect(wrapper.get('[data-testid="file-preview-text"]').text()).toContain("课堂通知内容");

    await wrapper.get('[data-testid="file-preview-close"]').trigger("click");
    await flushPromises();
    await wrapper.get('[data-testid="student-file-row-102"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.path).toBe("/课堂资料");
  });

  it("keeps student file pagination above the list and requests the selected page", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      const page = Number(url.searchParams.get("page") ?? "1");
      return okJson({
        space: "public",
        currentPath: "/",
        items: [
          {
            id: page === 1 ? 401 : 402,
            space: "public",
            parentPath: "/",
            path: page === 1 ? "/第一页.txt" : "/第二页.txt",
            name: page === 1 ? "第一页.txt" : "第二页.txt",
            kind: "file",
            mimeType: "text/plain",
            size: 12,
            downloadUrl: page === 1 ? "/api/student/files/401/download" : "/api/student/files/402/download",
            archiveUrl: page === 1 ? "/api/student/files/401/archive" : "/api/student/files/402/archive",
            previewUrl: page === 1 ? "/api/student/files/401/preview" : "/api/student/files/402/preview",
            updatedAt: "2026-05-01T08:00:00Z",
          },
        ],
        pagination: {
          page,
          pageSize: 1,
          total: 2,
          totalPages: 2,
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/student/files/public",
          name: "student-files-public",
          component: StudentFilesView,
        },
      ],
    });
    await router.push("/student/files/public?pageSize=1");
    await router.isReady();

    const wrapper = mount(StudentFilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="student-files-pagination-summary"]').text()).toContain("第 1 / 2 页 · 共 2 条");
    expect(wrapper.html().indexOf('data-testid="student-files-pagination-summary"')).toBeLessThan(
      wrapper.html().indexOf('data-testid="student-files-grid"'),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/student/files?space=public&path=%2F&page=1&pageSize=1", expect.objectContaining({ credentials: "same-origin" }));

    await wrapper.get('[data-testid="student-files-page-next"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.page).toBe("2");
    expect(wrapper.get('[data-testid="student-files-grid"]').text()).toContain("第二页.txt");
    expect(fetchMock).toHaveBeenCalledWith("/api/student/files?space=public&path=%2F&page=2&pageSize=1", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("offers search and list-grid view controls for read-only student files", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(input, "http://localhost");
      const keyword = url.searchParams.get("q") ?? "";
      return okJson({
        space: "public",
        currentPath: "/",
        items: [
          {
            id: keyword ? 202 : 201,
            space: "public",
            parentPath: "/",
            path: keyword ? "/通知精选.txt" : "/公共相册",
            name: keyword ? "通知精选.txt" : "公共相册",
            kind: keyword ? "file" : "dir",
            mimeType: keyword ? "text/plain" : "",
            size: keyword ? 24 : 0,
            downloadUrl: keyword ? "/api/student/files/202/download" : "/api/student/files/201/download",
            archiveUrl: keyword ? "/api/student/files/202/archive" : "/api/student/files/201/archive",
            previewUrl: keyword ? "/api/student/files/202/preview" : "/api/student/files/201/preview",
            updatedAt: "2026-05-01T08:00:00Z",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 50,
          total: 1,
          totalPages: 1,
        },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/student/files/public",
          name: "student-files-public",
          component: StudentFilesView,
        },
      ],
    });
    await router.push("/student/files/public");
    await router.isReady();

    const wrapper = mount(StudentFilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="student-files-search-input"]').exists()).toBe(true);
    expect(wrapper.find(".classes-page__header").exists()).toBe(false);
    expect(wrapper.find(".classes-page__eyebrow").exists()).toBe(false);
    expect(wrapper.find('[data-testid="student-files-up-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="student-files-refresh"]').exists()).toBe(true);
    const toolbarBottom = wrapper.get(".files-toolbar__bottom");
    const primaryActions = wrapper.get('[data-testid="student-files-primary-actions"]');
    const secondaryControls = wrapper.get('[data-testid="student-files-secondary-controls"]');
    expect(toolbarBottom.element.contains(primaryActions.element)).toBe(true);
    expect(toolbarBottom.element.contains(secondaryControls.element)).toBe(true);
    expect(primaryActions.element.compareDocumentPosition(secondaryControls.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(secondaryControls.find(".files-controls__options").exists()).toBe(true);
    expect(secondaryControls.classes()).toContain("files-secondary-controls--right");
    expect(wrapper.get('[data-testid="student-files-view-grid"]').classes()).toContain("button--primary");
    expect(wrapper.get('[data-testid="student-files-view-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="student-files-grid"]').text()).toContain("公共相册");
    expect(wrapper.text()).not.toContain("上传");
    expect(wrapper.text()).not.toContain("新建");
    expect(wrapper.text()).not.toContain("删除");

    await wrapper.get('[data-testid="student-files-view-list"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.view).toBe("list");
    expect(wrapper.get('[data-testid="student-files-table"]').text()).toContain("公共相册");
    await wrapper.get('[data-testid="student-files-view-grid"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.view).toBeUndefined();
    expect(wrapper.get('[data-testid="student-files-grid"]').text()).toContain("公共相册");
    expect(wrapper.get('[data-testid="student-files-grid-size-controls"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="student-files-grid"]').classes()).toContain("student-files-page__grid--medium");
    await wrapper.get('[data-testid="student-file-card-201"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.path).toBe("/公共相册");
    await wrapper.get('[data-testid="student-files-grid-size-small"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.gridSize).toBe("small");
    expect(wrapper.get('[data-testid="student-files-grid"]').classes()).toContain("student-files-page__grid--small");

    await wrapper.get('[data-testid="student-files-search-input"]').setValue("通知");
    await wrapper.get('[data-testid="student-files-search-submit"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.query.q).toBe("通知");
    expect(wrapper.get('[data-testid="student-files-search-summary"]').text()).toContain("关键词：通知");
    expect(wrapper.get('[data-testid="student-files-grid"]').text()).toContain("通知精选.txt");
    const requestedUrls = fetchMock.mock.calls.map(([input]) => new URL(String(input), "http://localhost"));
    expect(requestedUrls.some((url) => url.searchParams.get("q") === "通知")).toBe(true);

    await wrapper.get('[data-testid="student-files-search-clear"]').trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.query.q).toBeUndefined();
  });

  it("keeps grid file cards compact and supports preview next or previous navigation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      okJson({
        space: "public",
        currentPath: "/效果示例",
        items: [
          {
            id: 301,
            space: "public",
            parentPath: "/效果示例",
            path: "/效果示例/任务1.jpg",
            name: "任务1.jpg",
            kind: "file",
            mimeType: "image/jpeg",
            size: 2048,
            downloadUrl: "/api/student/files/301/download",
            archiveUrl: "/api/student/files/301/archive",
            previewUrl: "/api/student/files/301/preview",
            updatedAt: "2026-05-01T08:00:00Z",
          },
          {
            id: 302,
            space: "public",
            parentPath: "/效果示例",
            path: "/效果示例/任务2.jpg",
            name: "任务2.jpg",
            kind: "file",
            mimeType: "image/jpeg",
            size: 4096,
            downloadUrl: "/api/student/files/302/download",
            archiveUrl: "/api/student/files/302/archive",
            previewUrl: "/api/student/files/302/preview",
            updatedAt: "2026-05-01T08:10:00Z",
          },
        ],
      }),
    ));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/student/files/public",
          name: "student-files-public",
          component: StudentFilesView,
        },
      ],
    });
    await router.push("/student/files/public?path=%2F%E6%95%88%E6%9E%9C%E7%A4%BA%E4%BE%8B&gridSize=small&view=grid");
    await router.isReady();

    const wrapper = mount(StudentFilesView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="student-files-grid"]').classes()).toContain("student-files-page__grid--small");
    expect(wrapper.get('[data-testid="student-file-card-301"]').text()).toContain("任务1.jpg");
    expect(wrapper.get('[data-testid="student-file-card-301"]').text()).toContain("2.0 KB");

    await wrapper.get('[data-testid="student-file-card-301"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("任务1.jpg");
    expect(wrapper.get('[data-testid="file-preview-next"]').attributes("disabled")).toBeUndefined();

    await wrapper.get('[data-testid="file-preview-next"]').trigger("click");
    await flushPromises();

    expect(wrapper.get('[data-testid="file-preview-dialog"]').text()).toContain("任务2.jpg");
    expect(wrapper.get('[data-testid="file-preview-previous"]').attributes("disabled")).toBeUndefined();
  });
});
