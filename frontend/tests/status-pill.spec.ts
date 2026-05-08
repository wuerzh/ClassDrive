import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import StatusPill from "@/components/StatusPill.vue";

describe("StatusPill", () => {
  it("renders label and tone classes consistently", () => {
    const wrapper = mount(StatusPill, {
      props: {
        label: "已发布",
        tone: "status-pill--success",
      },
    });

    expect(wrapper.text()).toBe("已发布");
    expect(wrapper.classes()).toContain("status-pill");
    expect(wrapper.classes()).toContain("status-pill--success");
  });
});
