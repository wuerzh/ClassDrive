<template>
  <section class="students-page student-roster-panel" data-testid="students-roster-panel">
    <div class="students-page__toolbar">
      <div class="students-page__toolbar-actions">
        <button class="button button--primary" type="button" data-testid="student-create-open" @click="createDialogOpen = true">新增学生</button>
        <button class="button" type="button" data-testid="student-import-open" @click="importDialogOpen = true">导入学生</button>
        <button class="button" type="button" data-testid="student-export" @click="exportStudents">导出学生</button>
        <button class="button button--ghost" type="button" data-testid="student-refresh" @click="loadStudentsPage">刷新</button>
      </div>
      <div class="students-page__search-group">
        <select
          v-model="studentRegistrationFilter"
          class="copy-dialog__search students-page__registration-filter"
          data-testid="student-registration-filter"
          @change="applyStudentsRegistrationFilter"
        >
          <option value="">全部</option>
          <option value="registered">已注册</option>
          <option value="unregistered">未注册</option>
        </select>
        <input
          v-model="studentKeyword"
          class="copy-dialog__search students-page__search"
          type="text"
          placeholder="搜索学号或姓名"
          data-testid="student-search-input"
          @keyup.enter="applyStudentsFilters"
        />
        <button class="button" type="button" data-testid="student-search-submit" @click="applyStudentsFilters">搜索</button>
      </div>
    </div>

    <PaginationControls
      :page="studentPage"
      :page-size="studentPageSize"
      :page-size-options="studentPageSizeOptions"
      :total="totalStudents"
      :total-pages="totalStudentPages"
      test-id-prefix="student"
      @update:page-size="updateStudentPageSize"
      @prev="goPrevStudentPage"
      @next="goNextStudentPage"
    />

    <table class="files-table students-page__table" data-testid="students-table">
      <thead>
        <tr>
          <th>
            <button
              class="table-sort-button"
              :class="{ 'is-active': studentSort === 'studentNo-asc' || studentSort === 'studentNo-desc' }"
              type="button"
              data-testid="student-sort-number"
              @click="toggleStudentNumberSort"
            >
              学号
              <span class="table-sort-button__mark">{{ studentSortMark("studentNo") }}</span>
            </button>
          </th>
          <th>
            <button
              class="table-sort-button"
              :class="{ 'is-active': studentSort === 'displayName-asc' || studentSort === 'displayName-desc' }"
              type="button"
              data-testid="student-sort-name"
              @click="toggleStudentNameSort"
            >
              姓名
              <span class="table-sort-button__mark">{{ studentSortMark("displayName") }}</span>
            </button>
          </th>
          <th>
            <button
              class="table-sort-button"
              :class="{ 'is-active': studentSort === 'registered-asc' || studentSort === 'registered-desc' }"
              type="button"
              data-testid="student-sort-registration"
              @click="toggleStudentRegistrationSort"
            >
              是否注册
              <span class="table-sort-button__mark">{{ studentSortMark("registered") }}</span>
            </button>
          </th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="student in students" :key="student.id" :data-testid="`student-row-${student.id}`">
          <td class="students-page__student-no">{{ student.studentNo }}</td>
          <td>
            <strong class="students-page__student-name">{{ student.displayName }}</strong>
          </td>
          <td :data-testid="`student-registration-${student.id}`">
            <span
              class="students-page__registration"
              :class="{ 'students-page__registration--active': isStudentRegistered(student) }"
            >
              {{ isStudentRegistered(student) ? "已注册" : "未注册" }}
            </span>
          </td>
          <td class="files-table__actions">
            <div class="students-page__row-actions" :data-testid="`student-row-actions-${student.id}`">
              <button class="text-button" type="button" :data-testid="`student-edit-${student.id}`" @click="editStudent(student)">编辑</button>
              <button class="text-button" type="button" :data-testid="`student-reset-password-${student.id}`" @click="resetStudentPassword(student)">重置密码</button>
              <button class="text-button text-button--danger" type="button" :data-testid="`student-delete-${student.id}`" @click="deleteStudent(student)">删除</button>
            </div>
          </td>
        </tr>
        <tr v-if="!students.length">
          <td colspan="4" class="files-table__empty">
            {{ loadingStudents ? "正在加载学生列表..." : studentKeyword.trim() ? "当前筛选下没有学生。" : "当前班级还没有学生。" }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <StudentEditDialog
    :open="createDialogOpen || editingStudent !== null"
    :student-no="editingStudent?.studentNo ?? studentNo"
    :display-name="editingStudent?.displayName ?? displayName"
    :title="`班级：${currentClassName || '当前班级'}`"
    :eyebrow="editingStudent ? '学生编辑' : '新增学生'"
    :confirm-label="editingStudent ? '保存修改' : '确认新增'"
    @cancel="closeStudentDialog"
    @confirm="submitStudentDialog"
  />

  <ConfirmDialog
    :open="pendingDeleteStudent !== null"
    title="确认删除学生"
    :message="pendingDeleteStudent ? `删除后将从当前班级名册移除 ${pendingDeleteStudent.displayName}。` : ''"
    test-id-prefix="student-delete"
    confirm-label="确认删除"
    confirm-tone="danger"
    @cancel="pendingDeleteStudent = null"
    @confirm="confirmDeleteStudent"
  />

  <ConfirmDialog
    :open="pendingResetPasswordStudent !== null"
    title="确认重置密码"
    :message="pendingResetPasswordStudent ? `将 ${pendingResetPasswordStudent.displayName} 的密码重置为默认密码 123456，学生登录后必须修改密码。` : ''"
    test-id-prefix="student-reset-password"
    confirm-label="确认重置"
    @cancel="pendingResetPasswordStudent = null"
    @confirm="confirmResetStudentPassword"
  />

  <div v-if="importDialogOpen" class="copy-dialog-backdrop" @click.self="closeImportDialog">
    <section class="copy-dialog students-page__import-dialog" data-testid="student-import-dialog">
      <div class="copy-dialog__header">
        <div>
          <div class="copy-dialog__eyebrow">批量导入</div>
          <h3 class="copy-dialog__title">导入到 {{ currentClassName || "当前班级" }}</h3>
        </div>
        <button class="button button--ghost" type="button" data-testid="student-import-cancel-top" @click="closeImportDialog">关闭</button>
      </div>

      <div class="students-import students-import--stacked">
        <div class="students-import__steps">
          <div class="students-import__step" data-testid="student-import-step-template">
            <span class="students-import__step-index">1</span>
            <div>
              <strong>下载模板</strong>
              <p>模板里只填学号和姓名。</p>
              <a class="text-button" data-testid="student-template-xlsx" :href="studentTemplateHref()">下载 Excel 模板</a>
            </div>
          </div>
          <div class="students-import__step" data-testid="student-import-step-upload">
            <span class="students-import__step-index">2</span>
            <div>
              <strong>选择文件</strong>
              <p>本次会直接导入到 {{ currentClassName || "当前班级" }}。</p>
              <div class="students-import__upload-card" data-testid="student-import-upload-card">
                <label class="students-import__file-field">
                  <span>Excel 文件</span>
                  <input
                    ref="importFileInput"
                    class="copy-dialog__search students-page__file-input"
                    type="file"
                    accept=".xlsx"
                    data-testid="student-import-file-input"
                    @change="handleImportFileChange"
                  />
                </label>
                <button class="button button--primary" type="button" data-testid="student-import-file-submit" @click="importStudentsFromFile">
                  导入文件
                </button>
              </div>
              <p v-if="selectedImportFileName" class="muted">已选择文件：{{ selectedImportFileName }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import PaginationControls from "@/components/PaginationControls.vue";
import StudentEditDialog from "@/components/StudentEditDialog.vue";
import { api, ApiError, type StudentItem, type StudentListQueryOptions, type StudentRegistrationQuery } from "@/api/client";
import { useStudentsStore } from "@/stores/students";
import { useToastStore } from "@/stores/toast";
import { exportRowsToSpreadsheet } from "@/utils/spreadsheet-export";

type StudentSort = "studentNo-asc" | "studentNo-desc" | "displayName-asc" | "displayName-desc" | "registered-desc" | "registered-asc";
type StudentRegistrationFilter = "" | StudentRegistrationQuery;

const props = defineProps<{
  classId: number;
  className: string;
}>();

const defaultStudentSort: StudentSort = "studentNo-asc";
const defaultStudentPageSize = 30;
const studentPageSizeOptions = [30, 60, 100];

const toastStore = useToastStore();
const studentsStore = useStudentsStore();

const studentNo = ref("");
const displayName = ref("");
const studentKeyword = ref("");
const studentSort = ref<StudentSort>(defaultStudentSort);
const studentRegistrationFilter = ref<StudentRegistrationFilter>("");
const studentPage = ref(1);
const studentPageSize = ref(defaultStudentPageSize);
const totalStudents = ref(0);
const totalStudentPages = ref(1);
const loadingStudents = ref(false);
const importFileInput = ref<HTMLInputElement | null>(null);
const selectedImportFile = ref<File | null>(null);
const selectedImportFileName = ref("");
const editingStudent = ref<StudentItem | null>(null);
const pendingDeleteStudent = ref<StudentItem | null>(null);
const pendingResetPasswordStudent = ref<StudentItem | null>(null);
const createDialogOpen = ref(false);
const importDialogOpen = ref(false);

const students = computed(() => studentsStore.listForClass(props.classId));
const currentClassName = computed(() => props.className);

function isStudentRegistered(student: StudentItem): boolean {
  return student.activatedAt.trim().length > 0;
}

function buildStudentQueryOptions(): StudentListQueryOptions {
  return {
    classId: props.classId,
    q: studentKeyword.value.trim() || undefined,
    sort: studentSort.value === defaultStudentSort ? undefined : studentSort.value,
    registration: studentRegistrationFilter.value || undefined,
    page: studentPage.value > 1 ? studentPage.value : undefined,
    pageSize: studentPageSize.value !== defaultStudentPageSize ? studentPageSize.value : undefined,
  };
}

async function loadStudentsPage(): Promise<void> {
  if (!props.classId) {
    studentsStore.setClassStudents(0, []);
    totalStudents.value = 0;
    totalStudentPages.value = 1;
    return;
  }
  loadingStudents.value = true;
  try {
    const response = await api.students(buildStudentQueryOptions());
    studentsStore.setClassStudents(props.classId, response.students ?? []);
    totalStudents.value = response.pagination?.total ?? response.students?.length ?? 0;
    totalStudentPages.value = Math.max(1, response.pagination?.totalPages ?? 1);
    if (studentPage.value > totalStudentPages.value) {
      studentPage.value = totalStudentPages.value;
      await loadStudentsPage();
    }
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "加载学生失败");
  } finally {
    loadingStudents.value = false;
  }
}

async function applyStudentsFilters(): Promise<void> {
  studentPage.value = 1;
  await loadStudentsPage();
}

async function applyStudentsRegistrationFilter(): Promise<void> {
  studentPage.value = 1;
  await loadStudentsPage();
}

async function applyStudentsSort(nextSort: StudentSort): Promise<void> {
  studentSort.value = nextSort;
  studentPage.value = 1;
  await loadStudentsPage();
}

async function toggleStudentNumberSort(): Promise<void> {
  await applyStudentsSort(studentSort.value === "studentNo-asc" ? "studentNo-desc" : "studentNo-asc");
}

async function toggleStudentNameSort(): Promise<void> {
  await applyStudentsSort(studentSort.value === "displayName-asc" ? "displayName-desc" : "displayName-asc");
}

async function toggleStudentRegistrationSort(): Promise<void> {
  await applyStudentsSort(studentSort.value === "registered-desc" ? "registered-asc" : "registered-desc");
}

function studentSortMark(column: "studentNo" | "displayName" | "registered"): string {
  if (column === "studentNo") {
    if (studentSort.value === "studentNo-desc") {
      return "↓";
    }
    return studentSort.value === "studentNo-asc" ? "↑" : "";
  }
  if (column === "registered") {
    if (studentSort.value === "registered-asc") {
      return "↑";
    }
    return studentSort.value === "registered-desc" ? "↓" : "";
  }
  if (studentSort.value === "displayName-desc") {
    return "↓";
  }
  return studentSort.value === "displayName-asc" ? "↑" : "";
}

async function exportStudents(): Promise<void> {
  if (!props.classId) {
    toastStore.push("error", "请先选择班级");
    return;
  }
  try {
    const response = await api.students({
      ...buildStudentQueryOptions(),
      page: undefined,
      pageSize: 100,
    });
    const rows = response.students ?? [];
    if (!rows.length) {
      toastStore.push("warning", "当前没有可导出的学生");
      return;
    }
    exportRowsToSpreadsheet({
      fileName: `${currentClassName.value || "学生名单"}-学生名单.xls`,
      sheetName: "学生名单",
      rows,
      columns: [
        { header: "学号", value: (row) => row.studentNo },
        { header: "姓名", value: (row) => row.displayName },
        { header: "班级", value: () => currentClassName.value || "当前班级" },
        { header: "是否注册", value: (row) => (isStudentRegistered(row) ? "已注册" : "未注册") },
      ],
    });
    toastStore.push("success", "学生名单已导出");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "导出学生失败");
  }
}

