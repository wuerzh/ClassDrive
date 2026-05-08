<template>
  <div class="login-page">
    <form class="login-card" @submit.prevent="submit">
      <div class="login-card__eyebrow">ClassDrive Student</div>
      <h1>学生激活</h1>
      <p class="muted">首次使用请输入班级注册码、学号和新密码。</p>

      <label class="field">
        <span>班级注册码</span>
        <input v-model="joinCode" data-testid="student-activate-join-code" autocomplete="off" inputmode="numeric" maxlength="4" />
      </label>

      <label class="field">
        <span>学号</span>
        <input v-model="studentNo" data-testid="student-activate-no" autocomplete="username" />
      </label>

      <label class="field">
        <span>新密码</span>
        <div class="student-activate-password-field">
          <input
            v-model="password"
            data-testid="student-activate-password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
          />
          <button
            class="student-activate-password-toggle"
            type="button"
            data-testid="student-activate-password-toggle"
            :aria-label="showPassword ? '隐藏密码' : '显示密码'"
            @click="showPassword = !showPassword"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5C6.8 5 2.4 8.1 1 12c1.4 3.9 5.8 7 11 7s9.6-3.1 11-7c-1.4-3.9-5.8-7-11-7Zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4Zm0-6.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </label>

      <label class="field">
        <span>确认密码</span>
        <div class="student-activate-password-field">
          <input
            v-model="confirmPassword"
            data-testid="student-activate-confirm-password"
            :type="showConfirmPassword ? 'text' : 'password'"
            autocomplete="new-password"
          />
          <button
            class="student-activate-password-toggle"
            type="button"
            data-testid="student-activate-confirm-password-toggle"
            :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'"
            @click="showConfirmPassword = !showConfirmPassword"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 5C6.8 5 2.4 8.1 1 12c1.4 3.9 5.8 7 11 7s9.6-3.1 11-7c-1.4-3.9-5.8-7-11-7Zm0 11.2A4.2 4.2 0 1 1 12 7.8a4.2 4.2 0 0 1 0 8.4Zm0-6.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </label>

      <p v-if="errorText" class="form-error">{{ errorText }}</p>

      <button class="button button--primary button--wide" type="submit" data-testid="student-activate-submit">激活并进入作业</button>
      <RouterLink class="text-button" to="/student/login">已激活账号，去登录</RouterLink>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import { useStudentAuthStore } from "@/stores/student-auth";

const router = useRouter();
const studentAuthStore = useStudentAuthStore();

const joinCode = ref("");
const studentNo = ref("");
const password = ref("");
const confirmPassword = ref("");
const errorText = ref("");
const showPassword = ref(false);
const showConfirmPassword = ref(false);

async function submit() {
  errorText.value = "";
  if (password.value !== confirmPassword.value) {
    errorText.value = "两次输入的密码不一致";
    return;
  }

  try {
    await studentAuthStore.activate(joinCode.value, studentNo.value, password.value);
    await router.push(studentAuthStore.user?.mustChangePassword === true ? "/student/change-password" : "/student/assignments");
  } catch (error) {
    errorText.value = error instanceof ApiError ? error.message : "激活失败";
  }
}
</script>

<style scoped>
.student-activate-password-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.student-activate-password-field input {
  min-width: 0;
}

.student-activate-password-toggle {
  width: 44px;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  background: var(--bg-surface);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.student-activate-password-toggle svg {
  width: 18px;
  height: 18px;
}
</style>
