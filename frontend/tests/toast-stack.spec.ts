import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";
import ToastStack from "@/components/ToastStack.vue";
import { useToastStore } from "@/stores/toast";

describe("ToastStack", () => {
  it("announces notifications and lets users dismiss them", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const toastStore = useToastStore(pinia);
    toastStore.items = [
      {
        id: 1,
        tone: "success",
        text: "保存成功",
      },
    ];

    const wrapper = mount(ToastStack, {
      global: {
        plugins: [pinia],
      },
    });

    const stack = wrapper.get('[data-testid="toast-stack"]');
    expect(stack.attributes("aria-live")).toBe("polite");
    expect(stack.attributes("role")).toBe("status");
    expect(wrapper.get('[data-testid="toast-item"]').text()).toContain("保存成功");

    await wrapper.get('[data-testid="toast-close-1"]').trigger("click");

    expect(toastStore.items).toHaveLength(0);
  });
});
