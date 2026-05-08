import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function resolveGoBinary(projectDir, platform = process.platform) {
  const executable = platform === "win32" ? "go.exe" : "go";
  const candidates = [
    resolve(projectDir, ".tooling", "go", "bin", executable),
    resolve(projectDir, "..", ".tooling", "go", "bin", executable),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}
