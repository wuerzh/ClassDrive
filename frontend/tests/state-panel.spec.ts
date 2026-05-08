import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import StatePanel from "@/components/StatePanel.vue";

describe("StatePanel", () => {
  it("renders muted loading and empty states, and error tone when requested", () => {
    const loadingWrapper = mount(StatePanel, {
      props: {
        message: "正在加载作业...",
        tone: "info",
        testId: "loading-state",
      },
    });
    expect(loadingWrapper.text()).toContain("正在加载作业...");
    expect(loadingWrapper.find('[data-testid="loading-state"]').exists()).toBe(true);
    expect(loadingWrapper.find(".muted").exists()).toBe(true);

    const errorWrapper = mount(StatePanel, {
      props: {
        title: "未找到该作业",
        message: "请返回列表重新选择。",
        tone: "error",
        testId: "error-state",
      },
    });
    expect(errorWrapper.text()).toContain("未找到该作业");
    expect(errorWrapper.text()).toContain("请返回列表重新选择。");
    expect(errorWrapper.find(".form-error").exists()).toBe(true);
  });
});
