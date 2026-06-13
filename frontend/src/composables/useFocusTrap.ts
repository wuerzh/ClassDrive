import { onMounted, onUnmounted, watch, type Ref } from "vue";

/**
 * Focusable element selector matching all interactive elements.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(
  container: HTMLElement,
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

/**
 * Traps Tab/Shift+Tab focus within the referenced element and calls
 * `onEscape` when Escape is pressed.
 *
 * When `open` becomes true, focus is moved to the first focusable child.
 * When the composable is cleaned up (unmounted), focus is restored to the
 * element that was active before the dialog opened.
 *
 * @param elementRef - A Vue ref pointing to the dialog container element.
 * @param onEscape  - Callback invoked when Escape is pressed.
 * @param open      - Ref indicating whether the dialog is currently open.
 */
export function useFocusTrap(
  elementRef: Ref<HTMLElement | null>,
  onEscape: () => void,
  open: Ref<boolean>,
): void {
  let previousActiveElement: HTMLElement | null = null;

  function restoreFocus(): void {
    if (previousActiveElement && document.contains(previousActiveElement)) {
      previousActiveElement.focus();
      previousActiveElement = null;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (!open.value || !elementRef.value) {
      return;
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      onEscape();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusables = getFocusableElements(elementRef.value);
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  const cleanupKeydown = () => {
    document.removeEventListener("keydown", handleKeydown);
  };

  onMounted(() => {
    document.addEventListener("keydown", handleKeydown);
  });

  onUnmounted(() => {
    cleanupKeydown();
    restoreFocus();
  });

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        previousActiveElement = document.activeElement as HTMLElement | null;
        // Defer focus to next paint so the DOM has rendered the dialog
        requestAnimationFrame(() => {
          const el = elementRef.value;
          if (el) {
            const first = getFocusableElements(el)[0];
            if (first) {
              first.focus();
            }
          }
        });
      } else {
        restoreFocus();
      }
    },
    { immediate: true },
  );
}
