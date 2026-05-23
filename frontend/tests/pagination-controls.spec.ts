import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import PaginationControls from "@/components/PaginationControls.vue";

const sourceRoot = resolve("src");

function listVueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      return listVueFiles(path);
    }
    return path.endsWith(".vue") ? [path] : [];
  });
}

function paginationControlBlocks(source: string): string[] {
  const blocks: string[] = [];
  const pattern = /<PaginationControls\b[\s\S]*?\/>/g;
  let match: RegExpExecArray | null = pattern.exec(source);
  while (match !== null) {
    blocks.push(match[0]);
    match = pattern.exec(source);
  }
  return blocks;
}

describe("PaginationControls", () => {
  it("emits direct navigation for first, last, visible pages, and jump input", async () => {
    const wrapper = mount(PaginationControls, {
      props: {
        page: 3,
        pageSize: 8,
        total: 96,
        totalPages: 12,
        testIdPrefix: "audit-log",
      },
    });

    await wrapper.get('[data-testid="audit-log-page-first"]').trigger("click");
    await wrapper.get('[data-testid="audit-log-page-last"]').trigger("click");
    await wrapper.get('[data-testid="audit-log-page-number-5"]').trigger("click");
    await wrapper.get('[data-testid="audit-log-page-jump-input"]').setValue("9");
    await wrapper.get('[data-testid="audit-log-page-jump"]').trigger("submit");

    expect(wrapper.emitted("go")).toEqual([[1], [12], [5], [9]]);
  });

  it("clamps jump input to the available page range", async () => {
    const wrapper = mount(PaginationControls, {
      props: {
        page: 3,
        pageSize: 8,
        total: 96,
        totalPages: 12,
        testIdPrefix: "audit-log",
      },
    });

    await wrapper.get('[data-testid="audit-log-page-jump-input"]').setValue("999");
    await wrapper.get('[data-testid="audit-log-page-jump"]').trigger("submit");

    expect(wrapper.emitted("go")).toEqual([[12]]);
  });

  it("keeps every page-level pagination instance wired to direct page navigation", () => {
    const instances = listVueFiles(sourceRoot).flatMap((path) => (
      paginationControlBlocks(readFileSync(path, "utf8")).map((block) => ({ path, block }))
    ));

    expect(instances).toHaveLength(11);
    expect(instances.filter((instance) => !instance.block.includes("@go="))).toEqual([]);
  });
});
