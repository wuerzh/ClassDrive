import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ExplanationCardList from "@/components/ExplanationCardList.vue";

describe("ExplanationCardList", () => {
  it("renders explanation cards in the chosen visual variant", () => {
    const wrapper = mount(ExplanationCardList, {
      props: {
        items: [
          { id: "context", title: "班级上下文", description: "每个班级拥有独立入口。" },
          { id: "path", title: "操作路径", description: "模块首页只保留班级入口。" },
        ],
        variant: "subtle",
        testId: "explanation-card-list",
        itemTestIdPrefix: "explanation-card",
      },
    });

    expect(wrapper.get('[data-testid="explanation-card-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="explanation-card-context"]').text()).toContain("班级上下文");
    expect(wrapper.get('[data-testid="explanation-card-path"]').text()).toContain("模块首页只保留班级入口。");
    expect(wrapper.find(".explanation-card-list--subtle").exists()).toBe(true);
  });
});
