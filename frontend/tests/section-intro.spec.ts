import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SectionIntro from "@/components/SectionIntro.vue";

describe("SectionIntro", () => {
  it("renders a compact workspace intro instead of a manual-style note block", () => {
    const wrapper = mount(SectionIntro, {
      props: {
        label: "作业管理入口",
        description: "选择班级后进入对应作业列表。",
        testId: "section-intro",
      },
    });

    expect(wrapper.get('[data-testid="section-intro"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("作业管理入口");
    expect(wrapper.text()).toContain("选择班级后进入对应作业列表。");
    expect(wrapper.find(".section-intro").exists()).toBe(true);
    expect(wrapper.find(".section-intro__label").text()).toBe("作业管理入口");
    expect(wrapper.find(".section-intro__description").text()).toBe("选择班级后进入对应作业列表。");
  });
});
