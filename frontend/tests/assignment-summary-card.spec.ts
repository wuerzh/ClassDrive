import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { h } from "vue";
import AssignmentSummaryCard from "@/components/AssignmentSummaryCard.vue";

describe("AssignmentSummaryCard", () => {
  it("renders an assignment workspace card with detail items and a persistent action rail", () => {
    const wrapper = mount(AssignmentSummaryCard, {
      props: {
        title: "第一单元练习",
        description: "完成第 8 页",
        details: [
          { label: "截止时间", value: "2026/5/1 20:00:00" },
          { label: "提交状态", value: "已提交", tone: "status-pill--success" },
        ],
        testId: "assignment-summary-card",
        detailsTestId: "assignment-summary-details",
      },
      slots: {
        action: () => h("a", { href: "/student/assignments/9", "data-testid": "assignment-summary-action" }, "查看作业"),
      },
    });

    expect(wrapper.get('[data-testid="assignment-summary-card"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("第一单元练习");
    expect(wrapper.text()).toContain("完成第 8 页");
    expect(wrapper.find(".assignment-summary-card__title").text()).toBe("第一单元练习");
    expect(wrapper.find(".assignment-summary-card__description").text()).toBe("完成第 8 页");
    expect(wrapper.get('[data-testid="assignment-summary-details"]').text()).toContain("截止时间");
    expect(wrapper.findAll(".assignment-summary-card__detail")).toHaveLength(2);
    expect(wrapper.find(".status-pill--success").exists()).toBe(true);
    expect(wrapper.find(".assignment-summary-card__action").exists()).toBe(true);
    expect(wrapper.get('[data-testid="assignment-summary-action"]').attributes("href")).toBe("/student/assignments/9");
  });
});
