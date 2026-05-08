import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGoBinary } from "../scripts/backend-runtime.mjs";

describe("start backend runtime", () => {
  it("prefers the project-local Go toolchain when it exists", () => {
    const projectDir = resolve(import.meta.dirname, "..", "..");
    const goBinary = resolveGoBinary(projectDir, "win32");

    expect(goBinary).toBe(resolve(projectDir, ".tooling", "go", "bin", "go.exe"));
    expect(existsSync(goBinary)).toBe(true);
  });
});
