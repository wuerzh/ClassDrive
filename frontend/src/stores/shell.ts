import { defineStore } from "pinia";
import { api, type ShellItem } from "@/api/client";

export interface ShellNavGroup {
  key: string;
  label: string;
  description: string;
  items: ShellItem[];
}

const defaultShellItems: ShellItem[] = [
  { key: "library", label: "老师资料", href: "/files/library", placeholder: false },
  { key: "public", label: "公共资料", href: "/files/public", placeholder: false },
  { key: "classes-files", label: "班级资料", href: "/files/classes/1", placeholder: false },
  { key: "classes", label: "班级管理", href: "/classes", placeholder: false },
  { key: "assignments", label: "作业管理", href: "/assignments", placeholder: false },
  { key: "settings", label: "设置", href: "/settings", placeholder: false },
];

const navGroupDefinitions: Array<Omit<ShellNavGroup, "items">> = [
  {
    key: "resources",
    label: "资料空间",
    description: "先确认资料归属，再进入共享、上传和班级资料整理。",
  },
  {
    key: "workflow",
    label: "班级工作流",
    description: "围绕班级、作业和学生按日常教学顺序推进。",
  },
  {
    key: "account",
    label: "系统与账号",
    description: "维护老师账号、统一入口和系统级配置。",
  },
  {
    key: "other",
    label: "其他入口",
    description: "保留后端返回但未归类的导航项。",
  },
];

const itemGroupByKey: Record<string, ShellNavGroup["key"]> = {
  library: "resources",
  public: "resources",
  "classes-files": "resources",
  classes: "workflow",
  assignments: "workflow",
  settings: "account",
};

const itemOrderByKey: Record<string, number> = {
  library: 10,
  public: 20,
  "classes-files": 30,
  classes: 40,
  assignments: 50,
  settings: 60,
};

const canonicalLabelByKey: Record<string, string> = {
  library: "老师资料",
  public: "公共资料",
  "classes-files": "班级资料",
  classes: "班级管理",
  assignments: "作业管理",
  settings: "设置",
};

const hiddenShellItemKeys = new Set(["students"]);

function normalizeShellItems(items: ShellItem[]): ShellItem[] {
  return items
    .filter((item) => !hiddenShellItemKeys.has(item.key))
    .map((item) => ({
      ...item,
      label: canonicalLabelByKey[item.key] ?? item.label,
    }));
}

function buildNavGroups(items: ShellItem[]): ShellNavGroup[] {
  const groupedItems = new Map<string, ShellItem[]>();

  for (const item of items) {
    const groupKey = itemGroupByKey[item.key] ?? "other";
    const currentGroupItems = groupedItems.get(groupKey) ?? [];
    currentGroupItems.push(item);
    groupedItems.set(groupKey, currentGroupItems);
  }

  return navGroupDefinitions
    .map((group) => ({
      ...group,
      items: (groupedItems.get(group.key) ?? []).sort((left, right) => {
        const leftOrder = itemOrderByKey[left.key] ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = itemOrderByKey[right.key] ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return left.label.localeCompare(right.label, "zh-CN");
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export const useShellStore = defineStore("shell", {
  state: () => ({
    items: normalizeShellItems(defaultShellItems) as ShellItem[],
    ready: false,
  }),
  getters: {
    navGroups(state): ShellNavGroup[] {
      return buildNavGroups(state.items);
    },
  },
  actions: {
    async load() {
      try {
        const response = await api.shell();
        if (Array.isArray(response.items) && response.items.some((item) => typeof item.href === "string")) {
          this.items = normalizeShellItems(response.items);
        }
      } catch {
        this.items = normalizeShellItems(defaultShellItems);
      } finally {
        this.ready = true;
      }
    },
  },
});
