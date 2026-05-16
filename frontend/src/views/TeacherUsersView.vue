<template>
  <section class="classes-page__composer" data-testid="teacher-users-create-panel">
    <SectionIntro
      label="新增老师账号"
      description="为新老师创建登录账号，并指定系统负责人或普通老师角色。"
      test-id="teacher-users-create-intro"
    />

    <p class="teacher-role-help" data-testid="teacher-role-help">
      普通老师管教学，系统负责人管系统和账号。
    </p>

    <div class="app-field-grid">
      <label class="app-field">
        <span>登录账号</span>
        <input v-model="username" class="copy-dialog__search" type="text" placeholder="登录账号" data-testid="teacher-create-username" />
      </label>
      <label class="app-field">
        <span>老师姓名</span>
        <input v-model="displayName" class="copy-dialog__search" type="text" placeholder="老师姓名" data-testid="teacher-create-display-name" />
      </label>
      <label class="app-field">
        <span>初始密码</span>
        <input v-model="password" class="copy-dialog__search" type="password" placeholder="初始密码" data-testid="teacher-create-password" />
      </label>
      <label class="app-field">
        <span>账号角色</span>
        <select v-model="role" class="copy-dialog__search" data-testid="teacher-create-role">
          <option value="staff">{{ teacherRoleLabel("staff") }}</option>
          <option value="owner">{{ teacherRoleLabel("owner") }}</option>
        </select>
      </label>
      <div class="settings-actions">
        <button class="button button--primary" type="button" data-testid="teacher-create-submit" @click="createTeacherUser">
          创建老师账号
        </button>
      </div>
    </div>
  </section>

  <section class="classes-page__board" data-testid="teacher-users-list-panel">
    <SectionIntro
      label="老师账号列表"
      description="统一查看当前账号状态、角色，并进入详情页做更细的维护。"
      test-id="teacher-users-list-intro"
    />
    <article
      v-for="teacher in teachers"
      :key="teacher.id"
      class="teacher-card teacher-card--row"
      :data-testid="`teacher-card-row-${teacher.id}`"
    >
      <div class="teacher-card__name">
        <span class="teacher-card__label">姓名</span>
        <strong>{{ teacher.displayName }}</strong>
      </div>
      <div class="teacher-card__username">
        <span class="teacher-card__label">账号</span>
        <span>{{ teacher.username }}</span>
      </div>
      <div class="app-meta-row teacher-card__meta" :data-testid="`teacher-card-meta-${teacher.id}`">
        <StatusPill :label="teacherRoleLabel(teacher.role)" tone="status-pill--accent" />
        <StatusPill :label="teacherStateLabel(teacher.disabled)" :tone="teacher.disabled ? 'status-pill--danger' : 'status-pill--success'" />
      </div>
      <div class="teacher-card__actions app-actions">
        <div class="app-actions--primary" :data-testid="`teacher-card-primary-actions-${teacher.id}`">
          <button
            class="button button--primary"
            type="button"
            :data-testid="`teacher-detail-open-${teacher.id}`"
            @click="openTeacherDetail(teacher.id)"
          >
            老师详情
          </button>
        </div>
      </div>
    </article>

    <p v-if="!teachers.length" class="muted">当前还没有老师账号。</p>
  </section>

  <div
    v-if="detailTeacherId"
    class="copy-dialog-backdrop"
    data-testid="teacher-detail-dialog"
    @click.self="closeTeacherDetail"
  >
    <section class="copy-dialog teacher-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="teacher-detail-dialog-title">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">老师账号</div>
          <h3 id="teacher-detail-dialog-title" class="copy-dialog__title">查看与维护老师账号</h3>
        </div>
        <button class="text-button" type="button" data-testid="teacher-detail-close" @click="closeTeacherDetail">关闭</button>
      </div>
      <TeacherUserDetailView :teacher-id="detailTeacherId" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted, ref } from "vue";
import SectionIntro from "@/components/SectionIntro.vue";
import StatusPill from "@/components/StatusPill.vue";
import TeacherUserDetailView from "@/views/TeacherUserDetailView.vue";
import { ApiError } from "@/api/client";
import { useTeacherUsersStore } from "@/stores/teacher-users";
import { useToastStore } from "@/stores/toast";
import { teacherRoleLabel, teacherStateLabel } from "@/utils/ui-copy";

const toastStore = useToastStore();
const teacherUsersStore = useTeacherUsersStore();
const { teachers } = storeToRefs(teacherUsersStore);

const username = ref("");
const displayName = ref("");
const password = ref("");
const role = ref<"owner" | "staff">("staff");
const detailTeacherId = ref<number | null>(null);

async function loadTeachers() {
  await teacherUsersStore.load();
}

async function createTeacherUser() {
  try {
    await teacherUsersStore.create({
      username: username.value.trim(),
      displayName: displayName.value.trim(),
      password: password.value,
      role: role.value,
    });
    username.value = "";
    displayName.value = "";
    password.value = "";
    role.value = "staff";
    toastStore.push("success", "老师账号已创建");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "创建老师账号失败");
  }
}

function openTeacherDetail(teacherId: number) {
  detailTeacherId.value = teacherId;
}

function closeTeacherDetail() {
  detailTeacherId.value = null;
}

onMounted(async () => {
  try {
    await loadTeachers();
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "加载老师账号失败");
  }
});
</script>

<style scoped>
.settings-actions {
  display: flex;
  align-items: end;
}

.teacher-card {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(140px, 1fr) minmax(180px, auto) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-soft);
}

.teacher-card:last-child {
  border-bottom: 0;
}

.teacher-card__name,
.teacher-card__username {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.teacher-card__name strong,
.teacher-card__username span:last-child {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.teacher-card__label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.teacher-card__meta {
  min-width: 0;
  justify-content: flex-start;
}

.teacher-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.teacher-role-help {
  color: var(--text-muted);
  line-height: 1.45;
}

.teacher-detail-dialog {
  width: min(780px, calc(100vw - 32px));
  max-height: calc(100vh - 56px);
  overflow: auto;
}

@media (max-width: 720px) {
  .teacher-card {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>
