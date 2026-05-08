import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import ResourceList from "@/components/ResourceList.vue";

describe("ResourceList", () => {
  it("renders linked resources, metadata, and per-item actions", () => {
    const wrapper = mount(ResourceList, {
      props: {
        items: [
          {
            id: 101,
            name: "习题答案.pdf",
            href: "/download/101",
            meta: "12345 字节",
          },
        ],
        emptyMessage: "暂无资源",
        testId: "teacher-resource-list",
        itemTestIdPrefix: "teacher-resource-row",
        linkTestIdPrefix: "teacher-resource-download",
      },
      slots: {
        "item-actions": ({ item }: { item: { id: number } }) =>
          h("button", { type: "button", "data-testid": `teacher-resource-delete-${item.id}` }, "删除"),
      },
    });

    expect(wrapper.get('[data-testid="teacher-resource-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="teacher-resource-row-101"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="teacher-resource-download-101"]').attributes("href")).toBe("/download/101");
    expect(wrapper.text()).toContain("12345 字节");
    expect(wrapper.get('[data-testid="teacher-resource-delete-101"]').text()).toBe("删除");
  });

  it("renders plain directory rows and fallback states", () => {
    const rowWrapper = mount(ResourceList, {
      props: {
        items: [
          {
            id: 201,
            name: "讲义.pdf",
            meta: "文件 · 2048 字节",
          },
        ],
        emptyMessage: "当前目录为空。",
        variant: "rows",
        testId: "public-directory-list",
        itemTestIdPrefix: "public-directory-row",
      },
    });

    expect(rowWrapper.get('[data-testid="public-directory-list"]').exists()).toBe(true);
    expect(rowWrapper.get('[data-testid="public-directory-row-201"]').text()).toContain("讲义.pdf");
    expect(rowWrapper.text()).toContain("文件 · 2048 字节");
    expect(rowWrapper.find("a").exists()).toBe(false);

    const loadingWrapper = mount(ResourceList, {
      props: {
        items: [],
        loading: true,
        loadingMessage: "正在加载资源...",
        emptyMessage: "暂无资源",
        testId: "loading-resource-list",
      },
    });
    expect(loadingWrapper.text()).toContain("正在加载资源...");

    const emptyWrapper = mount(ResourceList, {
      props: {
        items: [],
        emptyMessage: "暂无资源",
        testId: "empty-resource-list",
      },
    });
    expect(emptyWrapper.text()).toContain("暂无资源");
  });

  it("renders button items as primary actions", async () => {
    const onSelect = vi.fn();
    const wrapper = mount(ResourceList, {
      props: {
        items: [
          {
            id: "root",
            name: "根目录",
            onClick: onSelect,
          },
        ],
        emptyMessage: "暂无资源",
        testId: "recent-target-list",
        itemTestIdPrefix: "recent-target-row",
        linkTestIdPrefix: "recent-target-button",
      },
    });

    await wrapper.get('[data-testid="recent-target-button-root"]').trigger("click");

    expect(wrapper.get('[data-testid="recent-target-row-root"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="recent-target-button-root"]').element.tagName).toBe("BUTTON");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
