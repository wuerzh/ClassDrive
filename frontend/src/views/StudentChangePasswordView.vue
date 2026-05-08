<template>
  <section class="classes-page student-change-password-page">
    <section class="classes-page__board student-change-password-page__panel" data-testid="student-change-password-panel">
      <div class="student-change-password-page__header">
        <div>
          <p class="student-change-password-page__eyebrow">账号安全</p>
          <h2>请先修改初始密码</h2>
        </div>
        <p class="muted">老师已将你的密码重置为默认密码。修改后即可继续查看资料和提交作业。</p>
      </div>

      <form class="student-change-password-page__form" @submit.prevent="submitPasswordChange">
        <label class="field">
          <span>当前密码</span>
          <input
            v-model="currentPassword"
            data-testid="student-change-current-password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入当前密码"
          />
        </label>

        <label class="field">
          <span>新密码</span>
          <input
            v-model="newPassword"
            data-testid="student-change-new-password"
            type="password"
            autocomplete="new-password"
            placeholder="至少 6 位，不能使用默认密码"
          />
        </label>

        <label class="field">
          <span>确认新密码</span>
          <input
            v-model="confirmPassword"
            data-testid="student-change-confirm-password"
            type="password"
            autocomplete="new-password"
            placeholder="请再次输入新密码"
          />
        </label>

        <p v-if="errorText" class="form-error" data-testid="student-change-password-error">{{ errorText }}</p>

        <button
          class="button button--primary student-change-password-page__submit"
          type="button"
          data-testid="student-change-password-submit"
          :disabled="submitting"
          @click="submitPasswordChange"
        >
          {{ submitting ? "正在保存..." : "保存并进入学生端" }}
        </button>
      </form>
    </section>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ApiError } from "@/api/client";
import { useStudentAuthStore } from "@/stores/student-auth";
import { getPasswordComplexityError } from "@/utils/password-strength";

const router = useRouter();
const studentAuthStore = useStudentAuthStore();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const errorText = ref("");
const submitting = ref(false);

async function submitPasswordChange() {
  errorText.value = "";
  if (newPassword.value !== confirmPassword.value) {
    errorText.value = "两次输入的新密码不一致";
    return;
  }
  const passwordComplexityError = getPasswordComplexityError(newPassword.value);
  if (passwordComplexityError) {
    errorText.value = passwordComplexityError;
    return;
  }

  submitting.value = true;
  try {
    await studentAuthStore.changePassword(currentPassword.value, newPassword.value);
    await router.push("/student/assignments");
  } catch (error) {
    errorText.value = error instanceof ApiError ? error.message : "修改密码失败";
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.student-change-password-page {
  align-items: start;
}

.student-change-password-page__panel {
  width: min(560px, 100%);
  margin: 0 auto;
  gap: 20px;
  padding: 28px;
}

.student-change-password-page__header {
  display: grid;
  gap: 10px;
}

.student-change-password-page__header h2 {
  margin: 0;
  font-size: 1.35rem;
  line-height: 1.35;
}

.student-change-password-page__eyebrow {
  margin: 0 0 6px;
  color: var(--accent-primary);
  font-size: 0.82rem;
  font-weight: 700;
}

.student-change-password-page__form {
  display: grid;
  gap: 14px;
}

.student-change-password-page__submit {
  justify-self: start;
  min-width: 160px;
}

@media (max-width: 640px) {
  .student-change-password-page__panel {
    padding: 20px;
  }

  .student-change-password-page__submit {
    width: 100%;
  }
}
</style>
