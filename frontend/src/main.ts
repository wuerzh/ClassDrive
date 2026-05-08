import { createApp } from "vue";
import { createPinia } from "pinia";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import App from "./App.vue";
import { createAppRouter } from "./router";
import { setUnauthorizedHandler } from "@/api/client";
import { useAuthStore } from "@/stores/auth";
import { useStudentAuthStore } from "@/stores/student-auth";
import { useToastStore } from "@/stores/toast";
import "element-plus/dist/index.css";
import "./styles.css";

const pinia = createPinia();
const router = createAppRouter(pinia);

dayjs.locale("zh-cn");

setUnauthorizedHandler(({ input }) => {
  const isStudentRequest = input.startsWith("/api/student/");
  const toastStore = useToastStore(pinia);
  if (isStudentRequest) {
    const studentAuthStore = useStudentAuthStore(pinia);
    if (studentAuthStore.user) {
      toastStore.push("error", "当前账号已在别处登录，请重新登录");
    }
    studentAuthStore.user = null;
    studentAuthStore.initialized = true;
    if (!router.currentRoute.value.path.startsWith("/student/login")) {
      void router.replace("/student/login");
    }
    return;
  }

  const authStore = useAuthStore(pinia);
  if (authStore.user) {
    toastStore.push("error", "当前账号已在别处登录，请重新登录");
  }
  authStore.user = null;
  authStore.initialized = true;
  if (router.currentRoute.value.path !== "/login") {
    void router.replace("/login");
  }
});

createApp(App).use(pinia).use(router).mount("#app");
