<template>
  <div
    v-if="item"
    ref="dialogBackdropRef"
    class="editor-dialog-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="file-editor-title"
    data-testid="file-editor-dialog"
    @click.self="handleClose"
  >
    <section class="editor-dialog">
      <header class="editor-dialog__header">
        <div>
          <div class="editor-dialog__eyebrow">在线编辑</div>
          <h3 id="file-editor-title" class="editor-dialog__title" data-testid="file-editor-title">{{ item.name }}</h3>
        </div>
        <div class="editor-dialog__header-actions">
          <div
            v-if="showMarkdownPreview && !loading && !errorText"
            class="editor-dialog__mode"
            role="group"
            aria-label="Markdown 预览切换"
          >
            <button
              class="button"
              :class="{ 'button--primary': mode === 'edit' }"
              type="button"
              data-testid="file-editor-toggle-edit"
              @click="mode = 'edit'"
            >
              编辑
            </button>
            <button
              class="button"
              :class="{ 'button--primary': mode === 'preview' }"
              type="button"
              data-testid="file-editor-toggle-preview"
              @click="mode = 'preview'"
            >
              预览
            </button>
          </div>
          <button
            class="button button--ghost"
            type="button"
            data-testid="file-editor-close"
            :disabled="saving"
            @click="handleClose"
          >
            关闭
          </button>
        </div>
      </header>

      <div class="editor-dialog__body">
        <p v-if="loading" class="muted">正在加载内容...</p>
        <p v-else-if="errorText" class="form-error" data-testid="file-editor-error">{{ errorText }}</p>
        <div
          v-else-if="showMarkdownPreview && mode === 'preview'"
          class="editor-dialog__preview"
          data-testid="file-editor-preview"
          v-html="renderedMarkdown"
        ></div>
        <textarea
          v-else
          class="editor-dialog__textarea"
          data-testid="file-editor-textarea"
          :value="content"
          :disabled="saving"
          spellcheck="false"
          @input="handleInput"
        ></textarea>
      </div>

      <footer class="editor-dialog__footer">
        <span class="muted">{{ footerText }}</span>
        <div class="editor-dialog__actions">
          <button class="button" type="button" data-testid="file-editor-cancel" :disabled="saving" @click="handleClose">取消</button>
          <button
            class="button button--primary"
            type="button"
            data-testid="file-editor-save"
            :disabled="disabledSave"
            @click="$emit('save')"
          >
            保存
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useFocusTrap } from "@/composables/useFocusTrap";

import type { FileItem } from "@/api/client";

const props = defineProps<{
  item: FileItem | null;
  content: string;
  loading: boolean;
  saving: boolean;
  errorText: string;
  disabledSave: boolean;
  dirty: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [];
  "update:content": [value: string];
}>();

const dialogBackdropRef = ref<HTMLElement | null>(null);
const mode = ref<"edit" | "preview">("edit");

const isOpen = computed(() => props.item !== null);

useFocusTrap(dialogBackdropRef, () => handleClose(), isOpen);

const showMarkdownPreview = computed(() => {
  if (!props.item) {
    return false;
  }
  const normalizedName = props.item.name.trim().toLowerCase();
  const normalizedMimeType = (props.item.mimeType ?? "").trim().toLowerCase();
  return normalizedName.endsWith(".md") || normalizedName.endsWith(".markdown") || normalizedMimeType === "text/markdown";
});

const renderedMarkdown = computed(() => renderMarkdown(props.content));

const footerText = computed(() => {
  if (props.saving) {
    return "正在保存...";
  }
  if (props.dirty) {
    return "有未保存内容";
  }
  return "当前仅支持 UTF-8 文本文件在线编辑";
});

watch(
  () => props.item?.id,
  () => {
    mode.value = "edit";
  },
);

watch(showMarkdownPreview, (value) => {
  if (!value) {
    mode.value = "edit";
  }
});

function handleInput(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLTextAreaElement)) {
    return;
  }
  emit("update:content", target.value);
}

function handleClose() {
  if (props.saving) {
    return;
  }
  emit("close");
}

function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeBlock: string[] = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }
    html.push(`<p>${paragraph.map((line) => renderInlineMarkdown(line)).join("<br>")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }
    html.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock) {
      return;
    }
    html.push(`<pre><code>${escapeHtml(codeBlock.join("\n"))}</code></pre>`);
    codeBlock = [];
    inCodeBlock = false;
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlock.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1]?.length ?? 1;
      const text = headingMatch[2] ?? "";
      html.push(`<h${level}>${renderInlineMarkdown(text)}</h${level}>`);
      continue;
    }

    const listMatch = /^[-*]\s+(.*)$/.exec(trimmed);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1] ?? "");
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushCodeBlock();

  if (html.length === 0) {
    return "<p></p>";
  }
  return html.join("");
}

function renderInlineMarkdown(source: string) {
  const escaped = escapeHtml(source);
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(source: string) {
  return source
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
</script>

<style scoped>
.editor-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 2400;
}

.editor-dialog {
  width: min(980px, 100%);
  max-height: calc(100vh - 48px);
  background: var(--bg-surface);
  border: 1px solid var(--border-soft);
  border-radius: 26px;
  box-shadow: var(--shadow-strong);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-dialog__header,
.editor-dialog__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft);
}

.editor-dialog__footer {
  border-top: 1px solid var(--border-soft);
  border-bottom: 0;
}

.editor-dialog__header-actions,
.editor-dialog__actions,
.editor-dialog__mode {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-dialog__eyebrow {
  color: var(--text-muted);
  font-size: 12px;
  margin-bottom: 4px;
}

.editor-dialog__title {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.editor-dialog__body {
  flex: 1;
  padding: 20px;
  overflow: auto;
}

.editor-dialog__textarea,
.editor-dialog__preview {
  width: 100%;
  min-height: 62vh;
  border: 1px solid var(--control-border);
  border-radius: 8px;
  padding: 14px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--control-bg);
  box-sizing: border-box;
}

.editor-dialog__textarea {
  resize: vertical;
  font-family: Consolas, "Courier New", monospace;
}

.editor-dialog__textarea:focus {
  outline: 2px solid var(--accent-primary);
  outline-offset: 1px;
  background: var(--bg-surface);
}

.editor-dialog__preview :deep(h1),
.editor-dialog__preview :deep(h2),
.editor-dialog__preview :deep(h3),
.editor-dialog__preview :deep(h4),
.editor-dialog__preview :deep(h5),
.editor-dialog__preview :deep(h6) {
  margin: 0 0 12px;
  line-height: 1.4;
}

.editor-dialog__preview :deep(p),
.editor-dialog__preview :deep(ul),
.editor-dialog__preview :deep(pre) {
  margin: 0 0 12px;
}

.editor-dialog__preview :deep(ul) {
  padding-left: 20px;
}

.editor-dialog__preview :deep(code) {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--bg-muted);
  font-family: Consolas, "Courier New", monospace;
}

.editor-dialog__preview :deep(pre) {
  padding: 12px;
  border-radius: 8px;
  background: #0f172a;
  color: #f8fafc;
  overflow: auto;
}

.editor-dialog__preview :deep(pre code) {
  padding: 0;
  background: transparent;
  color: inherit;
}
</style>
