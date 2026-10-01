import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { getTheme, setTheme } from "../lib/theme";

export default function ThemeToggle({ className = "" }) {
  const [theme, setLocal] = useState(getTheme);

  useEffect(() => {
    const sync = () => setLocal(getTheme());
    window.addEventListener("smartlib-theme", sync);
    return () => window.removeEventListener("smartlib-theme", sync);
  }, []);

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={`theme-toggle w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-ink-500 hover:text-brand-700 hover:bg-paper-200 transition-colors ${className}`}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