async function updateStudentPageSize(value: number): Promise<void> {
  studentPageSize.value = value;
  studentPage.value = 1;
  await loadStudentsPage();
}

async function goPrevStudentPage(): Promise<void> {
  if (studentPage.value <= 1) {
    return;
  }
  studentPage.value -= 1;
  await loadStudentsPage();
}

async function goNextStudentPage(): Promise<void> {
  if (studentPage.value >= totalStudentPages.value) {
    return;
  }
  studentPage.value += 1;
  await loadStudentsPage();
}

async function createStudent(): Promise<void> {
  if (!props.classId) {
    toastStore.push("error", "请先选择班级");
    return;
  }
  if (!studentNo.value.trim() || !displayName.value.trim()) {
    toastStore.push("error", "请填写学号和姓名");
    return;
  }
  try {
    await studentsStore.create({
      classId: props.classId,
      studentNo: studentNo.value.trim(),
      displayName: displayName.value.trim(),
    });
    studentNo.value = "";
    displayName.value = "";
    createDialogOpen.value = false;
    toastStore.push("success", "学生已添加");
    totalStudents.value += 1;
    totalStudentPages.value = Math.max(1, Math.ceil(totalStudents.value / studentPageSize.value));
    await loadStudentsPage();
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "添加学生失败");
  }
}

