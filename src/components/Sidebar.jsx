import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid, BookOpen, BookMarked, FileText, PencilLine,
  HelpCircle, RefreshCcw, BarChart3, UploadCloud, Users, Bell,
  Settings as SettingsIcon, ShieldCheck, ChevronDown,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import Logo from "./Logo";

const CATALOG_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutGrid },
  { label: "Academic Books", to: "/academic-books", icon: BookOpen },
  { label: "eBooks", to: "/ebooks", icon: BookMarked },
  { label: "PDF Library", to: "/pdf-library", icon: FileText },
  { label: "Revision Notes", to: "/revision-notes", icon: PencilLine },
  { label: "Past Questions", to: "/past-questions", icon: HelpCircle },
];

const MY_LIBRARY_ITEMS = [
  { label: "Borrowed Items", to: "/borrowed-items", icon: RefreshCcw },
  { label: "Notifications", to: "/notifications", icon: Bell },
];

const STAFF_ITEMS = [
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Upload Resources", to: "/upload-resources", icon: UploadCloud },
  { label: "Users", to: "/users", icon: Users },
];

const ADMIN_ITEMS = [
  { label: "Librarians", to: "/admin/librarians", icon: ShieldCheck },
];

function NavGroup({ items }) {
  return (
    <div className="space-y-1 mb-2">
      {items.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={label}
          to={to}
          className={({ isActive }) =>
            `nav-pill w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium ${
              isActive ? "active" : "text-white/75 hover:bg-white/10 hover:text-white"
            }`
          }
        >
          <Icon size={17} /> {label}
        </NavLink>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const { profile, isStaff, isAdmin } = useAuth();

  return (
    <aside className="sidebar-shell w-64 shrink-0 flex flex-col">
      <div className="relative z-10 px-5 py-6 flex items-center gap-3">
        <Logo className="w-10 h-10 shrink-0" />
        <div className="leading-tight">
          <p className="font-display font-bold text-white text-base tracking-tight">FUTO<br/>SMARTLIB</p>
        </div>
      </div>
      <p className="relative z-10 px-5 -mt-3 mb-4 text-[11px] text-white/50">
        Digital Academic Library<br />Management System
      </p>

      <nav className="relative z-10 flex-1 overflow-y-auto px-3 py-2">
        <NavGroup items={CATALOG_ITEMS} />
        <div className="my-3 border-t border-white/10" />
        <NavGroup items={MY_LIBRARY_ITEMS} />
        {(isStaff || isAdmin) && <div className="my-3 border-t border-white/10" />}
        {isStaff && <NavGroup items={STAFF_ITEMS} />}
        {isAdmin && <NavGroup items={ADMIN_ITEMS} />}
        <div className="my-3 border-t border-white/10" />
        <NavGroup items={[{ label: "Settings", to: "/settings", icon: SettingsIcon }]} />
      </nav>

      <div className="relative z-10 m-3 flex items-center justify-between gap-2 rounded-lg bg-white/10 px-3 py-2.5">
        <span className="text-xs font-medium text-white/90 capitalize">Role: {profile?.role || "student"}</span>
        <ChevronDown size={14} className="text-white/60" />
      </div>
    </aside>
  );
}
