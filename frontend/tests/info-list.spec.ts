import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import InfoList from "@/components/InfoList.vue";

describe("InfoList", () => {
  it("renders stacked and grid layouts with optional status pill values", () => {
    const stacked = mount(InfoList, {
      props: {
        items: [
          { label: "截止时间", value: "2026/5/1 20:00:00" },
          { label: "状态", value: "已发布", tone: "status-pill--success" },
        ],
        layout: "stacked",
        testId: "stacked-info",
      },
    });

    expect(stacked.find('[data-testid="stacked-info"]').exists()).toBe(true);
    expect(stacked.text()).toContain("截止时间");
    expect(stacked.text()).toContain("2026/5/1 20:00:00");
    expect(stacked.find(".status-pill--success").exists()).toBe(true);

    const grid = mount(InfoList, {
      props: {
        items: [
          { label: "登录账号", value: "teacher" },
          { label: "当前角色", value: "系统负责人", tone: "status-pill--accent" },
        ],
        layout: "grid",
        testId: "grid-info",
      },
    });

    expect(grid.find('[data-testid="grid-info"]').exists()).toBe(true);
    expect(grid.find(".app-summary-grid").exists()).toBe(true);
    expect(grid.text()).toContain("登录账号");
    expect(grid.text()).toContain("teacher");
    expect(grid.find(".status-pill--accent").exists()).toBe(true);
  });
});