function editStudent(student: StudentItem): void {
  editingStudent.value = student;
}

function closeStudentDialog(): void {
  editingStudent.value = null;
  createDialogOpen.value = false;
  studentNo.value = "";
  displayName.value = "";
}

async function submitStudentEdit(payload: { studentNo: string; displayName: string }): Promise<void> {
  const student = editingStudent.value;
  if (!student) {
    return;
  }
  try {
    await studentsStore.update(student.id, {
      classId: student.classId,
      studentNo: payload.studentNo,
      displayName: payload.displayName,
    });
    editingStudent.value = null;
    toastStore.push("success", "学生已更新");
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "更新学生失败");
  }
}

async function submitStudentDialog(payload: { studentNo: string; displayName: string }): Promise<void> {
  if (editingStudent.value) {
    await submitStudentEdit(payload);
    return;
  }
  studentNo.value = payload.studentNo;
  displayName.value = payload.displayName;
  await createStudent();
}

function deleteStudent(student: StudentItem): void {
  pendingDeleteStudent.value = student;
}

function resetStudentPassword(student: StudentItem): void {
  pendingResetPasswordStudent.value = student;
}

async function confirmResetStudentPassword(): Promise<void> {
  const student = pendingResetPasswordStudent.value;
  if (!student) {
    return;
  }
  try {
    const response = await studentsStore.resetPassword(student.id, student.classId);
    pendingResetPasswordStudent.value = null;
    toastStore.push("success", `密码已重置为 ${response.defaultPassword}`);
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "重置密码失败");
  }
}

