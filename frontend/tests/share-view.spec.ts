import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { createPinia } from "pinia";
import { api } from "@/api/client";
import ShareView from "@/views/ShareView.vue";

describe("ShareView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows access code input when share requires it", async () => {
    vi.spyOn(api, "shareInfo").mockResolvedValue({
      info: {
        entryId: 100,
        entryName: "课堂资料.pdf",
        entryKind: "file",
        permission: "view",
        requiresAccessCode: true,
        expiresAt: "",
        status: "active",
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/share/:token", component: ShareView }],
    });
    await router.push("/share/tok-abc123");
    await router.isReady();

    const wrapper = mount(ShareView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("访问分享");
    expect(wrapper.text()).toContain("课堂资料.pdf");
    expect(wrapper.text()).toContain("仅查看");
    expect(wrapper.find('[data-testid="share-access-code-input"]').exists()).toBe(true);
  });

  it("verifies access code and shows file preview for file share", async () => {
    vi.spyOn(api, "shareInfo").mockResolvedValue({
      info: {
        entryId: 200,
        entryName: "讲义.pdf",
        entryKind: "file",
        permission: "download",
        requiresAccessCode: true,
        expiresAt: "",
        status: "active",
      },
    });

    const verifySpy = vi.spyOn(api, "verifyShareAccessCode").mockResolvedValue({ ok: true });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/share/:token", component: ShareView }],
    });
    await router.push("/share/tok-xyz789");
    await router.isReady();

    const wrapper = mount(ShareView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="share-access-code-input"]').setValue("ABC123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(verifySpy).toHaveBeenCalledWith("tok-xyz789", "ABC123");
    expect(wrapper.text()).toContain("讲义.pdf");
    expect(wrapper.text()).toContain("允许下载");
    expect(wrapper.find('[data-testid="share-file-preview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="share-file-download"]').exists()).toBe(true);
  });

  it("shows download button only when permission is download", async () => {
    vi.spyOn(api, "shareInfo").mockResolvedValue({
      info: {
        entryId: 300,
        entryName: "只读文档.pdf",
        entryKind: "file",
        permission: "view",
        requiresAccessCode: false,
        expiresAt: "",
        status: "active",
      },
    });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/share/:token", component: ShareView }],
    });
    await router.push("/share/tok-view123");
    await router.isReady();

    const wrapper = mount(ShareView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="share-file-preview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="share-file-download"]').exists()).toBe(false);
  });

  it("browses directory share and navigates subdirectories", async () => {
    vi.spyOn(api, "shareInfo").mockResolvedValue({
      info: {
        entryId: 400,
        entryName: "课程资料",
        entryKind: "dir",
        permission: "download",
        requiresAccessCode: false,
        expiresAt: "",
        status: "active",
      },
    });

    const browseSpy = vi.spyOn(api, "shareBrowse")
      .mockResolvedValueOnce({
        path: "",
        items: [
          {
            id: 401,
            name: "第一章",
            kind: "dir",
            size: 0,
            mimeType: "",
            updatedAt: "2026-06-10T00:00:00Z",
            previewUrl: "",
            downloadUrl: "",
            archiveUrl: "/api/share/tok-dir456/files/401/archive",
          },
          {
            id: 402,
            name: "说明.txt",
            kind: "file",
            size: 1024,
            mimeType: "text/plain",
            updatedAt: "2026-06-11T00:00:00Z",
            previewUrl: "/api/share/tok-dir456/files/402/preview",
            downloadUrl: "/api/share/tok-dir456/files/402/download",
            archiveUrl: "",
          },
        ],
      })
      .mockResolvedValueOnce({
        path: "/第一章",
        items: [
          {
            id: 403,
            name: "内容.pdf",
            kind: "file",
            size: 2048,
            mimeType: "application/pdf",
            updatedAt: "2026-06-12T00:00:00Z",
            previewUrl: "/api/share/tok-dir456/files/403/preview",
            downloadUrl: "/api/share/tok-dir456/files/403/download",
            archiveUrl: "",
          },
        ],
      });

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/share/:token", component: ShareView }],
    });
    await router.push("/share/tok-dir456");
    await router.isReady();

    const wrapper = mount(ShareView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="share-items-table"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("第一章");
    expect(wrapper.text()).toContain("说明.txt");
    expect(wrapper.find('[data-testid="share-download-402"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="share-archive-401"]').exists()).toBe(true);

    await wrapper.get('[data-testid="share-open-401"]').trigger("click");
    await flushPromises();

    expect(browseSpy).toHaveBeenCalledWith("tok-dir456", "/第一章");
    expect(wrapper.text()).toContain("内容.pdf");
  });

  it("shows error when access code is incorrect", async () => {
    vi.spyOn(api, "shareInfo").mockResolvedValue({
      info: {
        entryId: 500,
        entryName: "私密文档.pdf",
        entryKind: "file",
        permission: "view",
        requiresAccessCode: true,
        expiresAt: "",
        status: "active",
      },
    });

    vi.spyOn(api, "verifyShareAccessCode").mockRejectedValue(new Error("安全码错误"));

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/share/:token", component: ShareView }],
    });
    await router.push("/share/tok-fail999");
    await router.isReady();

    const wrapper = mount(ShareView, {
      global: {
        plugins: [createPinia(), router],
      },
    });

    await flushPromises();

    await wrapper.get('[data-testid="share-access-code-input"]').setValue("WRONG");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("安全码");
  });
});
