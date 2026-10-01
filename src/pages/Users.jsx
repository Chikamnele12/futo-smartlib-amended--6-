import React, { useEffect, useMemo, useState } from "react";
import { Trash2, Users2, GraduationCap, ShieldCheck } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

const ROLES = ["student", "librarian", "admin"];

function StatCard({ icon: Icon, value, label, bg, ink }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg} ${ink}`}>
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="stat-number text-lg font-bold text-ink-900 leading-tight">{value}</p>
        <p className="text-xs text-ink-500 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function Users() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    // Librarians only manage students here (librarians get their own
    // view via /admin/librarians, which is admin-only).
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!isAdmin) query = query.eq("role", "student");
    const { data } = await query;
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [isAdmin]);

  async function changeRole(id, role) {
    await supabase.from("profiles").update({ role }).eq("id", id);
    load();
  }

  async function removeUser(id, role) {
    if (!isAdmin && role !== "student") return; // librarians can only remove students
    if (!confirm("Delete this user's profile? This cannot be undone.")) return;
    await supabase.from("profiles").delete().eq("id", id);
    load();
  }

  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter((u) => u.role === "student").length,
    staff: users.filter((u) => u.role !== "student").length,
  }), [users]);

  const roleBadge = (role) => {
    const map = {
      student: "bg-brand-100 text-brand-700",
      librarian: "bg-blue-soft text-blue-ink",
      admin: "bg-amber-soft text-amber-ink",
    };
    return map[role] || "bg-paper-200 text-ink-700";
  };

  return (
    <Layout searchPlaceholder="Search users by name or email...">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Users</h1>
        <p className="text-sm text-ink-500">Manage &gt; Users</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Users2} value={stats.total} label="Total Users" bg="bg-brand-100" ink="text-brand-700" />
        <StatCard icon={GraduationCap} value={stats.students} label="Students" bg="bg-green-soft" ink="text-green-ink" />
        <StatCard icon={ShieldCheck} value={stats.staff} label="Staff" bg="bg-amber-soft" ink="text-amber-ink" />
      </div>

      {loading && <p className="text-sm text-ink-500">Loading...</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper-300 text-left text-ink-500">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Matric No.</th>
              <th className="p-3 font-medium">Department</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-paper-200 last:border-0 hover:bg-paper-100 transition-colors">
                <td className="p-3 text-ink-900 font-medium">{u.full_name || "—"}</td>
                <td className="p-3 text-ink-700">{u.email}</td>
                <td className="p-3 text-ink-700 font-mono-tag text-xs">{u.matric_number || "—"}</td>
                <td className="p-3 text-ink-700">{u.department || "—"}</td>
                <td className="p-3">
                  {isAdmin ? (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="border border-paper-300 bg-paper-50 rounded-md px-2 py-1 text-sm capitalize focus:border-brand-500 outline-none"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`capitalize text-xs font-medium px-2 py-1 rounded-full ${roleBadge(u.role)}`}>{u.role}</span>
                  )}
                </td>
                <td className="p-3">
                  {(isAdmin || u.role === "student") && (
                    <button onClick={() => removeUser(u.id, u.role)} className="flex items-center gap-1 text-xs text-rose-ink hover:underline">
                      <Trash2 size={13} /> Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