async function confirmDeleteStudent(): Promise<void> {
  const student = pendingDeleteStudent.value;
  if (!student) {
    return;
  }
  try {
    await studentsStore.remove(student.id, student.classId);
    pendingDeleteStudent.value = null;
    toastStore.push("success", "学生已删除");
    totalStudents.value = Math.max(0, totalStudents.value - 1);
    totalStudentPages.value = Math.max(1, Math.ceil(Math.max(totalStudents.value, 1) / studentPageSize.value));
    await loadStudentsPage();
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "删除学生失败");
  }
}

function handleImportFileChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  selectedImportFile.value = file;
  selectedImportFileName.value = file?.name ?? "";
}

function studentTemplateHref(): string {
  return "/api/students/import-template?format=xlsx";
}

async function importStudentsFromFile(): Promise<void> {
  if (!props.classId) {
    toastStore.push("error", "请先选择班级");
    return;
  }
  if (!selectedImportFile.value) {
    toastStore.push("error", "请选择 Excel 文件");
    return;
  }
  try {
    const imported = await studentsStore.importFile({
      classId: props.classId,
      file: selectedImportFile.value,
    });
    selectedImportFile.value = null;
    selectedImportFileName.value = "";
    if (importFileInput.value) {
      importFileInput.value.value = "";
    }
    importDialogOpen.value = false;
    toastStore.push("success", "学生已批量导入");
    totalStudents.value += imported.length;
    totalStudentPages.value = Math.max(1, Math.ceil(totalStudents.value / studentPageSize.value));
    await loadStudentsPage();
  } catch (error) {
    toastStore.push("error", error instanceof ApiError ? error.message : "批量导入失败");
  }
}

