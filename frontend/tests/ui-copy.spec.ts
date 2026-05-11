import { describe, expect, it } from "vitest";
import {
  assignmentStatusLabel,
  assignmentStatusTone,
  reviewStatusLabel,
  submissionStatusLabel,
  submissionStatusTone,
  studentAssignmentStatusLabel,
  studentAssignmentStatusTone,
  teacherRoleLabel,
  teacherStateLabel,
  uploadSuccessMessage,
  uiCopy,
} from "@/utils/ui-copy";

describe("ui copy helpers", () => {
  it("formats assignment and review statuses consistently", () => {
    expect(assignmentStatusLabel("draft")).toBe("未发布");
    expect(assignmentStatusLabel("published")).toBe("已发布");
    expect(assignmentStatusTone("draft")).toBe("status-pill--warning");
    expect(assignmentStatusTone("published")).toBe("status-pill--success");
    expect(reviewStatusLabel("pending")).toBe("未批改");
    expect(reviewStatusLabel("reviewed")).toBe("已批改");
    expect(submissionStatusLabel("submitted")).toBe("已提交");
    expect(submissionStatusLabel("partial")).toBe("待补齐");
    expect(submissionStatusTone("submitted")).toBe("status-pill--success");
    expect(submissionStatusTone("partial")).toBe("status-pill--warning");
  });

  it("formats teacher role and teacher state consistently", () => {
    expect(teacherRoleLabel("owner")).toBe("系统负责人");
    expect(teacherRoleLabel("staff")).toBe("普通老师");
    expect(teacherStateLabel(false)).toBe("使用中");
    expect(teacherStateLabel(true)).toBe("已停用");
  });

  it("formats student assignment status consistently", () => {
    expect(studentAssignmentStatusLabel({ overdue: false, submission: null })).toBe("未提交");
    expect(studentAssignmentStatusLabel({ overdue: false, submission: { id: 1 } })).toBe("已提交");
    expect(studentAssignmentStatusLabel({ overdue: false, submission: { id: 3, status: "partial" } })).toBe("已保存待补齐");
    expect(studentAssignmentStatusLabel({ overdue: true, submission: null })).toBe("已截止");
    expect(studentAssignmentStatusLabel({ overdue: true, submission: { id: 2 } })).toBe("已截止（已提交）");
    expect(studentAssignmentStatusLabel({ overdue: true, submission: { id: 4, status: "partial" } })).toBe("已截止（待补齐）");
    expect(studentAssignmentStatusTone({ overdue: false, submission: null })).toBe("status-pill--neutral");
    expect(studentAssignmentStatusTone({ overdue: false, submission: { id: 1 } })).toBe("status-pill--success");
    expect(studentAssignmentStatusTone({ overdue: false, submission: { id: 3, status: "partial" } })).toBe("status-pill--warning");
    expect(studentAssignmentStatusTone({ overdue: true, submission: null })).toBe("status-pill--danger");
    expect(studentAssignmentStatusTone({ overdue: true, submission: { id: 2 } })).toBe("status-pill--accent");
    expect(studentAssignmentStatusTone({ overdue: true, submission: { id: 4, status: "partial" } })).toBe("status-pill--warning");
  });

  it("exports shared empty-state copy", () => {
    expect(uiCopy.emptyAssignmentDescription).toBe("暂无作业说明");
    expect(uiCopy.emptyValue).toBe("未设置");
    expect(uiCopy.emptyStudentAssignments).toBe("当前还没有可查看的作业。");
    expect(uiCopy.emptyDirectory).toBe("当前目录暂无文件。");
    expect(uiCopy.previewLoadFailed).toBe("预览加载失败");
  });

  it("formats upload success summary consistently", () => {
    expect(uploadSuccessMessage({
      createdCount: 2,
      replacedCount: 1,
      renamedCount: 0,
      skippedCount: 0,
    }, false)).toBe("文件上传成功：新增 2 项，覆盖 1 项");
    expect(uploadSuccessMessage({
      createdCount: 1,
      replacedCount: 0,
      renamedCount: 1,
      skippedCount: 1,
    }, true)).toBe("文件夹上传成功：新增 1 项，重命名 1 项，跳过 1 项");
    expect(uiCopy.folderCreatedSuccess).toBe("文件夹已创建");
    expect(uiCopy.deleteSuccess).toBe("已删除");
  });
});
