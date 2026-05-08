<template>
  <section class="audit-logs-page">
    <section class="settings-page__panel audit-logs-page__filters" data-testid="audit-logs-filters">
      <div class="audit-logs-page__filter-row">
        <label class="app-field">
          <span>登录账号</span>
          <input v-model="loginFilters.q" class="copy-dialog__search" type="text" data-testid="audit-login-query" />
        </label>
        <label class="app-field">
          <span>登录身份</span>
          <select v-model="loginFilters.actorType" class="copy-dialog__search" data-testid="audit-login-actor">
            <option value="">全部</option>
            <option value="teacher">老师</option>
            <option value="student">学生</option>
          </select>
        </label>
        <label class="app-field">
          <span>登录结果</span>
          <select v-model="loginFilters.status" class="copy-dialog__search" data-testid="audit-login-status">
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="failure">失败</option>
          </select>
        </label>
        <label class="app-field">
          <span>操作关键词</span>
          <input v-model="operationFilters.q" class="copy-dialog__search" type="text" data-testid="audit-operation-query" />
        </label>
        <label class="app-field">
          <span>操作身份</span>
          <select v-model="operationFilters.actorType" class="copy-dialog__search" data-testid="audit-operation-actor">
            <option value="">全部</option>
            <option value="teacher">老师</option>
            <option value="student">学生</option>
          </select>
        </label>
        <label class="app-field">
          <span>操作类型</span>
          <select v-model="operationFilters.method" class="copy-dialog__search" data-testid="audit-operation-method">
            <option value="">全部</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
        </label>
        <label class="app-field">
          <span>开始日期</span>
          <div class="app-datetime-input" data-testid="audit-date-from">
            <ElDatePicker
              v-model="sharedDateFrom"
              class="app-datetime-control"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              popper-class="classdrive-date-picker"
              :editable="false"
            />
          </div>
        </label>
        <label class="app-field">
          <span>结束日期</span>
          <div class="app-datetime-input" data-testid="audit-date-to">
            <ElDatePicker
              v-model="sharedDateTo"
              class="app-datetime-control"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              popper-class="classdrive-date-picker"
              :editable="false"
            />
          </div>
        </label>
        <div class="audit-logs-page__filter-actions">
          <button class="button" type="button" data-testid="audit-logs-reset" @click="resetFilters">重置</button>
        </div>
      </div>
      <div class="audit-logs-page__clear-row" data-testid="audit-logs-clear-row">
        <label class="app-field">
          <span>清理此日期以前</span>
          <input
            v-model="clearBeforeDate"
            class="hidden-input"
            type="text"
            data-testid="audit-clear-before-date"
            aria-hidden="true"
            tabindex="-1"
          />
          <div class="app-datetime-input" data-testid="audit-clear-before-date-picker">
            <ElDatePicker
              v-model="clearBeforeDate"
              class="app-datetime-control"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              popper-class="classdrive-date-picker"
              :editable="false"
            />
          </div>
        </label>
        <button class="button button--danger" type="button" data-testid="audit-logs-clear-open" :disabled="clearLoading" @click="openClearConfirm">清理</button>
      </div>
    </section>

    <section class="settings-page__panel audit-logs-page__panel" data-testid="login-logs-panel">
      <div class="audit-logs-page__head">
        <div>
          <div class="classes-page__eyebrow">登录日志</div>
          <h3>最近登录</h3>
        </div>
        <div class="audit-logs-page__head-actions">
          <button class="button button--ghost" type="button" data-testid="audit-logs-export-login" :disabled="!loginLogs.length" @click="exportLoginLogs">导出</button>
          <button class="button button--ghost" type="button" data-testid="audit-logs-refresh" @click="loadLogs">刷新</button>
        </div>
      </div>
      <table class="files-table audit-logs-page__table" data-testid="login-logs-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>账号</th>
            <th>身份</th>
            <th>结果</th>
            <th>地址</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in loginLogs" :key="item.id">
            <td>{{ formatAuditTime(item.occurredAt) }}</td>
            <td>{{ item.username || item.actorName || "-" }}</td>
            <td>{{ actorTypeLabel(item.actorType) }}</td>
            <td>{{ loginStatusLabel(item.status) }}</td>
            <td>{{ item.ipAddress || "-" }}</td>
            <td>{{ item.message || "-" }}</td>
          </tr>
          <tr v-if="!loginLogs.length">
            <td class="files-table__empty" colspan="6">{{ loading ? "正在加载登录日志..." : "暂无登录日志" }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="settings-page__panel audit-logs-page__panel" data-testid="operation-logs-panel">
      <div class="audit-logs-page__head">
        <div>
          <div class="classes-page__eyebrow">操作日志</div>
          <h3>最近操作</h3>
        </div>
        <button class="button button--ghost" type="button" data-testid="audit-logs-export-operation" :disabled="!operationLogs.length" @click="exportOperationLogs">导出</button>
      </div>
      <table class="files-table audit-logs-page__table" data-testid="operation-logs-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>账号</th>
            <th>身份</th>
            <th>操作</th>
            <th>结果</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in operationLogs" :key="item.id">
            <td>{{ formatAuditTime(item.occurredAt) }}</td>
            <td>{{ item.actorName || actorTypeLabel(item.actorType) }}</td>
            <td>{{ actorTypeLabel(item.actorType) }}</td>
            <td>{{ item.summary }}</td>
            <td>{{ operationStatusLabel(item.statusCode) }}</td>
          </tr>
          <tr v-if="!operationLogs.length">
            <td class="files-table__empty" colspan="5">{{ loading ? "正在加载操作日志..." : "暂无操作日志" }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <p v-if="clearFeedback" class="muted" data-testid="audit-clear-feedback">{{ clearFeedback }}</p>
    <p v-if="errorText" class="form-error" data-testid="audit-logs-error">{{ errorText }}</p>
    <ConfirmDialog
      :open="clearConfirmOpen"
      title="确认清理日志"
      :message="clearConfirmMessage"
      test-id-prefix="audit-logs-clear"
      confirm-label="确认清理"
      confirm-tone="danger"
      @cancel="clearConfirmOpen = false"
      @confirm="confirmClearLogs"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElDatePicker } from "element-plus";
import {
  api,
  ApiError,
  type LoginLogFilters,
  type LoginLogItem,
  type OperationLogFilters,
  type OperationLogItem,
} from "@/api/client";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import { exportRowsToSpreadsheet } from "@/utils/spreadsheet-export";

const loginLogs = ref<LoginLogItem[]>([]);
const operationLogs = ref<OperationLogItem[]>([]);
const loading = ref(false);
const errorText = ref("");
const loginFilters = reactive<LoginLogFilters>({
  actorType: "",
  status: "",
  q: "",
});
const operationFilters = reactive<OperationLogFilters>({
  actorType: "",
  method: "",
  q: "",
});
const sharedDateFrom = ref("");
const sharedDateTo = ref("");
const clearBeforeDate = ref("");
const clearConfirmOpen = ref(false);
const clearLoading = ref(false);
const clearFeedback = ref("");
let logsRequestToken = 0;
let filterTimer: number | undefined;

const clearConfirmMessage = computed(() => (
  `将清理 ${clearBeforeDate.value || "所选日期"} 以前的登录日志和操作日志。该操作不可撤销。`
));
const filterSignature = computed(() => JSON.stringify({
  loginActorType: loginFilters.actorType,
  loginStatus: loginFilters.status,
  loginQuery: loginFilters.q,
  operationActorType: operationFilters.actorType,
  operationMethod: operationFilters.method,
  operationQuery: operationFilters.q,
  from: sharedDateFrom.value,
  to: sharedDateTo.value,
}));

function formatAuditTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || "-";
  }
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function actorTypeLabel(value: LoginLogItem["actorType"] | OperationLogItem["actorType"]): string {
  return value === "student" ? "学生" : "老师";
}

