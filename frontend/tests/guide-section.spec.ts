import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import GuideSection from "@/components/GuideSection.vue";

describe("GuideSection", () => {
  it("renders a workspace sidecar section with a dedicated header and body", () => {
    const wrapper = mount(GuideSection, {
      props: {
        label: "当前分享",
        testId: "guide-section",
      },
      slots: {
        default: "<p class='muted'>这里展示当前分享记录。</p>",
      },
    });

    expect(wrapper.get('[data-testid="guide-section"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("当前分享");
    expect(wrapper.text()).toContain("这里展示当前分享记录。");
    expect(wrapper.find(".guide-section").exists()).toBe(true);
    expect(wrapper.find(".guide-section__label").text()).toBe("当前分享");
    expect(wrapper.find(".guide-section__body").text()).toContain("这里展示当前分享记录。");
  });
});
