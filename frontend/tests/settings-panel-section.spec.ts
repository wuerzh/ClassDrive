import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SettingsPanelSection from "@/components/SettingsPanelSection.vue";

describe("SettingsPanelSection", () => {
  it("renders a settings panel with guide label, description and slotted content", () => {
    const wrapper = mount(SettingsPanelSection, {
      props: {
        label: "个人设置",
        description: "维护展示名称和默认列表偏好。",
        panelTestId: "profile-panel",
        guideTestId: "profile-guide",
      },
      slots: {
        default: "<div class='settings-form'>表单内容</div>",
      },
    });

    expect(wrapper.get('[data-testid="profile-panel"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="profile-guide"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("个人设置");
    expect(wrapper.text()).toContain("维护展示名称和默认列表偏好。");
    expect(wrapper.text()).toContain("表单内容");
  });
});