function loginStatusLabel(value: LoginLogItem["status"]): string {
  return value === "success" ? "成功" : "失败";
}

function operationStatusLabel(value: number): string {
  if (value >= 200 && value < 300) {
    return "成功";
  }
  if (value >= 400) {
    return `失败（${value}）`;
  }
  return String(value);
}

async function loadLogs(): Promise<void> {
  const requestToken = ++logsRequestToken;
  loading.value = true;
  errorText.value = "";
  try {
    const loginQuery: LoginLogFilters = {
      ...loginFilters,
      from: sharedDateFrom.value,
      to: sharedDateTo.value,
    };
    const operationQuery: OperationLogFilters = {
      ...operationFilters,
      from: sharedDateFrom.value,
      to: sharedDateTo.value,
    };
    const [loginResponse, operationResponse] = await Promise.all([
      api.loginLogs(loginQuery),
      api.operationLogs(operationQuery),
    ]);
    if (requestToken !== logsRequestToken) {
      return;
    }
    loginLogs.value = loginResponse.logs ?? [];
    operationLogs.value = operationResponse.logs ?? [];
  } catch (error) {
    if (requestToken !== logsRequestToken) {
      return;
    }
    errorText.value = error instanceof ApiError ? error.message : "加载日志失败";
    loginLogs.value = [];
    operationLogs.value = [];
  } finally {
    if (requestToken === logsRequestToken) {
      loading.value = false;
    }
  }
}

