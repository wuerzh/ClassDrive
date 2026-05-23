import { useUploadStore } from "@/stores/upload";

export interface SessionUser {
  id: number;
  username: string;
  displayName: string;
  role?: "owner" | "staff";
}

export interface TeacherProfilePreferences {
  compactListEnabled: boolean;
}

export interface TeacherProfile {
  id: number;
  username: string;
  displayName: string;
  role: "owner" | "staff";
  preferences: TeacherProfilePreferences;
}

export interface SystemSettings {
  uploadPanelEnabled: boolean;
  singleAccountLoginEnabled: boolean;
  serverPort: string;
  serverHost: string;
}

export interface TeacherUser {
  id: number;
  username: string;
  displayName: string;
  role: "owner" | "staff";
  disabled: boolean;
}

export interface LoginLogItem {
  id: number;
  occurredAt: string;
  actorType: "teacher" | "student";
  actorName: string;
  username: string;
  status: "success" | "failure";
  ipAddress: string;
  message: string;
}

export interface OperationLogItem {
  id: number;
  occurredAt: string;
  actorType: "teacher" | "student";
  actorName: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress: string;
  summary: string;
}

export type AuditLogType = "login" | "operation" | (string & {});

export interface AuditLogItem {
  id: number;
  logType: AuditLogType;
  occurredAt: string;
  actorType: "teacher" | "student";
  account: string;
  actorName: string;
  action: string;
  result: string;
  ipAddress: string;
}

