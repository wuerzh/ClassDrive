const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const { chromium } = require("playwright");

const projectDir = path.resolve(__dirname, "..", "..");
const defaultOutDir = path.resolve(projectDir, "docs", "images", "readme");
const suppliedBaseUrl = process.argv[2] && process.argv[2].startsWith("http") ? process.argv[2] : "";
const outDir = path.resolve(suppliedBaseUrl ? process.argv[3] || defaultOutDir : process.argv[2] || defaultOutDir);
const screenshotNames = [
  "teacher-files.png",
  "teacher-classes.png",
  "teacher-students.png",
  "teacher-assignment-list.png",
  "teacher-assignment-create.png",
  "teacher-assignment-statistics.png",
  "teacher-assignment-detail.png",
  "teacher-assignment-missing.png",
  "teacher-assignment-review.png",
  "student-assignments.png",
  "student-assignment-detail.png",
];
const stableCss = `
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
  }
`;

function resolveGoBinary() {
  const executable = process.platform === "win32" ? "go.exe" : "go";
  const candidates = [
    path.resolve(projectDir, ".tooling", "go", "bin", executable),
    path.resolve(projectDir, "..", ".tooling", "go", "bin", executable),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || executable;
}

function getOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(baseUrl, logs) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`后端启动超时。\n${logs.join("").slice(-4000)}`);
}

async function startBackend() {
  const port = process.env.CLASSDRIVE_README_PORT || String(await getOpenPort());
  const baseDir = path.resolve(projectDir, "tmp", `readme-capture-${Date.now()}-${process.pid}`);
  fs.mkdirSync(baseDir, { recursive: true });
  const logs = [];
  const child = spawn(resolveGoBinary(), ["run", "./cmd/classdrive"], {
    cwd: projectDir,
    env: {
      ...process.env,
      CLASSDRIVE_BASE_DIR: baseDir,
      CLASSDRIVE_PORT: port,
      CLASSDRIVE_SEED: "true",
      GOPROXY: process.env.GOPROXY || "https://goproxy.cn,direct",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => logs.push(chunk.toString("utf8")));
  child.stderr.on("data", (chunk) => logs.push(chunk.toString("utf8")));

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForServer(baseUrl, logs);
  return {
    baseUrl,
    async stop() {
      if (child.killed) {
        return;
      }
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        child.kill("SIGTERM");
      }
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
      fs.rmSync(baseDir, { recursive: true, force: true });
    },
  };
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true, channel: "chrome" });
  } catch {
    return chromium.launch({ headless: true });
  }
}

function absoluteUrl(baseUrl, pathname) {
  return new URL(pathname, baseUrl).toString();
}

async function newPage(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1120 },
    baseURL: baseUrl,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  return { context, page };
}

async function stabilize(page) {
  await page.addStyleTag({ content: stableCss });
}

async function screenshot(page, name) {
  await stabilize(page);
  await page.screenshot({
    path: path.join(outDir, name),
    fullPage: true,
  });
}

async function loginAsTeacher(page, baseUrl) {
  await page.goto(absoluteUrl(baseUrl, "/login"));
  await page.getByTestId("teacher-login-username").fill("admin");
  await page.getByTestId("teacher-login-password").fill("demo123");
  await page.getByTestId("teacher-login-submit").click();
  await page.waitForURL("**/files/library");
}

async function teacherRequest(page, url, init = {}) {
  return page.evaluate(async ({ requestUrl, requestInit }) => {
    const response = await fetch(requestUrl, {
      credentials: "same-origin",
      ...requestInit,
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`${requestUrl} -> ${response.status}: ${body}`);
    }
    return body ? JSON.parse(body) : null;
  }, { requestUrl: url, requestInit: init });
}

