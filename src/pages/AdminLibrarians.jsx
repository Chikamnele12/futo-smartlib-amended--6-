import React, { useEffect, useState } from "react";
import { UserPlus, Trash2, Mail } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

// Admin-only page. Admin invites a librarian by email (stored in
// staff_invites); that person then signs up normally at /signup with an
// OTP, and the DB trigger grants them the "librarian" role automatically.
export default function AdminLibrarians() {
  const { user } = useAuth();
  const [librarians, setLibrarians] = useState([]);
  const [invites, setInvites] = useState([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: libs }, { data: inv }] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "librarian").order("created_at", { ascending: false }),
      supabase.from("staff_invites").select("*").eq("used", false).order("created_at", { ascending: false }),
    ]);
    setLibrarians(libs || []);
    setInvites(inv || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function inviteLibrarian(e) {
    e.preventDefault();
    setError(""); setMsg("");
    const { error: inviteError } = await supabase
      .from("staff_invites")
      .insert({ email, role: "librarian", invited_by: user.id });
    if (inviteError) return setError(inviteError.message);
    setMsg(`Invited ${email}. They can now sign up at /signup as a librarian.`);
    setEmail("");
    load();
  }

  async function revokeInvite(id) {
    await supabase.from("staff_invites").delete().eq("id", id);
    load();
  }

  async function removeLibrarian(id) {
    if (!confirm("Remove this librarian's access?")) return;
    await supabase.from("profiles").delete().eq("id", id);
    load();
  }

  return (
    <Layout searchPlaceholder="Search librarians...">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Librarians</h1>
        <p className="text-sm text-ink-500">Admin &gt; Librarians</p>
      </div>

      <form onSubmit={inviteLibrarian} className="card p-5 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label className="text-sm font-medium text-ink-700">Invite a librarian by email</label>
          <div className="mt-1.5 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
            <Mail size={16} className="text-ink-500" />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="librarian@futo.edu.ng"
              className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
          </div>
        </div>
        <button type="submit" className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium">
          <UserPlus size={16} /> Send invite
        </button>
      </form>

      {error && <p className="text-sm text-rose-ink">{error}</p>}
      {msg && <p className="text-sm text-green-ink">{msg}</p>}

      {invites.length > 0 && (
        <div>
          <h2 className="font-display text-sm font-semibold text-ink-900 mb-2">Pending invites</h2>
          <div className="card divide-y divide-paper-200">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3">
                <span className="text-sm text-ink-900">{i.email}</span>
                <button onClick={() => revokeInvite(i.id)} className="text-xs text-rose-ink hover:underline flex items-center gap-1">
                  <Trash2 size={13} /> Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-display text-sm font-semibold text-ink-900 mb-2">Active librarians</h2>
        {loading && <p className="text-sm text-ink-500">Loading...</p>}
        <div className="card divide-y divide-paper-200">
          {librarians.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-ink-900">{l.full_name || "—"}</p>
                <p className="text-xs text-ink-500">{l.email}</p>
              </div>
              <button onClick={() => removeLibrarian(l.id)} className="flex items-center gap-1.5 text-xs text-rose-ink hover:underline">
                <Trash2 size={13} /> Remove
              </button>
            </div>
          ))}
          {!loading && librarians.length === 0 && (
            <p className="text-sm text-ink-500 p-3">No librarians yet.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
