import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
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

  return (
    <Layout searchPlaceholder="Search notifications...">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Notifications</h1>
        <p className="text-sm text-ink-500">Catalog &gt; Notifications</p>
      </div>

      {loading && <p className="text-sm text-ink-500">Loading...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-ink-500">You're all caught up.</p>}

      <div className="bg-paper-50 border border-paper-300 divide-y divide-paper-200">
        {items.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.is_read && markRead(n.id)}
            className={`flex items-start gap-3 p-4 cursor-pointer ${n.is_read ? "" : "bg-brass-500/5"}`}
          >
            <Bell size={16} className={n.is_read ? "text-ink-500" : "text-brass-600"} />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-900">{n.title}</p>
              <p className="text-sm text-ink-700">{n.message}</p>
              <p className="text-xs text-ink-500 mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.is_read && <span className="w-2 h-2 bg-brass-500 rounded-full mt-1.5" />}
          </div>
        ))}
      </div>
    </Layout>
  );
}