async function teacherUploadAssignmentAttachments(page, classId, assignmentId) {
  await page.evaluate(async ({ targetClassId, targetAssignmentId }) => {
    const formData = new FormData();
    formData.append("files", new File(["网页作品需包含首页、样式文件和说明文档。"], "作业要求.txt", { type: "text/plain" }));
    formData.append("files", new File(["评分：结构 40%，视觉 30%，说明 30%。"], "评分标准.txt", { type: "text/plain" }));
    const response = await fetch(`/api/assignments/${targetAssignmentId}/attachments?classId=${targetClassId}`, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
  }, { targetClassId: classId, targetAssignmentId: assignmentId });
}

async function seedDemoData(page) {
  const classItem = await teacherRequest(page, "/api/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "软件实训 1 班" }),
  });
  const joinCode = await teacherRequest(page, `/api/classes/${classItem.id}/join-code`, { method: "POST" });
  const students = [
    { studentNo: "20260101", displayName: "李明" },
    { studentNo: "20260102", displayName: "王佳" },
    { studentNo: "20260103", displayName: "陈一" },
  ];
  for (const student of students) {
    await teacherRequest(page, "/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: classItem.id, ...student }),
    });
  }

  const archiveAssignment = await teacherRequest(page, "/api/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classId: classItem.id,
      title: "期末资料归档",
      description: "草稿示例：归档课程资料和项目文件。",
      dueAt: "2030-06-30T09:00:00.000Z",
      status: "draft",
      submissionMode: "files",
      submissionTypeCategory: "archive",
      minFileCount: 1,
    }),
  });
  const imageAssignment = await teacherRequest(page, "/api/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classId: classItem.id,
      title: "课堂练习：配色截图",
      description: "提交一张界面截图，便于课堂点评。",
      dueAt: "2030-06-20T09:00:00.000Z",
      status: "published",
      submissionMode: "files",
      submissionTypeCategory: "image",
      minFileCount: 1,
    }),
  });
  const mainAssignment = await teacherRequest(page, "/api/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classId: classItem.id,
      title: "第 3 周网页作品提交",
      description: "请提交完整项目文件夹，保留目录结构，至少包含首页、样式和说明文件。",
      dueAt: "2030-06-15T09:00:00.000Z",
      status: "published",
      submissionMode: "folder",
      submissionTypeCategory: "mixed",
      minFileCount: 3,
    }),
  });
  await teacherUploadAssignmentAttachments(page, classItem.id, mainAssignment.id);
  return {
    classItem,
    joinCode: joinCode.joinCode,
    students,
    assignments: {
      archive: archiveAssignment,
      image: imageAssignment,
      main: mainAssignment,
    },
  };
}

async function activateStudent(page, baseUrl, joinCode, studentNo, password) {
  await page.goto(absoluteUrl(baseUrl, "/student/activate"));
  await page.getByTestId("student-activate-join-code").fill(joinCode);
  await page.getByTestId("student-activate-no").fill(studentNo);
  await page.getByTestId("student-activate-password").fill(password);
  await page.getByTestId("student-activate-confirm-password").fill(password);
  await page.getByTestId("student-activate-submit").click();
  await page.waitForURL("**/student/assignments");
}

