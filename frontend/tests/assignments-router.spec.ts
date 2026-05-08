import { describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createAppRouter } from "@/router";
import { useAuthStore } from "@/stores/auth";

describe("Assignments routes", () => {
  it("resolves assignments home, class, and detail routes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore(pinia);
    authStore.user = {
      id: 1,
      username: "teacher",
      displayName: "示例老师",
    };
    authStore.initialized = true;

    const router = createAppRouter(pinia);

    await router.push("/assignments");
    await router.isReady();
    expect(router.currentRoute.value.name).toBe("assignments");
    expect(router.currentRoute.value.meta.title).toBe("作业管理");

    await router.push("/assignments/classes/2");
    expect(router.currentRoute.value.name).toBe("assignments-class");
    expect(router.currentRoute.value.params.classId).toBe("2");
    expect(router.currentRoute.value.meta.title).toBe("作业管理");

    await router.push("/assignments/classes/2/5");
    expect(router.currentRoute.value.name).toBe("assignment-detail");
    expect(router.currentRoute.value.params.classId).toBe("2");
    expect(router.currentRoute.value.params.assignmentId).toBe("5");
  });
});
