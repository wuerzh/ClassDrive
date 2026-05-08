import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, rmSync } from "node:fs";
import { resolveGoBinary } from "./backend-runtime.mjs";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const frontendDir = resolve(currentDir, "..");
const projectDir = resolve(frontendDir, "..");
const goBinary = resolveGoBinary(projectDir);
const baseRootDir = resolve(frontendDir, ".e2e-app");
const baseDir = resolve(baseRootDir, `${Date.now()}-${process.pid}`);

mkdirSync(baseRootDir, { recursive: true });
mkdirSync(baseDir, { recursive: true });

const child = spawn(goBinary, ["run", "./cmd/classdrive"], {
  cwd: projectDir,
  stdio: "inherit",
  env: {
    ...process.env,
    CLASSDRIVE_BASE_DIR: baseDir,
    CLASSDRIVE_PORT: process.env.CLASSDRIVE_PORT || "4175",
    CLASSDRIVE_SEED: "true",
    GOPROXY: process.env.GOPROXY || "https://goproxy.cn,direct",
  },
});

const shutdown = () => {
  if (!child.killed) {
    child.kill("SIGTERM");
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

child.on("exit", (code) => {
  try {
    rmSync(baseDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup failures on Windows file locks.
  }
  process.exit(code ?? 0);
});
