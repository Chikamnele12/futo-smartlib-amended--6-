import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

const ROLES = ["student", "librarian", "admin"];

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

  return (
    <Layout searchPlaceholder="Search users by name or email...">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Users</h1>
        <p className="text-sm text-ink-500">Manage &gt; Users</p>
      </div>

      {loading && <p className="text-sm text-ink-500">Loading...</p>}

      <div className="bg-paper-50 border border-paper-300 overflow-x-auto">
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
              <tr key={u.id} className="border-b border-paper-200">
                <td className="p-3 text-ink-900">{u.full_name || "—"}</td>
                <td className="p-3 text-ink-700">{u.email}</td>
                <td className="p-3 text-ink-700">{u.matric_number || "—"}</td>
                <td className="p-3 text-ink-700">{u.department || "—"}</td>
                <td className="p-3">
                  {isAdmin ? (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="border border-paper-300 bg-paper-50 px-2 py-1 text-sm capitalize"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="capitalize text-ink-700">{u.role}</span>
                  )}
                </td>
                <td className="p-3">
                  {(isAdmin || u.role === "student") && (
                    <button onClick={() => removeUser(u.id, u.role)} className="flex items-center gap-1 text-xs text-clay-600">
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
