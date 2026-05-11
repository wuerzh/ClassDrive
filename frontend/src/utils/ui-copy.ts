export const uiCopy = {
  emptyAssignmentDescription: "暂无作业说明",
  emptyValue: "未设置",
  emptyClasses: "当前还没有班级数据。",
  emptyStudents: "当前班级还没有学生。",
  emptyDirectory: "当前目录暂无文件。",
  emptyPublicDirectory: "当前目录为空。",
  emptyTeacherAssignments: "当前班级还没有作业。",
  emptyStudentAssignments: "当前还没有可查看的作业。",
  emptyStudentSubmissions: "当前还没有学生提交",
  emptyStudentSubmissionFiles: "当前还没有提交附件。",
  emptyTeacherAttachments: "当前作业还没有附件",
  emptyStudentAttachments: "老师暂未上传作业附件。",
  assignmentNotFound: "未找到该作业",
  previewLoadFailed: "预览加载失败",
  folderCreatedSuccess: "文件夹已创建",
  fileCreatedSuccess: "文件已创建",
  renameSuccess: "已重命名",
  moveSuccess: "移动成功",
  copySuccess: "复制成功",
  deleteSuccess: "已删除",
  saveSuccess: "已保存",
} as const;

export function assignmentStatusLabel(status: "draft" | "published") {
  return status === "published" ? "已发布" : "未发布";
}

export function assignmentStatusTone(status: "draft" | "published") {
  return status === "published" ? "status-pill--success" : "status-pill--warning";
}

export function reviewStatusLabel(status: "pending" | "reviewed") {
  return status === "reviewed" ? "已批改" : "未批改";
}

export function teacherRoleLabel(role: string | null | undefined) {
  return role === "owner" ? "系统负责人" : "普通老师";
}

export function teacherStateLabel(disabled: boolean) {
  return disabled ? "已停用" : "使用中";
}

type StudentAssignmentStatusInput = {
  overdue: boolean;
  submission: { id: number; status?: "partial" | "submitted" } | null;
};

export function studentAssignmentStatusLabel(assignment: StudentAssignmentStatusInput) {
  if (assignment.overdue && assignment.submission?.status === "partial") {
    return "已截止（待补齐）";
  }
  if (assignment.overdue && assignment.submission) {
    return "已截止（已提交）";
  }
  if (assignment.overdue) {
    return "已截止";
  }
  if (assignment.submission?.status === "partial") {
    return "已保存待补齐";
  }
  if (assignment.submission) {
    return "已提交";
  }
  return "未提交";
}

export function studentAssignmentStatusTone(assignment: StudentAssignmentStatusInput) {
  if (assignment.submission?.status === "partial") {
    return "status-pill--warning";
  }
  if (assignment.overdue && assignment.submission) {
    return "status-pill--accent";
  }
  if (assignment.overdue) {
    return "status-pill--danger";
  }
  if (assignment.submission) {
    return "status-pill--success";
  }
  return "status-pill--neutral";
}

export function submissionStatusLabel(status: "partial" | "submitted") {
  return status === "partial" ? "待补齐" : "已提交";
}

export function submissionStatusTone(status: "partial" | "submitted") {
  return status === "partial" ? "status-pill--warning" : "status-pill--success";
}

export function uploadSuccessMessage(
  summary: {
    createdCount: number;
    replacedCount: number;
    renamedCount: number;
    skippedCount: number;
  },
  directoryUpload: boolean,
) {
  const prefix = directoryUpload ? "文件夹上传成功" : "文件上传成功";
  const details: string[] = [];
  if (summary.createdCount > 0) {
    details.push(`新增 ${summary.createdCount} 项`);
  }
  if (summary.replacedCount > 0) {
    details.push(`覆盖 ${summary.replacedCount} 项`);
  }
  if (summary.renamedCount > 0) {
    details.push(`重命名 ${summary.renamedCount} 项`);
  }
  if (summary.skippedCount > 0) {
    details.push(`跳过 ${summary.skippedCount} 项`);
  }
  return details.length > 0 ? `${prefix}：${details.join("，")}` : prefix;
}
