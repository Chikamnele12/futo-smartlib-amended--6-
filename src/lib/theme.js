// Light/dark theme. Importing this file applies the saved (or phone's) theme straight away.
const KEY = "smartlib-theme";

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch { /* storage blocked */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme) {
  try { localStorage.setItem(KEY, theme); } catch { /* ignore */ }
  applyTheme(theme);
  window.dispatchEvent(new Event("smartlib-theme"));
}

applyTheme(getTheme());
