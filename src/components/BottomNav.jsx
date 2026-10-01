import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, BookOpen, RefreshCcw, Bell, Menu } from "lucide-react";

const ITEMS = [
  { label: "Home", to: "/dashboard", icon: LayoutGrid },
  { label: "Books", to: "/academic-books", icon: BookOpen },
  { label: "Borrowed", to: "/borrowed-items", icon: RefreshCcw },
  { label: "Alerts", to: "/notifications", icon: Bell },
];

// Phone-only tab bar. "More" opens the full sidebar menu.
export default function BottomNav({ onMore }) {
  const base = "bottom-tab flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors";
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-paper-50/95 backdrop-blur border-t border-paper-300 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main"
    >
      {ITEMS.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={label}
          to={to}
          className={({ isActive }) => `${base} ${isActive ? "text-brand-700 is-active" : "text-ink-500"}`}
        >
          <span className="tab-icon w-12 h-7 rounded-full flex items-center justify-center transition-colors">
            <Icon size={19} />
          </span>
          {label}
        </NavLink>
      ))}
      <button type="button" onClick={onMore} className={`${base} text-ink-500`}>
        <span className="tab-icon w-12 h-7 rounded-full flex items-center justify-center">
          <Menu size={19} />
        </span>
        More
      </button>
    </nav>
  );
}
