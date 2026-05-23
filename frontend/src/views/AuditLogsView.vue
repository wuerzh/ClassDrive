<template>
  <section class="audit-logs-page">
    <section class="settings-page__panel audit-logs-page__filters" data-testid="audit-logs-filters">
      <div class="audit-logs-page__filter-row">
        <label class="app-field">
          <span>日志类型</span>
          <select v-model="filters.logType" class="copy-dialog__search" data-testid="audit-log-type">
            <option value="">全部</option>
            <option value="login">登录日志</option>
            <option value="operation">操作日志</option>
          </select>
        </label>
        <label class="app-field">
          <span>关键词</span>
          <input v-model="filters.q" class="copy-dialog__search" type="text" data-testid="audit-log-query" />
        </label>
        <label class="app-field">
          <span>IP 地址</span>
          <input v-model="auditIpQuery" class="copy-dialog__search" type="text" data-testid="audit-ip-query" />
        </label>
        <label class="app-field">
          <span>身份</span>
          <select v-model="filters.actorType" class="copy-dialog__search" data-testid="audit-log-actor">
            <option value="">全部</option>
            <option value="teacher">老师</option>
            <option value="student">学生</option>
          </select>
        </label>
        <label class="app-field">
          <span>结果</span>
          <select v-model="filters.result" class="copy-dialog__search" data-testid="audit-log-result">
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="failure">失败</option>
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

    <section class="settings-page__panel audit-logs-page__panel" data-testid="audit-logs-panel">
      <div class="audit-logs-page__head">
        <div>
          <div class="classes-page__eyebrow">日志审计</div>
          <h3>最近日志</h3>
        </div>
        <div class="audit-logs-page__head-actions">
          <button class="button button--ghost" type="button" data-testid="audit-logs-export" :disabled="!logs.length" @click="exportAuditLogs">
            导出日志
          </button>
          <button class="button button--ghost" type="button" data-testid="audit-logs-refresh" @click="loadLogs">刷新</button>
        </div>
      </div>

      <div class="audit-logs-page__table-frame" :style="auditLogTableFrameStyle">
        <table class="files-table audit-logs-page__table" data-testid="audit-logs-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>账号</th>
              <th>身份</th>
              <th>说明</th>
              <th>IP 地址</th>
              <th>结果</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in logs" :key="`${item.logType}-${item.id}`">
              <td>{{ formatAuditTime(item.occurredAt) }}</td>
              <td>
                <span
                  class="status-pill"
                  :class="auditLogTypeTone(item.logType)"
                  :data-testid="`audit-log-type-badge-${item.logType}-${item.id}`"
                >
                  {{ auditLogTypeLabel(item.logType) }}
                </span>
              </td>
              <td>{{ auditAccountLabel(item) }}</td>
              <td>{{ actorTypeLabel(item.actorType) }}</td>
              <td>
                <span class="audit-logs-page__action-cell">
                  <span
                    v-if="auditActionBadge(item.action)"
                    class="status-pill audit-logs-page__action-badge"
                    :class="auditActionBadge(item.action)?.tone"
                    :data-testid="`audit-log-action-badge-${item.logType}-${item.id}`"
                  >
                    {{ auditActionBadge(item.action)?.label }}
                  </span>
                  <span class="audit-logs-page__action-text">{{ item.action || "-" }}</span>
                </span>
              </td>
              <td>{{ item.ipAddress || "-" }}</td>
              <td>{{ item.result || "-" }}</td>
            </tr>
            <tr v-if="!logs.length">
              <td class="files-table__empty" colspan="7">{{ loading ? "正在加载日志..." : "暂无日志" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationControls
        :page="logPage"
        :page-size="logPageSize"
        :page-size-options="auditLogPageSizeOptions"
        :total="logPagination.total"
        :total-pages="logTotalPages"
        test-id-prefix="audit-log"
        @update:page-size="updateLogPageSize"
        @go="goLogPage"
        @prev="goPrevLogPage"
        @next="goNextLogPage"
      />
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
  type AuditLogFilters,
  type AuditLogItem,
  type PaginationPayload,
} from "@/api/client";
import ConfirmDialog from "@/components/ConfirmDialog.vue";
import PaginationControls from "@/components/PaginationControls.vue";
import { exportRowsToSpreadsheet } from "@/utils/spreadsheet-export";

const logs = ref<AuditLogItem[]>([]);
const loading = ref(false);
const errorText = ref("");
const filters = reactive<AuditLogFilters>({
  logType: "",
  actorType: "",
  result: "",
  q: "",
});
const auditIpQuery = ref("");
const sharedDateFrom = ref("");
const sharedDateTo = ref("");
const clearBeforeDate = ref("");
const clearConfirmOpen = ref(false);
const clearLoading = ref(false);
const clearFeedback = ref("");
const auditLogPageSizeOptions = [8, 16, 30];
const logPage = ref(1);
const logPageSize = ref(8);
const logPagination = ref<PaginationPayload>({
  page: 1,
  pageSize: 8,
  total: 0,
  totalPages: 1,
});
let logsRequestToken = 0;
let filterTimer: number | undefined;

const clearConfirmMessage = computed(() => (
  `将清理 ${clearBeforeDate.value || "所选日期"} 以前的登录日志和操作日志。该操作不可撤销。`
));
const filterSignature = computed(() => JSON.stringify({
  logType: filters.logType,
  actorType: filters.actorType,
  result: filters.result,
  query: filters.q,
  ip: auditIpQuery.value,
  from: sharedDateFrom.value,
  to: sharedDateTo.value,
}));
const logTotalPages = computed(() => Math.max(1, logPagination.value.totalPages));
const auditLogTableFrameStyle = computed<Record<string, string>>(() => ({
  "--audit-log-page-size": String(logPageSize.value),
}));

function formatAuditTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || "-";
  }
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function actorTypeLabel(value: AuditLogItem["actorType"]): string {
  return value === "student" ? "学生" : "老师";
}

