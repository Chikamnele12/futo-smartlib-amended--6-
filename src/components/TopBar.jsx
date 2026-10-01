import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Bell, ChevronDown, Menu } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import { supabase } from "../lib/supabaseClient";

export default function TopBar({ placeholder, onMenu = () => {} }) {
  const { profile, user, signOut } = useAuth();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(({ count }) => setUnread(count || 0));
  }, [user]);

  return (
    <header className="h-16 bg-paper-50 border-b border-paper-300 flex items-center gap-3 sm:gap-4 px-3 sm:px-5 sticky top-0 z-20">
      <button
        onClick={onMenu}
        className="lg:hidden shrink-0 text-ink-500 hover:text-ink-900 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div className="flex items-center gap-2 bg-paper-100 border border-paper-300 rounded-lg px-3 py-2 flex-1 min-w-0 max-w-xl transition-colors focus-within:border-brand-500">
        <Search size={16} className="text-ink-500 shrink-0" />
        <input
          placeholder={placeholder || "Search for resources, course, author, department..."}
          className="bg-transparent outline-none text-sm w-full min-w-0 text-ink-900 placeholder-ink-500"
        />
      </div>

      <div className="ml-auto flex items-center gap-3 sm:gap-4 shrink-0">
        <ThemeToggle />

        <Link to="/notifications" className="relative text-ink-500 hover:text-brand-700 transition-colors" aria-label="Notifications">
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-700 text-white text-[10px] rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2.5">
            <Avatar profile={profile} size={36} />
            <div className="text-sm hidden sm:block text-left">
              <p className="font-semibold text-ink-900 leading-tight">{profile?.full_name || "My Account"}</p>
              <p className="text-xs text-ink-500 capitalize">{profile?.role || "student"}</p>
            </div>
            <ChevronDown size={14} className={`hidden sm:block text-ink-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 card shadow-lg overflow-hidden z-10 page-enter">
              <Link to="/settings" className="block px-4 py-2 text-sm text-ink-700 hover:bg-paper-100 transition-colors">
                Settings
              </Link>
              <button onClick={signOut} className="w-full text-left px-4 py-2 text-sm text-rose-ink hover:bg-paper-100 transition-colors">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
