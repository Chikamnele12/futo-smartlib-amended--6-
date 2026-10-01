import React, { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function markRead(id) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  }

  async function markAllRead() {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    load();
  }

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  return (
    <Layout searchPlaceholder="Search notifications...">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Notifications</h1>
          <p className="text-sm text-ink-500">Home &gt; Notifications</p>
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2 text-sm border border-paper-300 rounded-lg px-3 py-2 text-ink-700 bg-paper-50 hover:bg-paper-100 disabled:opacity-50 transition-colors"
        >
          <CheckCheck size={15} /> Mark all as read
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 max-w-md">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center shrink-0"><Inbox size={17} /></div>
          <div><p className="stat-number text-lg font-bold text-ink-900">{items.length}</p><p className="text-xs text-ink-500">Total</p></div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-soft text-rose-ink flex items-center justify-center shrink-0"><Bell size={17} /></div>
          <div><p className="stat-number text-lg font-bold text-ink-900">{unreadCount}</p><p className="text-xs text-ink-500">Unread</p></div>
        </div>
      </div>

      {loading && <p className="text-sm text-ink-500">Loading...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-ink-500">You're all caught up.</p>}

      <div className="card divide-y divide-paper-200">
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.is_read && markRead(n.id)}
            className={`flex items-start gap-3 p-4 cursor-pointer transition-colors hover:bg-paper-100 ${n.is_read ? "" : "bg-brand-100/30"}`}
          >
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.is_read ? "bg-paper-200 text-ink-500" : "bg-brand-100 text-brand-700"}`}>
              <Bell size={15} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-900">{n.title}</p>
              <p className="text-sm text-ink-700">{n.message}</p>
              <p className="text-xs text-ink-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.is_read && <span className="w-2 h-2 bg-brand-700 rounded-full mt-1.5" />}
          </div>
        ))}
      </div>
    </Layout>
  );
}
