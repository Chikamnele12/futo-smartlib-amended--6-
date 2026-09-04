import React, { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { feeOwed } from "../lib/borrow";

export default function BorrowedItems() {
  const { user, isStaff } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let query = supabase
      .from("borrowed_items")
      .select("id, status, borrowed_at, due_date, returned_at, resources(title, course_code), profiles(full_name)")
      .order("due_date", { ascending: true });

    if (!isStaff) query = query.eq("user_id", user.id);

    const { data } = await query;
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load();
  }, [user, isStaff]);

  async function markReturned(id) {
    await supabase.from("borrowed_items").update({ status: "returned", returned_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  async function deleteRecord(id) {
    if (!confirm("Delete this borrow record?")) return;
    await supabase.from("borrowed_items").delete().eq("id", id);
    load();
  }

  const isOverdue = (item) => item.status === "borrowed" && new Date(item.due_date) < new Date();

  return (
    <Layout searchPlaceholder="Search borrowed items...">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Borrowed Items</h1>
        <p className="text-sm text-ink-500">Catalog &gt; Borrowed Items</p>
      </div>

      {loading && <p className="text-sm text-ink-500">Loading...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-ink-500">Nothing on loan.</p>}

      <div className="bg-paper-50 border border-paper-300 divide-y divide-paper-200">
        {items.map((item) => {
          const overdue = isOverdue(item);
          const fee = feeOwed(item);
          return (
            <div key={item.id} className="flex items-center justify-between p-4 flex-wrap gap-3">
              <div>
                <p className="font-medium text-ink-900">{item.resources?.title}</p>
                <p className="text-xs text-ink-500 font-mono-tag">{item.resources?.course_code}</p>
                {isStaff && <p className="text-xs text-ink-500">Borrowed by {item.profiles?.full_name}</p>}
              </div>

              <div className="flex items-center gap-4">
                <div className={`stamp px-3 py-1 text-xs font-medium ${overdue ? "text-clay-600" : "text-forest-800"}`}>
                  {item.status === "returned" ? "Returned" : overdue ? "Overdue" : "Due"}{" "}
                  {new Date(item.due_date).toLocaleDateString()}
                </div>

                {fee > 0 && (
                  <div className="text-xs font-medium text-clay-600">₦{fee.toLocaleString()} owed</div>
                )}

                {isStaff && item.status !== "returned" && (
                  <button
                    onClick={() => markReturned(item.id)}
                    className="flex items-center gap-1.5 text-xs bg-forest-800 hover:bg-forest-700 text-paper-50 px-3 py-2"
                  >
                    <RotateCcw size={13} /> Mark returned
                  </button>
                )}

                {isStaff && (
                  <button
                    onClick={() => deleteRecord(item.id)}
                    className="flex items-center gap-1.5 text-xs border border-paper-300 text-clay-600 px-3 py-2"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
