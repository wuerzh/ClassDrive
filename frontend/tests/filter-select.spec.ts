import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FilterSelect from "@/components/FilterSelect.vue";

describe("FilterSelect", () => {
  it("focuses search input on open and closes with Escape", async () => {
    const wrapper = mount(FilterSelect, {
      props: {
        modelValue: 1,
        options: [
          { label: "一年级一班", value: 1 },
          { label: "一年级二班", value: 2 },
        ],
        testId: "class-filter",
      },
      attachTo: document.body,
    });

    await wrapper.get('[data-testid="class-filter-trigger"]').trigger("click");
    const searchInput = wrapper.get('[data-testid="class-filter-search"]');

    expect(document.activeElement).toBe(searchInput.element);

    await searchInput.trigger("keydown", { key: "Escape" });

    expect(wrapper.find('[data-testid="class-filter-panel"]').exists()).toBe(false);
  });
});
