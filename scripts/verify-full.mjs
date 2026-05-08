import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { resolveGoBinary } from "../frontend/scripts/backend-runtime.mjs";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const projectDir = resolve(currentDir, "..");
const goBinary = resolveGoBinary(projectDir);
const buildOutput = resolve(projectDir, "tmp", process.platform === "win32" ? "ClassDrive.exe" : "ClassDrive");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const steps = [
  {
    label: "TypeScript 类型检查",
    command: npmCommand,
    args: ["run", "typecheck"],
  },
  {
    label: "前端单元测试",
    command: npmCommand,
    args: ["test"],
  },
  {
    label: "前端视觉回归",
    command: npmCommand,
    args: ["run", "test:visual"],
  },
  {
    label: "前端端到端回归",
    command: npmCommand,
    args: ["run", "test:e2e"],
  },
  {
    label: "Go 后端测试",
    command: goBinary,
    args: ["test", "./...", "-count=1"],
  },
  {
    label: "Go 后端构建",
    command: goBinary,
    args: ["build", "-o", buildOutput, "./cmd/classdrive"],
  },
];

function runStep(step) {
  return new Promise((resolvePromise, rejectPromise) => {
    process.stdout.write(`\n=== ${step.label} ===\n`);

    const child = process.platform === "win32" && step.command === npmCommand
      ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${step.command} ${step.args.join(" ")}`], {
          cwd: projectDir,
          stdio: "inherit",
          env: {
            ...process.env,
            GOPROXY: process.env.GOPROXY || "https://goproxy.cn,direct",
          },
        })
      : spawn(step.command, step.args, {
          cwd: projectDir,
          stdio: "inherit",
          env: {
            ...process.env,
            GOPROXY: process.env.GOPROXY || "https://goproxy.cn,direct",
          },
        });

    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }
      rejectPromise(new Error(`${step.label} 失败，退出码 ${code ?? "unknown"}`));
    });
  });
}

for (const step of steps) {
  // eslint-disable-next-line no-await-in-loop
  await runStep(step);
}

process.stdout.write("\n全部验证步骤已通过。\n");
