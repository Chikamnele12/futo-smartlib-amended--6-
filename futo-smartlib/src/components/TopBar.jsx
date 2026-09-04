import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function TopBar({ placeholder }) {
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

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-16 bg-paper-50 border-b border-paper-300 flex items-center justify-between px-5 gap-4">
      <div className="flex items-center gap-2 bg-paper-100 border border-paper-300 px-3 py-2 flex-1 max-w-md">
        <Search size={15} className="text-ink-500" />
        <input
          placeholder={placeholder || "Search resources, course, author, department..."}
          className="bg-transparent outline-none text-sm w-full text-ink-900 placeholder-ink-500"
        />
      </div>

      <div className="flex items-center gap-4">
        <Link to="/notifications" className="relative text-ink-700" aria-label="Notifications">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-clay-500 text-paper-50 text-[10px] rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </Link>

        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2">
            <div className="w-9 h-9 bg-forest-800 text-paper-50 flex items-center justify-center text-sm font-medium">
              {initials}
            </div>
            <div className="text-sm hidden sm:block text-left">
              <p className="font-medium text-ink-900 leading-tight">{profile?.full_name || "My Account"}</p>
              <p className="text-xs text-ink-500 capitalize">{profile?.role || "student"}</p>
            </div>
            <ChevronDown size={14} className="text-ink-500" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-paper-50 border border-paper-300 shadow-sm z-10">
              <Link to="/settings" className="block px-4 py-2 text-sm text-ink-700 hover:bg-paper-100">
                Settings
              </Link>
              <button
                onClick={signOut}
                className="w-full text-left px-4 py-2 text-sm text-clay-600 hover:bg-paper-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