async function submitStudentFiles(page, assignmentId, rootName, label) {
  await page.evaluate(async ({ targetAssignmentId, targetRootName, targetLabel }) => {
    const files = [
      { name: "首页说明.txt", relativePath: `${targetRootName}/首页说明.txt`, content: `${targetLabel} 首页结构说明`, type: "text/plain" },
      { name: "样式说明.txt", relativePath: `${targetRootName}/样式说明.txt`, content: `${targetLabel} 配色与排版说明`, type: "text/plain" },
      { name: "提交说明.txt", relativePath: `${targetRootName}/提交说明.txt`, content: `${targetLabel} 提交说明`, type: "text/plain" },
    ];
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", new File([file.content], file.name, { type: file.type }));
      formData.append("relativePaths", file.relativePath);
    }
    const response = await fetch(`/api/student/assignments/${targetAssignmentId}/submission`, {
      method: "POST",
      credentials: "same-origin",
      body: formData,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
  }, { targetAssignmentId: assignmentId, targetRootName: rootName, targetLabel: label });
}

async function prepareStudent(browser, baseUrl, demo, student, password, rootName) {
  const { context, page } = await newPage(browser, baseUrl);
  await activateStudent(page, baseUrl, demo.joinCode, student.studentNo, password);
  await submitStudentFiles(page, demo.assignments.main.id, rootName, student.displayName);
  return { context, page };
}

async function captureTeacherPages(page, baseUrl, demo) {
  await page.goto(absoluteUrl(baseUrl, "/files/library"));
  await page.getByTestId("files-workspace").waitFor();
  await screenshot(page, "teacher-files.png");

  await page.goto(absoluteUrl(baseUrl, "/classes"));
  await page.getByText(demo.classItem.name).waitFor();
  await screenshot(page, "teacher-classes.png");

  await page.goto(absoluteUrl(baseUrl, `/students?classId=${demo.classItem.id}`));
  await page.getByText("李明").waitFor();
  await screenshot(page, "teacher-students.png");

  await page.goto(absoluteUrl(baseUrl, `/assignments/classes/${demo.classItem.id}`));
  await page.getByText(demo.assignments.main.title).waitFor();
  await screenshot(page, "teacher-assignment-list.png");

  await page.getByTestId("assignment-create-open").click();
  await page.getByTestId("assignment-create-title").fill("课堂演示视频分析");
  await page.getByTestId("assignment-create-description").fill("提交课堂录屏分析文档，说明关键操作步骤。");
  await page.getByTestId("assignment-create-submission-mode").selectOption("files");
  await page.getByTestId("assignment-create-submission-type").selectOption("word");
  await page.getByTestId("assignment-create-min-file-count").fill("1");
  await page.getByTestId("assignment-create-dialog").waitFor();
  await screenshot(page, "teacher-assignment-create.png");
  await page.getByTestId("assignment-create-cancel-top").click();

  await page.getByTestId("assignment-stats-open").click();
  await page.getByTestId("assignment-missing-table").waitFor();
  await screenshot(page, "teacher-assignment-statistics.png");
  await page.getByTestId("assignment-missing-close").click();

  await page.goto(absoluteUrl(baseUrl, `/assignments/classes/${demo.classItem.id}/${demo.assignments.main.id}`));
  await page.getByTestId("assignment-submissions-table").waitFor();
  await screenshot(page, "teacher-assignment-detail.png");

  await page.getByTestId("assignment-detail-missing-open").click();
  await page.getByTestId("assignment-detail-missing-table").waitFor();
  await screenshot(page, "teacher-assignment-missing.png");
  await page.getByTestId("assignment-detail-missing-close").click();

  await page.locator('[data-testid^="assignment-submission-open-"]').first().click();
  await page.getByTestId("assignment-submission-review-drawer").waitFor();
  await screenshot(page, "teacher-assignment-review.png");
}

async function captureStudentPages(page, baseUrl, demo) {
  await page.goto(absoluteUrl(baseUrl, "/student/assignments"));
  await page.getByText(demo.assignments.main.title).waitFor();
  await screenshot(page, "student-assignments.png");

  await page.goto(absoluteUrl(baseUrl, `/student/assignments/${demo.assignments.main.id}`));
  await page.getByTestId("student-assignment-current-submission").waitFor();
  await page.getByTestId("student-assignment-submission-grid").waitFor();
  await screenshot(page, "student-assignment-detail.png");
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  for (const fileName of screenshotNames) {
    fs.rmSync(path.join(outDir, fileName), { force: true });
  }
  const server = suppliedBaseUrl ? { baseUrl: suppliedBaseUrl, stop: async () => {} } : await startBackend();
  let browser;
  const contexts = [];
  try {
    browser = await launchBrowser();
    const teacher = await newPage(browser, server.baseUrl);
    contexts.push(teacher.context);
    await loginAsTeacher(teacher.page, server.baseUrl);
    const demo = await seedDemoData(teacher.page);

    const firstStudent = await prepareStudent(browser, server.baseUrl, demo, demo.students[0], "student123", "网页作品-李明");
    contexts.push(firstStudent.context);
    const secondStudent = await prepareStudent(browser, server.baseUrl, demo, demo.students[1], "student456", "网页作品-王佳");
    contexts.push(secondStudent.context);

    await captureTeacherPages(teacher.page, server.baseUrl, demo);
    await captureStudentPages(firstStudent.page, server.baseUrl, demo);
  } finally {
    for (const context of contexts) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
    await server.stop();
  }
  process.stdout.write(`README screenshots written to ${outDir}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
