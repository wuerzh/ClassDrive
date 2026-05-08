import { ref } from "vue";

export type AppTheme = "light" | "dark";

const storageKey = "classdrive-theme";
const currentTheme = ref<AppTheme>("light");

function applyTheme(theme: AppTheme) {
  currentTheme.value = theme;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(storageKey, theme);
  }
}

export function initializeTheme() {
  if (typeof window === "undefined") {
    return currentTheme.value;
  }
  const stored = window.localStorage.getItem(storageKey);
  const theme: AppTheme = stored === "dark" ? "dark" : "light";
  applyTheme(theme);
  return theme;
}

export function toggleTheme() {
  applyTheme(currentTheme.value === "dark" ? "light" : "dark");
}

export function useTheme() {
  return {
    currentTheme,
    toggleTheme,
  };
}
