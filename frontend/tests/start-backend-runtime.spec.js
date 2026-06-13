import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGoBinary } from "../scripts/backend-runtime.mjs";

describe("start backend runtime", () => {
  it("prefers the project-local Go toolchain when it exists", () => {
    const projectDir = mkdtempSync(join(tmpdir(), "classdrive-go-toolchain-"));
    const localGoBin = resolve(projectDir, ".tooling", "go", "bin");
    mkdirSync(localGoBin, { recursive: true });
    writeFileSync(resolve(localGoBin, "go.exe"), "");

    const goBinary = resolveGoBinary(projectDir, "win32");

    expect(goBinary).toBe(resolve(projectDir, ".tooling", "go", "bin", "go.exe"));
    expect(existsSync(goBinary)).toBe(true);
  });
});
