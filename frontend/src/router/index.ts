import type { Pinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useStudentAuthStore } from "@/stores/student-auth";
import LoginView from "@/views/LoginView.vue";
import FilesView from "@/views/FilesView.vue";
import ClassesView from "@/views/ClassesView.vue";
import AssignmentsView from "@/views/AssignmentsView.vue";
import AssignmentDetailView from "@/views/AssignmentDetailView.vue";
import SettingsView from "@/views/SettingsView.vue";
import TeacherProfileSettingsView from "@/views/TeacherProfileSettingsView.vue";
import SystemSettingsView from "@/views/SystemSettingsView.vue";
import TeacherUsersView from "@/views/TeacherUsersView.vue";
import TeacherUserDetailView from "@/views/TeacherUserDetailView.vue";
import AuditLogsView from "@/views/AuditLogsView.vue";
import StudentActivateView from "@/views/StudentActivateView.vue";
import StudentAssignmentsView from "@/views/StudentAssignmentsView.vue";
import StudentAssignmentDetailView from "@/views/StudentAssignmentDetailView.vue";
import StudentChangePasswordView from "@/views/StudentChangePasswordView.vue";
import StudentFilesView from "@/views/StudentFilesView.vue";
import ShareView from "@/views/ShareView.vue";
import ShellLayout from "@/layouts/ShellLayout.vue";
import StudentLayout from "@/layouts/StudentLayout.vue";

export function createAppRouter(pinia?: Pinia) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: "/",
        name: "portal",
        component: LoginView,
        meta: {
          public: true,
          title: "统一登录",
        },
      },
      {
        path: "/login",
        name: "login",
        component: LoginView,
        meta: {
          public: true,
          title: "老师登录",
        },
      },
      {
        path: "/student/activate",
        name: "student-activate",
        component: StudentActivateView,
        meta: {
          public: true,
          title: "学生激活",
        },
      },
      {
        path: "/share/:token",
        name: "share",
        component: ShareView,
        meta: {
          public: true,
          title: "查看分享",
        },
      },
      {
        path: "/student/login",
        name: "student-login",
        component: LoginView,
        meta: {
          public: true,
          title: "学生登录",
        },
      },
      {
        path: "/student",
        component: StudentLayout,
        meta: {
          requiresStudentAuth: true,
        },
        children: [
          {
            path: "",
            redirect: "/student/assignments",
          },
          {
            path: "assignments",
            name: "student-assignments",
            component: StudentAssignmentsView,
            meta: { title: "我的作业" },
          },
          {
            path: "assignments/:assignmentId",
            name: "student-assignment-detail",
            component: StudentAssignmentDetailView,
            meta: { title: "作业详情" },
          },
          {
            path: "change-password",
            name: "student-change-password",
            component: StudentChangePasswordView,
            meta: { title: "修改初始密码" },
          },
          {
            path: "files/public",
            name: "student-files-public",
            component: StudentFilesView,
            meta: { title: "公共资料" },
          },
          {
            path: "files/class",
            name: "student-files-class",
            component: StudentFilesView,
            meta: { title: "班级资料" },
          },
        ],
      },
      {
        path: "/",
        component: ShellLayout,
        meta: {
          requiresAuth: true,
        },
        children: [
          {
            path: "files/library",
            name: "files-library",
            component: FilesView,
            meta: { title: "老师资料" },
          },
          {
            path: "files/public",
            name: "files-public",
            component: FilesView,
            meta: { title: "公共资料" },
          },
          {
            path: "files/classes/:classId",
            name: "files-class",
            component: FilesView,
            meta: { title: "班级资料" },
          },
          {
            path: "classes",
            name: "classes",
            component: ClassesView,
            meta: { title: "班级管理" },
          },
          {
            path: "assignments",
            name: "assignments",
            component: AssignmentsView,
            meta: { title: "作业管理" },
          },
          {
            path: "assignments/classes/:classId",
            name: "assignments-class",
            component: AssignmentsView,
            meta: { title: "作业管理" },
          },
          {
            path: "assignments/classes/:classId/:assignmentId",
            name: "assignment-detail",
            component: AssignmentDetailView,
            meta: { title: "作业详情" },
          },
          {
            path: "students",
            redirect: "/classes",
          },
          {
            path: "settings",
            name: "settings",
            component: SettingsView,
            meta: { title: "设置" },
            children: [
              {
                path: "profile",
                name: "settings-profile",
                component: TeacherProfileSettingsView,
                meta: { title: "个人设置" },
              },
              {
                path: "system",
                name: "settings-system",
                component: SystemSettingsView,
                meta: { title: "端口配置", ownerOnly: true },
              },
              {
                path: "teachers",
                name: "settings-teachers",
                component: TeacherUsersView,
                meta: { title: "老师账号", ownerOnly: true },
              },
              {
                path: "teachers/:teacherId",
                name: "settings-teacher-detail",
                component: TeacherUserDetailView,
                meta: { title: "老师账号详情", ownerOnly: true },
              },
              {
                path: "logs",
                name: "settings-logs",
                component: AuditLogsView,
                meta: { title: "日志审计", ownerOnly: true },
              },
            ],
          },
        ],
      },
    ],
  });

  router.beforeEach(async (to) => {
    const isStudentRoute = to.path === "/student" || to.path.startsWith("/student/");
    if (isStudentRoute) {
      const studentAuthStore = useStudentAuthStore(pinia);
      if (!studentAuthStore.initialized) {
        await studentAuthStore.restoreSession();
      }

      const isStudentPublic = to.path === "/student/login" || to.path === "/student/activate";
      if (to.meta.requiresStudentAuth && !studentAuthStore.user) {
        return { path: "/student/login" };
      }

      const mustChangePassword = studentAuthStore.user?.mustChangePassword === true;
      const isStudentPasswordChange = to.path === "/student/change-password";
      if (isStudentPublic && studentAuthStore.user) {
        return { path: mustChangePassword ? "/student/change-password" : "/student/assignments" };
      }

      if (to.meta.requiresStudentAuth && mustChangePassword && !isStudentPasswordChange) {
        return { path: "/student/change-password" };
      }

      if (isStudentPasswordChange && studentAuthStore.user && !mustChangePassword) {
        return { path: "/student/assignments" };
      }

      return true;
    }

    const authStore = useAuthStore(pinia);
    if (!authStore.initialized) {
      await authStore.restoreSession();
    }

    if (to.meta.requiresAuth && !authStore.user) {
      return { path: "/login" };
    }

    if (to.meta.ownerOnly && authStore.user?.role !== "owner") {
      return { path: "/settings/profile" };
    }

    if ((to.path === "/" || to.path === "/login") && authStore.user) {
      return { path: "/files/library" };
    }

    return true;
  });

  router.afterEach((to) => {
    const title = typeof to.meta.title === "string" ? to.meta.title : "ClassDrive";
    document.title = `${title} - ClassDrive`;
  });

  return router;
}