function auditLogTypeLabel(value: AuditLogItem["logType"]): string {
  if (value === "login") {
    return "登录";
  }
  if (value === "operation") {
    return "操作";
  }
  return "其他";
}

function auditLogTypeTone(value: AuditLogItem["logType"]): string {
  if (value === "login") {
    return "status-pill--accent";
  }
  if (value === "operation") {
    return "status-pill--success";
  }
  return "status-pill--neutral";
}

type AuditActionBadge = {
  label: string;
  tone: string;
};

function auditActionBadge(action: string): AuditActionBadge | null {
  const normalized = action.trim();
  if (normalized === "") {
    return null;
  }
  if (normalized.includes("下载学生提交文件") || normalized.includes("下载本人提交文件") || normalized.includes("下载提交文件")) {
    return { label: "提交文件", tone: "status-pill--warning" };
  }
  if (normalized.includes("下载作业提交包")) {
    return { label: "提交包", tone: "status-pill--warning" };
  }
  if (normalized.includes("下载作业附件")) {
    return { label: "作业附件", tone: "status-pill--neutral" };
  }
  if (normalized.includes("提交作业")) {
    return { label: "提交作业", tone: "status-pill--success" };
  }
  if (normalized.includes("下载资料") || normalized.includes("下载文件")) {
    return { label: "资料下载", tone: "status-pill--accent" };
  }
  return null;
}

function auditAccountLabel(item: AuditLogItem): string {
  return item.actorName.trim() || item.account.trim() || "-";
}

async function loadLogs(): Promise<void> {
  const requestToken = ++logsRequestToken;
  loading.value = true;
  errorText.value = "";
  try {
    const query: AuditLogFilters = {
      ...filters,
      ip: auditIpQuery.value,
      from: sharedDateFrom.value,
      to: sharedDateTo.value,
      page: logPage.value,
      pageSize: logPageSize.value,
    };
    const response = await api.auditLogs(query);
    if (requestToken !== logsRequestToken) {
      return;
    }
    logs.value = response.logs ?? [];
    logPagination.value = response.pagination;
  } catch (error) {
    if (requestToken !== logsRequestToken) {
      return;
    }
    errorText.value = error instanceof ApiError ? error.message : "加载日志失败";
    logs.value = [];
    logPagination.value = { page: 1, pageSize: logPageSize.value, total: 0, totalPages: 1 };
  } finally {
    if (requestToken === logsRequestToken) {
      loading.value = false;
    }
  }
}

function resetFilters(): void {
  const previousSignature = filterSignature.value;
  filters.logType = "";
  filters.actorType = "";
  filters.result = "";
  filters.q = "";
  auditIpQuery.value = "";
  sharedDateFrom.value = "";
  sharedDateTo.value = "";
  logPage.value = 1;
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
    logPage.value = 1;
    void loadLogs();
  }, 120);
}

function updateLogPageSize(value: number): void {
  logPageSize.value = value;
  logPage.value = 1;
  void loadLogs();
}

function goPrevLogPage(): void {
  logPage.value = Math.max(1, logPage.value - 1);
  void loadLogs();
}

function goNextLogPage(): void {
  logPage.value = Math.min(logTotalPages.value, logPage.value + 1);
  void loadLogs();
}

function goLogPage(page: number): void {
  const nextPage = Math.min(Math.max(1, Math.trunc(page)), logTotalPages.value);
  if (nextPage === logPage.value) {
    return;
  }
  logPage.value = nextPage;
  void loadLogs();
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

function exportAuditLogs(): void {
  exportRowsToSpreadsheet({
    fileName: "日志审计.xls",
    sheetName: "日志审计",
    rows: logs.value,
    columns: [
      { header: "时间", value: (row) => formatAuditTime(row.occurredAt) },
      { header: "类型", value: (row) => auditLogTypeLabel(row.logType) },
      { header: "账号", value: (row) => auditAccountLabel(row) },
      { header: "身份", value: (row) => actorTypeLabel(row.actorType) },
      { header: "说明", value: (row) => row.action || "-" },
      { header: "IP 地址", value: (row) => row.ipAddress || "-" },
      { header: "结果", value: (row) => row.result || "-" },
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
  flex-wrap: wrap;
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

.audit-logs-page__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.audit-logs-page__table-frame {
  align-self: start;
  width: 100%;
  min-height: calc(44px * (var(--audit-log-page-size) + 1));
  overflow-x: auto;
  background: var(--bg-surface);
  border: 1px solid var(--border-soft);
  border-radius: 14px;
  box-shadow: var(--shadow-soft);
}

.audit-logs-page__table {
  width: 100%;
  min-width: 720px;
  height: auto;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.audit-logs-page__table thead tr,
.audit-logs-page__table tbody tr {
  height: 44px;
}

.audit-logs-page__table th,
.audit-logs-page__table td {
  box-sizing: border-box;
  height: 44px;
  max-height: 44px;
}

.audit-logs-page__action-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  vertical-align: middle;
}

.audit-logs-page__action-badge {
  min-width: max-content;
}

.audit-logs-page__action-text {
  min-width: 0;
}

@media (max-width: 640px) {
  .audit-logs-page__head {
    align-items: stretch;
    flex-direction: column;
  }

  .audit-logs-page__head-actions,
  .audit-logs-page__tabs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  }
}
</style>