export interface AuditLogFilters {
  logType?: "" | "login" | "operation";
  actorType?: "" | AuditLogItem["actorType"];
  result?: "" | "success" | "failure";
  q?: string;
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface LoginLogFilters {
  actorType?: "" | LoginLogItem["actorType"];
  status?: "" | LoginLogItem["status"];
  q?: string;
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface OperationLogFilters {
  actorType?: "" | OperationLogItem["actorType"];
  method?: "" | "POST" | "PUT" | "PATCH" | "DELETE";
  q?: string;
  ip?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export interface ClearAuditLogsResult {
  deletedLoginLogs: number;
  deletedOperationLogs: number;
}

export interface StudentSessionUser {
  id: number;
  classId: number;
  studentNo: string;
  displayName: string;
  className: string;
  mustChangePassword?: boolean;
}

export interface ShellItem {
  key: string;
  label: string;
  href: string;
  placeholder: boolean;
}

export interface ClassItem {
  id: number;
  name: string;
  joinCode?: string;
  joinCodeStatus?: string;
  joinCodeHint?: string;
  registrationEnabled?: boolean;
  registrationExpiresAt?: string;
}

export interface PaginationPayload {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StudentItem {
  id: number;
  classId: number;
  studentNo: string;
  displayName: string;
  activatedAt: string;
  mustChangePassword?: boolean;
}

export interface StudentPasswordResetResult {
  student: StudentItem;
  defaultPassword: string;
}

export type AssignmentSubmissionMode = "any" | "files" | "folder";
export type AssignmentSubmissionTypeCategory = "mixed" | "image" | "word" | "pdf" | "archive";
export type StudentRegistrationQuery = "registered" | "unregistered";

export interface AssignmentItem {
  id: number;
  classId: number;
  title: string;
  description: string;
  dueAt: string;
  status: "draft" | "published";
  submissionMode: AssignmentSubmissionMode;
  submissionTypeCategory?: AssignmentSubmissionTypeCategory;
  minFileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentAttachmentItem {
  id: number;
  name: string;
  path: string;
  kind: "file" | "dir";
  size: number;
  downloadUrl: string;
  archiveUrl?: string;
  previewUrl: string;
  fileCount?: number;
  folderCount?: number;
  children?: AssignmentAttachmentItem[];
}

export type AssignmentSubmissionStatus = "partial" | "submitted";

export interface AssignmentSubmissionItem {
  id: number;
  studentId: number;
  studentNo: string;
  displayName: string;
  status: AssignmentSubmissionStatus;
  submittedAt: string;
  updatedAt: string;
  reviewStatus: "pending" | "reviewed";
  teacherCommentSummary: string;
  reviewedAt: string;
  reviewerName: string;
  items: AssignmentAttachmentItem[];
}

export interface StudentSubmissionConstraints {
  allowedTypesLabel: string;
  maxFileSizeBytes: number;
  maxFileSizeLabel: string;
}

export interface StudentSubmissionSummary {
  id: number;
  status: AssignmentSubmissionStatus;
  submittedAt: string;
  updatedAt: string;
}

export interface StudentAssignmentItem {
  id: number;
  classId: number;
  title: string;
  description: string;
  dueAt: string;
  status: "published";
  submissionMode: AssignmentSubmissionMode;
  submissionTypeCategory?: AssignmentSubmissionTypeCategory;
  minFileCount: number;
  createdAt: string;
  updatedAt: string;
  overdue: boolean;
  submission: StudentSubmissionSummary | null;
}

export interface StudentAssignmentListQueryOptions {
  page?: number;
  pageSize?: number;
}

export interface StudentAssignmentDetail extends StudentAssignmentItem {
  submissionConstraints: StudentSubmissionConstraints;
  assignmentAttachments: AssignmentAttachmentItem[];
  items: AssignmentAttachmentItem[];
}

export interface RecentCopyTargetItem {
  space: string;
  classId?: number;
  path: string;
  label: string;
  pinned?: boolean;
}

export type FileSpace = "library" | "public" | "class";
export type UploadConflictMode = "reject" | "skip" | "replace" | "rename";

export interface UploadFileItem {
  file: File;
  relativePath?: string;
}

export interface UploadFilesResult {
  items: FileItem[];
  summary: {
    createdCount: number;
    replacedCount: number;
    renamedCount: number;
    skippedCount: number;
  };
}

export interface FileContentResult {
  item: FileItem;
  content: string;
}

const resumableUploadChunkSize = 256 * 1024;
const tusResumableVersion = "1.0.0";

function clampUploadBytes(value: number, totalBytes: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (totalBytes <= 0) {
    return Math.max(0, Math.round(value));
  }
  return Math.min(totalBytes, Math.max(0, Math.round(value)));
}

function mapMultipartLoadedBytes(loaded: number, transportTotal: number, totalBytes: number) {
  if (transportTotal > 0) {
    return clampUploadBytes((loaded / transportTotal) * totalBytes, totalBytes);
  }
  return clampUploadBytes(loaded, totalBytes);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export interface FileItem {
  id: number;
  name: string;
  path: string;
  kind: "file" | "dir";
  size: number;
  mimeType?: string;
  downloadUrl: string;
  archiveUrl: string;
  previewUrl: string;
  updatedAt: string;
}

export interface FilesPayload {
  space: FileSpace;
  classId?: number;
  currentPath: string;
  items: FileItem[];
  pagination?: PaginationPayload;
}

export interface ClassesPayload {
  classes: ClassItem[];
  pagination: PaginationPayload;
}

export interface StudentsPayload {
  students: StudentItem[];
  pagination: PaginationPayload;
}

export interface AssignmentsPayload {
  assignments: AssignmentItem[];
  pagination: PaginationPayload;
}

export interface AssignmentSubmissionsPayload {
  submissions: AssignmentSubmissionItem[];
  submissionConstraints: StudentSubmissionConstraints;
  pagination?: PaginationPayload;
}

export interface AssignmentStatisticsRow {
  studentId: number;
  studentNo: string;
  displayName: string;
  submittedCount: number;
  missingCount: number;
}

export interface AssignmentStatisticsPayload {
  classId: number;
  assignmentIds: number[];
  rosterTotal: number;
  assignmentTotal: number;
  expectedTotal: number;
  submittedTotal: number;
  missingTotal: number;
  rows: AssignmentStatisticsRow[];
}

export type FileSearchType = "image" | "audio" | "video" | "pdf" | "dir" | "file";
export type FileSearchCaseMode = "sensitive" | "insensitive";

export interface ParsedFileSearchQuery {
  rawQuery: string;
  keyword: string;
  typeFilter: FileSearchType | null;
  caseMode: FileSearchCaseMode | null;
  errors: string[];
}

export interface TeacherListQueryOptions {
  q?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface StudentListQueryOptions extends TeacherListQueryOptions {
  classId: number;
  registration?: StudentRegistrationQuery;
}

export interface AssignmentListQueryOptions extends TeacherListQueryOptions {
  classId: number;
}

export interface AssignmentSubmissionListQueryOptions extends TeacherListQueryOptions {
  classId: number;
}

const fileSearchTypeLabels: Record<FileSearchType, string> = {
  image: "图片",
  audio: "音频",
  video: "视频",
  pdf: "PDF",
  dir: "文件夹",
  file: "文件",
};

const fileSearchCaseLabels: Record<FileSearchCaseMode, string> = {
  sensitive: "区分大小写",
  insensitive: "不区分大小写",
};

function buildListQueryString(options: TeacherListQueryOptions & { classId?: number; registration?: StudentRegistrationQuery }) {
  const params = new URLSearchParams();
  if (typeof options.classId === "number" && Number.isFinite(options.classId)) {
    params.set("classId", String(options.classId));
  }
  if (typeof options.q === "string" && options.q.trim()) {
    params.set("q", options.q.trim());
  }
  if (typeof options.sort === "string" && options.sort.trim()) {
    params.set("sort", options.sort.trim());
  }
  if (options.registration === "registered" || options.registration === "unregistered") {
    params.set("registration", options.registration);
  }
  if (typeof options.page === "number" && Number.isFinite(options.page) && options.page > 0) {
    params.set("page", String(Math.trunc(options.page)));
  }
  if (typeof options.pageSize === "number" && Number.isFinite(options.pageSize) && options.pageSize > 0) {
    params.set("pageSize", String(Math.trunc(options.pageSize)));
  }
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function buildAuditLogQueryString(filters: LoginLogFilters | OperationLogFilters = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "string" && value.trim()) {
      params.set(key, value.trim());
    }
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      params.set(key, String(Math.trunc(value)));
    }
  }
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function parseFileSearchQuery(query: string): ParsedFileSearchQuery {
  const trimmedQuery = query.trim();
  const parsed: ParsedFileSearchQuery = {
    rawQuery: trimmedQuery,
    keyword: "",
    typeFilter: null,
    caseMode: null,
    errors: [],
  };
  if (!trimmedQuery) {
    return parsed;
  }

  const keywordParts: string[] = [];
  for (const token of trimmedQuery.split(/\s+/).filter(Boolean)) {
    const lowerToken = token.toLowerCase();
    if (lowerToken.startsWith("type:")) {
      const typeValue = token.slice("type:".length).trim().toLowerCase();
      if (typeValue === "image" || typeValue === "audio" || typeValue === "video" || typeValue === "pdf" || typeValue === "dir" || typeValue === "file") {
        parsed.typeFilter = typeValue;
      } else {
        parsed.errors.push("type");
      }
      continue;
    }
    if (lowerToken.startsWith("case:")) {
      const caseValue = token.slice("case:".length).trim().toLowerCase();
      if (caseValue === "sensitive" || caseValue === "insensitive") {
        parsed.caseMode = caseValue;
      } else {
        parsed.errors.push("case");
      }
      continue;
    }
    keywordParts.push(token);
  }

  parsed.keyword = keywordParts.join(" ");
  return parsed;
}

export function describeFileSearchQuery(query: string): string {
  const parsed = parseFileSearchQuery(query);
  const parts: string[] = [];
  if (parsed.keyword) {
    parts.push(`关键词：${parsed.keyword}`);
  }
  if (parsed.typeFilter) {
    parts.push(`类型：${fileSearchTypeLabels[parsed.typeFilter]}`);
  }
  if (parsed.caseMode) {
    parts.push(`大小写：${fileSearchCaseLabels[parsed.caseMode]}`);
  }
  return parts.join("；");
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface UnauthorizedContext {
  input: string;
  error: ApiError;
}

let unauthorizedHandler: ((context: UnauthorizedContext) => void | Promise<void>) | null = null;

export function setUnauthorizedHandler(handler: ((context: UnauthorizedContext) => void | Promise<void>) | null): void {
  unauthorizedHandler = handler;
}

function shouldNotifyUnauthorized(input: string): boolean {
  return input !== "/api/session" &&
    input !== "/api/student/session" &&
    input !== "/api/auth/login" &&
    input !== "/api/student/auth/login" &&
    input !== "/api/student/auth/activate" &&
    input !== "/api/student/password";
}

async function readRequestError(response: Response): Promise<Error> {
  const errorBody = (await response.json().catch(() => ({
    error: {
      code: "server_error",
      message: "请求失败",
    },
  }))) as { error?: { code?: string; message?: string } };
  return new ApiError(
    response.status,
    errorBody.error?.code ?? "server_error",
    errorBody.error?.message ?? "请求失败",
  );
}

function encodeTusMetadata(values: Record<string, string | undefined>) {
  const encoder = new TextEncoder();
  return Object.entries(values)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => {
      const bytes = encoder.encode(value as string);
      const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
      return `${key} ${btoa(binary)}`;
    })
    .join(",");
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T;
  return payload;
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({
      error: {
        code: "server_error",
        message: "请求失败",
      },
    }))) as { error: { code: string; message: string } };

    const error = new ApiError(response.status, errorBody.error.code, errorBody.error.message);
    if (error.status === 401 && shouldNotifyUnauthorized(input)) {
      void unauthorizedHandler?.({ input, error });
    }
    throw error;
  }

  return readJson<T>(response);
}

export const api = {
  session() {
    return request<{ user: SessionUser }>("/api/session");
  },
  studentSession() {
    return request<{ user: StudentSessionUser }>("/api/student/session");
  },
  login(username: string, password: string) {
    return request<{ user: SessionUser }>("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  },
  logout() {
    return request<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
    });
  },
  profileSettings() {
    return request<{ profile: TeacherProfile }>("/api/settings/profile");
  },
  updateProfileSettings(payload: { displayName: string; preferences: TeacherProfilePreferences }) {
    return request<{ profile: TeacherProfile }>("/api/settings/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  updatePassword(payload: { currentPassword: string; newPassword: string }) {
    return request<{ ok: boolean }>("/api/settings/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  systemSettings() {
    return request<{ settings: SystemSettings }>("/api/settings/system");
  },
  updateSystemSettings(payload: Pick<SystemSettings, "uploadPanelEnabled" | "singleAccountLoginEnabled" | "serverPort">) {
    return request<{ settings: SystemSettings }>("/api/settings/system", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  loginLogs(filters: LoginLogFilters = {}) {
    return request<{ logs: LoginLogItem[]; pagination: PaginationPayload }>(`/api/audit/login-logs${buildAuditLogQueryString(filters)}`);
  },
  operationLogs(filters: OperationLogFilters = {}) {
    return request<{ logs: OperationLogItem[]; pagination: PaginationPayload }>(`/api/audit/operation-logs${buildAuditLogQueryString(filters)}`);
  },
  auditLogs(filters: AuditLogFilters = {}) {
    return request<{ logs: AuditLogItem[]; pagination: PaginationPayload }>(`/api/audit/logs${buildAuditLogQueryString(filters)}`);
  },
  clearAuditLogs(before: string) {
    const params = new URLSearchParams({ before });
    return request<ClearAuditLogsResult>(`/api/audit/logs?${params.toString()}`, {
      method: "DELETE",
    });
  },
  teachers() {
    return request<{ teachers: TeacherUser[] }>("/api/teachers");
  },
  createTeacher(payload: { username: string; displayName: string; password: string; role: "owner" | "staff" }) {
    return request<{ teacher: TeacherUser }>("/api/teachers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  teacher(teacherId: number) {
    return request<{ teacher: TeacherUser }>(`/api/teachers/${teacherId}`);
  },
  updateTeacher(
    teacherId: number,
    payload: Partial<Pick<TeacherUser, "displayName" | "role" | "disabled">> & { password?: string },
  ) {
    return request<{ teacher: TeacherUser }>(`/api/teachers/${teacherId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  studentActivate(joinCode: string, studentNo: string, password: string) {
    return request<{ user: StudentSessionUser }>("/api/student/auth/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ joinCode, studentNo, password }),
    });
  },
  studentLogin(studentNo: string, password: string) {
    return request<{ user: StudentSessionUser }>("/api/student/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ studentNo, password }),
    });
  },
  studentLogout() {
    return request<{ ok: boolean }>("/api/student/auth/logout", {
      method: "POST",
    });
  },
  changeStudentPassword(payload: { currentPassword: string; newPassword: string }) {
    return request<{ user: StudentSessionUser }>("/api/student/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  studentAssignments(options: StudentAssignmentListQueryOptions = {}) {
    return request<{ assignments: StudentAssignmentItem[]; submissionConstraints: StudentSubmissionConstraints; pagination: PaginationPayload }>(
      `/api/student/assignments${buildListQueryString(options)}`,
    );
  },
  studentFiles(params: URLSearchParams) {
    return request<FilesPayload>(`/api/student/files?${params.toString()}`);
  },
  studentAssignment(assignmentId: number) {
    return request<StudentAssignmentDetail>(`/api/student/assignments/${assignmentId}`);
  },
  submitStudentAssignment(payload: { assignmentId: number; files: UploadFileItem[] }) {
    const formData = new FormData();
    payload.files.forEach((item) => {
      formData.append("files", item.file);
      formData.append("relativePaths", item.relativePath ?? "");
    });
    return request<{ submission: StudentSubmissionSummary; items: AssignmentAttachmentItem[] }>(
      `/api/student/assignments/${payload.assignmentId}/submission`,
      {
        method: "POST",
        body: formData,
      },
    );
  },
  deleteStudentSubmissionFile(payload: { assignmentId: number; fileId: number }) {
    return request<{ submission: StudentSubmissionSummary | null; items: AssignmentAttachmentItem[] }>(
      `/api/student/assignments/${payload.assignmentId}/submission/files/${payload.fileId}`,
      {
        method: "DELETE",
      },
    );
  },
  shell() {
    return request<{ user: SessionUser; items: ShellItem[] }>("/api/shell");
  },
  classes(options: TeacherListQueryOptions = {}) {
    return request<ClassesPayload>(`/api/classes${buildListQueryString(options)}`);
  },
  createClass(name: string) {
    return request<ClassItem>("/api/classes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
  },
  updateClass(classId: number, name: string) {
    return request<ClassItem>(`/api/classes/${classId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
  },
  deleteClass(classId: number) {
    return request<{ ok: boolean }>(`/api/classes/${classId}`, {
      method: "DELETE",
    });
  },
  refreshClassJoinCode(classId: number) {
    return request<{ joinCode: string; joinCodeHint: string; joinCodeStatus: string; registrationEnabled: boolean; registrationExpiresAt: string }>(`/api/classes/${classId}/join-code`, {
      method: "POST",
    });
  },
  updateClassRegistration(classId: number, enabled: boolean) {
    return request<{ classId: number; joinCode: string; joinCodeHint: string; joinCodeStatus: string; registrationEnabled: boolean; registrationExpiresAt: string }>(`/api/classes/${classId}/join-code`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled }),
    });
  },
  recentCopyTargets() {
    return request<{ items: RecentCopyTargetItem[] }>("/api/preferences/recent-copy-targets");
  },
  saveRecentCopyTargets(items: RecentCopyTargetItem[]) {
    return request<{ items: RecentCopyTargetItem[] }>("/api/preferences/recent-copy-targets", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });
  },
  students(options: number | StudentListQueryOptions) {
    const resolved = typeof options === "number" ? { classId: options } : options;
    return request<StudentsPayload>(`/api/students${buildListQueryString(resolved)}`);
  },
  assignments(options: number | AssignmentListQueryOptions) {
    const resolved = typeof options === "number" ? { classId: options } : options;
    return request<AssignmentsPayload>(`/api/assignments${buildListQueryString(resolved)}`);
  },
  assignment(assignmentId: number, classId: number) {
    return request<AssignmentItem>(`/api/assignments/${assignmentId}?classId=${classId}`);
  },
  assignmentAttachments(assignmentId: number, classId: number) {
    return request<{ items: AssignmentAttachmentItem[] }>(`/api/assignments/${assignmentId}/attachments?classId=${classId}`);
  },
  assignmentSubmissions(assignmentId: number, options: number | AssignmentSubmissionListQueryOptions) {
    const resolved = typeof options === "number" ? { classId: options } : options;
    return request<AssignmentSubmissionsPayload>(`/api/assignments/${assignmentId}/submissions${buildListQueryString(resolved)}`);
  },
  assignmentStatistics(payload: { classId: number; assignmentIds: number[] }) {
    const params = new URLSearchParams({ classId: String(payload.classId) });
    if (payload.assignmentIds.length) {
      params.set("assignmentIds", payload.assignmentIds.join(","));
    }
    return request<AssignmentStatisticsPayload>(`/api/assignments/statistics?${params.toString()}`);
  },
  assignmentSubmissionsArchiveUrl(payload: { classId: number; assignmentIds?: number[] }) {
    const params = new URLSearchParams({ classId: String(payload.classId) });
    if (payload.assignmentIds?.length) {
      params.set("assignmentIds", payload.assignmentIds.join(","));
    }
    return `/api/assignments/submissions/archive?${params.toString()}`;
  },
  reviewAssignmentSubmission(payload: {
    assignmentId: number;
    classId: number;
    submissionId: number;
    reviewStatus: "pending" | "reviewed";
    teacherComment: string;
  }) {
    return request<AssignmentSubmissionItem>(
      `/api/assignments/${payload.assignmentId}/submissions/${payload.submissionId}?classId=${payload.classId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewStatus: payload.reviewStatus,
          teacherComment: payload.teacherComment,
        }),
      },
    );
  },
  updateAssignment(payload: {
    assignmentId: number;
    classId: number;
    title: string;
    description: string;
    dueAt: string;
    status: "draft" | "published";
    submissionMode: AssignmentSubmissionMode;
    submissionTypeCategory: AssignmentSubmissionTypeCategory;
    minFileCount: number;
  }) {
    return request<AssignmentItem>(`/api/assignments/${payload.assignmentId}?classId=${payload.classId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        dueAt: payload.dueAt,
        status: payload.status,
        submissionMode: payload.submissionMode,
        submissionTypeCategory: payload.submissionTypeCategory,
        minFileCount: payload.minFileCount,
      }),
    });
  },
  deleteAssignment(assignmentId: number, classId: number) {
    return request<{ ok: boolean }>(`/api/assignments/${assignmentId}?classId=${classId}`, {
      method: "DELETE",
    });
  },
  uploadAssignmentAttachments(payload: { assignmentId: number; classId: number; files: File[] }) {
    const formData = new FormData();
    payload.files.forEach((file) => formData.append("files", file));
    return request<{ items: AssignmentAttachmentItem[] }>(`/api/assignments/${payload.assignmentId}/attachments?classId=${payload.classId}`, {
      method: "POST",
      body: formData,
    });
  },
  deleteAssignmentAttachment(assignmentId: number, classId: number, fileId: number) {
    return request<{ ok: boolean }>(`/api/assignments/${assignmentId}/attachments/${fileId}?classId=${classId}`, {
      method: "DELETE",
    });
  },
  createStudent(payload: { classId: number; studentNo: string; displayName: string }) {
    return request<StudentItem>("/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  createAssignment(payload: {
    classId: number;
    title: string;
    description: string;
    dueAt: string;
    status: "draft" | "published";
    submissionMode: AssignmentSubmissionMode;
    submissionTypeCategory: AssignmentSubmissionTypeCategory;
    minFileCount: number;
  }) {
    return request<AssignmentItem>("/api/assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  updateStudent(id: number, payload: { studentNo: string; displayName: string }) {
    return request<StudentItem>(`/api/students/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  deleteStudent(id: number) {
    return request<{ ok: boolean }>(`/api/students/${id}`, {
      method: "DELETE",
    });
  },
  resetStudentPassword(id: number) {
    return request<StudentPasswordResetResult>(`/api/students/${id}/reset-password`, {
      method: "POST",
    });
  },
  importStudentsFile(payload: { classId: number; file: File }) {
    const formData = new FormData();
    formData.append("classId", String(payload.classId));
    formData.append("file", payload.file);
    return request<{ students: StudentItem[] }>("/api/students/import-file", {
      method: "POST",
      body: formData,
    });
  },
  files(params: URLSearchParams) {
    return request<FilesPayload>(`/api/files?${params.toString()}`);
  },
  searchFiles(params: URLSearchParams) {
    return request<FilesPayload>(`/api/files/search?${params.toString()}`);
  },
  filesBatchArchiveUrl(entryIds: number[]): string {
    const params = new URLSearchParams();
    params.set("entryIds", entryIds.join(","));
    return `/api/files/batch/archive?${params.toString()}`;
  },
  createFile(payload: { space: string; classId?: number; parentPath: string; name: string; content: string }) {
    return request<FileContentResult>("/api/files/file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  createFolder(payload: { space: string; classId?: number; parentPath: string; name: string }) {
    return request<FileItem>("/api/files/folder", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  renameFile(id: number, name: string) {
    return request<FileItem>(`/api/files/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });
  },
  deleteFile(id: number) {
    return request<{ ok: boolean }>(`/api/files/${id}`, {
      method: "DELETE",
    });
  },
  readFileContent(id: number) {
    return request<FileContentResult>(`/api/files/${id}/content`);
  },
  saveFileContent(id: number, content: string) {
    return request<FileContentResult>(`/api/files/${id}/content`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
  },
  copyFile(payload: { entryId: number; destinationSpace: string; destinationClassId?: number; destinationParentPath: string }) {
    return request<FileItem>("/api/files/copy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  moveFile(payload: { entryId: number; destinationSpace: string; destinationClassId?: number; destinationParentPath: string }) {
    return request<FileItem>("/api/files/move", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  uploadFiles(payload: {
    space: string;
    classId?: number;
    parentPath: string;
    files: UploadFileItem[];
    conflictMode?: UploadConflictMode;
    onProgress?: (sent: number, total: number) => void;
  }) {
    const uploadStore = useUploadStore();
    uploadStore.beginBatch(
      payload.files.map((item, index) => ({
        id: `upload-file-${Date.now()}-${index + 1}`,
        name: item.file.name,
        relativePath: item.relativePath,
        totalBytes: item.file.size,
      })),
    );
    const shouldUseResumableUpload =
      payload.files.length === 1 &&
      !payload.files[0]?.relativePath &&
      (payload.conflictMode ?? "reject") === "reject" &&
      payload.files[0]?.file.size > 0;
    if (shouldUseResumableUpload) {
      return uploadFilesResumable(payload);
    }
    return uploadFilesMultipart(payload);
  },
};

async function uploadFilesResumable(payload: {
  space: string;
  classId?: number;
  parentPath: string;
  files: UploadFileItem[];
  conflictMode?: UploadConflictMode;
  onProgress?: (sent: number, total: number) => void;
}) {
  const uploadStore = useUploadStore();
  const item = payload.files[0];
  if (!item) {
    throw new Error("缺少上传文件");
  }

  const controller = new AbortController();
  uploadStore.setAbortHandler(() => controller.abort());

  try {
    const createResponse = await fetch("/api/files/upload/sessions", {
      method: "POST",
      credentials: "same-origin",
      signal: controller.signal,
      headers: {
        "Tus-Resumable": tusResumableVersion,
        "Upload-Length": String(item.file.size),
        "Upload-Metadata": encodeTusMetadata({
          space: payload.space,
          classId: payload.classId ? String(payload.classId) : undefined,
          parentPath: payload.parentPath,
          filename: item.file.name,
          conflictMode: payload.conflictMode ?? "reject",
        }),
      },
    });
    if (!createResponse.ok) {
      throw await readRequestError(createResponse);
    }

    const uploadUrl = createResponse.headers.get("Location") ?? "";
    if (!uploadUrl) {
      throw new Error("创建上传会话失败");
    }

    let offset = 0;
    while (offset < item.file.size) {
      const nextChunk = item.file.slice(offset, offset + resumableUploadChunkSize);
      const response = await fetch(uploadUrl, {
        method: "PATCH",
        credentials: "same-origin",
        signal: controller.signal,
        headers: {
          "Tus-Resumable": tusResumableVersion,
          "Content-Type": "application/offset+octet-stream",
          "Upload-Offset": String(offset),
        },
        body: nextChunk,
      });
      if (response.status === 409) {
        offset = await readUploadOffset(uploadUrl, controller.signal);
        continue;
      }
      if (!response.ok) {
        throw await readRequestError(response);
      }

      const nextOffset = Number(response.headers.get("Upload-Offset") ?? offset + nextChunk.size);
      uploadStore.applyAggregateProgress(nextOffset, item.file.size);
      payload.onProgress?.(nextOffset, item.file.size);
      offset = nextOffset;
    }

    uploadStore.markBatchDone();
    payload.onProgress?.(item.file.size, item.file.size);
    return {
      items: [],
      summary: {
        createdCount: 1,
        replacedCount: 0,
        renamedCount: 0,
        skippedCount: 0,
      },
    };
  } catch (error) {
    if (uploadStore.abortRequested || isAbortError(error)) {
      uploadStore.markBatchAborted();
      throw new Error("上传已中止");
    }
    uploadStore.markFailedAt(uploadStore.sentBytes);
    throw error;
  } finally {
    uploadStore.setAbortHandler(null);
  }
}

async function readUploadOffset(uploadUrl: string, signal?: AbortSignal) {
  const response = await fetch(uploadUrl, {
    method: "HEAD",
    credentials: "same-origin",
    signal,
    headers: {
      "Tus-Resumable": tusResumableVersion,
    },
  });
  if (!response.ok) {
    throw await readRequestError(response);
  }
  return Number(response.headers.get("Upload-Offset") ?? "0");
}

function uploadFilesMultipart(payload: {
  space: string;
  classId?: number;
  parentPath: string;
  files: UploadFileItem[];
  conflictMode?: UploadConflictMode;
  onProgress?: (sent: number, total: number) => void;
}) {
  const uploadStore = useUploadStore();
  const totalBytes = payload.files.reduce((sum, item) => sum + item.file.size, 0);
  return new Promise<UploadFilesResult>((resolve, reject) => {
    const formData = new FormData();
    formData.append("space", payload.space);
    formData.append("parentPath", payload.parentPath);
    if (payload.classId) {
      formData.append("classId", String(payload.classId));
    }
    if (payload.conflictMode) {
      formData.append("conflictMode", payload.conflictMode);
    }
    payload.files.forEach((item) => {
      formData.append("files", item.file);
      if (item.relativePath) {
        formData.append("relativePaths", item.relativePath);
      } else {
        formData.append("relativePaths", "");
      }
    });

    const request = new XMLHttpRequest();
    uploadStore.setAbortHandler(() => request.abort());
    request.open("POST", "/api/files/upload");
    request.withCredentials = true;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const effectiveSentBytes = mapMultipartLoadedBytes(event.loaded, event.total, totalBytes);
        uploadStore.applyAggregateProgress(effectiveSentBytes, totalBytes);
        payload.onProgress?.(effectiveSentBytes, totalBytes);
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          const parsed = JSON.parse(request.responseText) as UploadFilesResult;
          uploadStore.markBatchDone();
          uploadStore.setAbortHandler(null);
          resolve(parsed);
        } catch (error) {
          uploadStore.markFailedAt(uploadStore.sentBytes);
          uploadStore.setAbortHandler(null);
          reject(error);
        }
        return;
      }
      try {
        const parsed = JSON.parse(request.responseText) as { error?: { message?: string } };
        uploadStore.markFailedAt(uploadStore.sentBytes);
        uploadStore.setAbortHandler(null);
        reject(new Error(parsed.error?.message ?? "上传失败"));
      } catch (error) {
        uploadStore.markFailedAt(uploadStore.sentBytes);
        uploadStore.setAbortHandler(null);
        reject(error);
      }
    };
    request.onerror = () => {
      if (uploadStore.abortRequested) {
        uploadStore.markBatchAborted();
        uploadStore.setAbortHandler(null);
        reject(new Error("上传已中止"));
        return;
      }
      uploadStore.markFailedAt(uploadStore.sentBytes);
      uploadStore.setAbortHandler(null);
      reject(new Error("上传失败"));
    };
    request.onabort = () => {
      uploadStore.markBatchAborted();
      uploadStore.setAbortHandler(null);
      reject(new Error("上传已中止"));
    };
    request.send(formData);
  });
}