function closeImportDialog(): void {
  importDialogOpen.value = false;
  selectedImportFile.value = null;
  selectedImportFileName.value = "";
  if (importFileInput.value) {
    importFileInput.value.value = "";
  }
}

watch(
  () => props.classId,
  async () => {
    studentKeyword.value = "";
    studentSort.value = defaultStudentSort;
    studentRegistrationFilter.value = "";
    studentPage.value = 1;
    studentPageSize.value = defaultStudentPageSize;
    await loadStudentsPage();
  },
  { immediate: true },
);
</script>

<style scoped>
.student-roster-panel {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.students-page__toolbar-actions,
.students-page__toolbar,
.students-page__search-group {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.students-page__toolbar {
  justify-content: flex-start;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-soft);
}

.students-page__toolbar-actions {
  gap: 8px;
}

.students-page__registration-filter {
  flex: 0 0 calc((3em + 38px) * 1.2);
  inline-size: calc((3em + 38px) * 1.2);
  min-width: calc((3em + 38px) * 1.2);
}

.students-page__search-group {
  flex: 0 1 400px;
  margin-left: auto;
}

.students-page__search {
  width: min(220px, 100%);
}

.students-page__table {
  table-layout: fixed;
}

.students-page__student-no {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.students-page__student-name {
  display: inline-block;
}

.students-page__registration {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: 0.875rem;
  white-space: nowrap;
}

.students-page__registration--active {
  background: rgba(28, 117, 99, 0.12);
  color: var(--success);
}

.students-page__row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.students-page__row-actions .text-button {
  min-height: 24px;
  padding: 2px 4px;
}

.students-page__import-dialog {
  width: min(640px, 100%);
}

.students-page__import-dialog .students-import {
  gap: 12px;
}

.students-import__steps {
  display: grid;
  gap: 10px;
}

.students-import__step {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--bg-subtle);
}

.students-import__step-index {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: var(--accent-primary);
  color: #fff;
  font-weight: 800;
  line-height: 1;
}

.students-import__step strong {
  display: block;
  color: var(--text-primary);
  line-height: 1.25;
}

.students-import__step p {
  margin: 4px 0 6px;
  color: var(--text-secondary);
  line-height: 1.45;
}

.students-import__upload-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
  padding: 12px;
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  background: var(--bg-surface);
}

.students-import__file-field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--text-secondary);
  font-weight: 700;
}

.students-import__file-field > span {
  font-size: 0.88rem;
}

@media (max-width: 960px) {
  .students-page__toolbar {
    align-items: stretch;
  }

  .students-page__search-group {
    flex-basis: 100%;
    margin-left: 0;
  }

  .students-page__search {
    width: 100%;
  }

  .students-page__table {
    table-layout: auto;
  }
}

@media (max-width: 640px) {
  .students-import__upload-card {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
