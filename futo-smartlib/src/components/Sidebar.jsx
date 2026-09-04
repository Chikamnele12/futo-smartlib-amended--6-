import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, BookOpen, BookMarked, FileText, StickyNote,
  HelpCircle, RefreshCcw, BarChart3, UploadCloud, Users, Bell,
  Settings as SettingsIcon, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";

const CATALOG_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Academic Books", to: "/academic-books", icon: BookOpen },
  { label: "eBooks", to: "/ebooks", icon: BookMarked },
  { label: "PDF Library", to: "/pdf-library", icon: FileText },
  { label: "Revision Notes", to: "/revision-notes", icon: StickyNote },
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

function NavGroup({ title, items }) {
  return (
    <div className="mb-5">
      <p className="px-3 mb-1.5 text-[11px] text-forest-600 font-medium tracking-wide">{title}</p>
      <div className="space-y-0.5">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2.5 text-sm border-l-2 transition-colors ${
                isActive
                  ? "bg-forest-900 border-brass-500 text-paper-50"
                  : "border-transparent text-paper-200/80 hover:bg-forest-900/60 hover:text-paper-50"
              }`
            }
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { profile, isStaff, isAdmin } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-forest-950 text-paper-100 flex flex-col">
      <div className="px-5 py-6 flex items-center gap-3 border-b border-forest-800">
        <div className="w-10 h-10 bg-brass-500 flex items-center justify-center text-forest-950 font-display text-lg shrink-0">
          F
        </div>
        <div className="text-sm leading-tight">
          <p className="font-display text-lg text-paper-50">SmartLib</p>
          <p className="text-forest-600 text-[11px]">FUTO Digital Academic Library</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <NavGroup title="Catalog" items={CATALOG_ITEMS} />
        <NavGroup title="My Library" items={MY_LIBRARY_ITEMS} />
        {isStaff && <NavGroup title="Manage" items={STAFF_ITEMS} />}
        {isAdmin && <NavGroup title="Admin" items={ADMIN_ITEMS} />}
        <NavGroup title="Account" items={[{ label: "Settings", to: "/settings", icon: SettingsIcon }]} />
      </nav>

      <div className="m-3 px-3 py-2.5 bg-forest-900 text-sm text-paper-100 border-l-2 border-brass-500">
        Signed in as {profile?.role || "student"}
      </div>
    </aside>
  );
}