function resetFilters(): void {
  const previousSignature = filterSignature.value;
  loginFilters.actorType = "";
  loginFilters.status = "";
  loginFilters.q = "";
  operationFilters.actorType = "";
  operationFilters.method = "";
  operationFilters.q = "";
  sharedDateFrom.value = "";
  sharedDateTo.value = "";
  if (filterSignature.value === previousSignature) {
    void loadLogs();
  }
}

function scheduleFilterLoad(): void {
  if (filterTimer !== undefined) {
    window.clearTimeout(filterTimer);
  }
  filterTimer = window.setTimeout(() => {
    filterTimer = undefined;
    void loadLogs();
  }, 120);
}

function isAuditDateInput(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function openClearConfirm(): void {
  errorText.value = "";
  clearFeedback.value = "";
  if (!isAuditDateInput(clearBeforeDate.value)) {
    errorText.value = "请输入要清理的日期，格式为 YYYY-MM-DD";
    return;
  }
  clearConfirmOpen.value = true;
}

async function confirmClearLogs(): Promise<void> {
  if (!isAuditDateInput(clearBeforeDate.value)) {
    errorText.value = "请输入要清理的日期，格式为 YYYY-MM-DD";
    clearConfirmOpen.value = false;
    return;
  }
  clearLoading.value = true;
  errorText.value = "";
  try {
    const result = await api.clearAuditLogs(clearBeforeDate.value.trim());
    clearConfirmOpen.value = false;
    clearFeedback.value = `已清理 ${result.deletedLoginLogs} 条登录日志、${result.deletedOperationLogs} 条操作日志`;
    await loadLogs();
  } catch (error) {
    errorText.value = error instanceof ApiError ? error.message : "清理日志失败";
  } finally {
    clearLoading.value = false;
  }
}

function exportLoginLogs(): void {
  exportRowsToSpreadsheet({
    fileName: "登录日志.xls",
    sheetName: "登录日志",
    rows: loginLogs.value,
    columns: [
      { header: "时间", value: (row) => formatAuditTime(row.occurredAt) },
      { header: "账号", value: (row) => row.username || row.actorName || "-" },
      { header: "身份", value: (row) => actorTypeLabel(row.actorType) },
      { header: "结果", value: (row) => loginStatusLabel(row.status) },
      { header: "地址", value: (row) => row.ipAddress || "-" },
      { header: "说明", value: (row) => row.message || "-" },
    ],
  });
}

function exportOperationLogs(): void {
  exportRowsToSpreadsheet({
    fileName: "操作日志.xls",
    sheetName: "操作日志",
    rows: operationLogs.value,
    columns: [
      { header: "时间", value: (row) => formatAuditTime(row.occurredAt) },
      { header: "账号", value: (row) => row.actorName || actorTypeLabel(row.actorType) },
      { header: "身份", value: (row) => actorTypeLabel(row.actorType) },
      { header: "操作", value: (row) => row.summary },
      { header: "结果", value: (row) => operationStatusLabel(row.statusCode) },
    ],
  });
}

onMounted(() => {
  void loadLogs();
});

watch(filterSignature, () => {
  scheduleFilterLoad();
});
</script>

<style scoped>
.audit-logs-page {
  display: grid;
  gap: 10px;
}

.audit-logs-page__panel {
  overflow-x: auto;
}

.audit-logs-page__filters {
  display: grid;
  gap: 10px;
}

.audit-logs-page__filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
  align-items: end;
}

.audit-logs-page__clear-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: end;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}

.audit-logs-page__filter-actions,
.audit-logs-page__head-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.audit-logs-page__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.audit-logs-page__head h3 {
  margin: 2px 0 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.audit-logs-page__table {
  min-width: 620px;
}
</style>
