import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2, BookOpen, Hourglass, CalendarCheck, Banknote, User } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { feeOwed } from "../lib/borrow";

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

export default function BorrowedItems() {
  const { user, profile, isStaff } = useAuth();
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
  const isDueSoon = (item) => {
    if (item.status !== "borrowed") return false;
    const days = (new Date(item.due_date) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 3;
  };

  const stats = useMemo(() => {
    const borrowed = items.filter((i) => i.status === "borrowed");
    const overdue = items.filter(isOverdue);
    const dueSoon = items.filter(isDueSoon);
    const returned = items.filter((i) => i.status === "returned");
    const totalFines = items.reduce((sum, i) => sum + feeOwed(i), 0);
    return { total: items.length, borrowed: borrowed.length, dueSoon: dueSoon.length, overdue: overdue.length, returned: returned.length, totalFines };
  }, [items]);

  const dueSoonList = items.filter(isDueSoon).slice(0, 3);

  return (
    <Layout searchPlaceholder="Search borrowed items...">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Borrowed Items</h1>
        <p className="text-sm text-ink-500">Home &gt; Borrowed Items</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={BookOpen} value={stats.borrowed} label="Currently Borrowed" bg="bg-brand-100" ink="text-brand-700" />
        <StatCard icon={Hourglass} value={stats.dueSoon} label="Due Soon" bg="bg-amber-soft" ink="text-amber-ink" />
        <StatCard icon={CalendarCheck} value={stats.overdue} label="Overdue" bg="bg-rose-soft" ink="text-rose-ink" />
        <StatCard icon={RotateCcw} value={stats.returned} label="Returned" bg="bg-blue-soft" ink="text-blue-ink" />
        <StatCard icon={Banknote} value={`₦${stats.totalFines.toLocaleString()}`} label="Total Fines" bg="bg-green-soft" ink="text-green-ink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card overflow-hidden">
          {loading && <p className="text-sm text-ink-500 p-4">Loading...</p>}
          {!loading && items.length === 0 && <p className="text-sm text-ink-500 p-4">Nothing on loan.</p>}

          <div className="divide-y divide-paper-200">
            {items.map((item) => {
              const overdue = isOverdue(item);
              const fee = feeOwed(item);
              return (
                <div key={item.id} className="flex items-center justify-between p-4 flex-wrap gap-3">
                  <div>
                    <p className="font-medium text-ink-900 text-sm">{item.resources?.title}</p>
                    <p className="text-xs text-ink-500 font-mono-tag">{item.resources?.course_code}</p>
                    {isStaff && <p className="text-xs text-ink-500">Borrowed by {item.profiles?.full_name}</p>}
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className={`stamp px-3 py-1 text-xs font-medium ${overdue ? "text-rose-ink" : "text-green-ink"}`}>
                      {item.status === "returned" ? "Returned" : overdue ? "Overdue" : "Due"}{" "}
                      {new Date(item.due_date).toLocaleDateString()}
                    </div>

                    {fee > 0 && <div className="text-xs font-medium text-rose-ink">₦{fee.toLocaleString()} owed</div>}

                    {isStaff && item.status !== "returned" && (
                      <button onClick={() => markReturned(item.id)} className="btn-primary flex items-center gap-1.5 text-xs rounded-md px-3 py-2">
                        <RotateCcw size={13} /> Mark returned
                      </button>
                    )}
                    {isStaff && (
                      <button onClick={() => deleteRecord(item.id)} className="flex items-center gap-1.5 text-xs border border-paper-300 text-rose-ink rounded-md px-3 py-2 hover:bg-paper-100 transition-colors">
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {!isStaff && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-ink-500" />
                <h2 className="font-display text-sm font-semibold text-ink-900">Account Overview</h2>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-500">Name</dt><dd className="text-ink-900 font-medium">{profile?.full_name || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">Matric No.</dt><dd className="text-ink-900 font-medium">{profile?.matric_number || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">Department</dt><dd className="text-ink-900 font-medium">{profile?.department || "—"}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-500">Email</dt><dd className="text-ink-900 font-medium truncate max-w-[60%]">{profile?.email || "—"}</dd></div>
              </dl>
            </div>
          )}

          <div className="card p-5">
            <h2 className="font-display text-sm font-semibold text-ink-900 mb-3">Due Soon</h2>
            {dueSoonList.length === 0 && <p className="text-sm text-ink-500">Nothing due in the next 3 days.</p>}
            <div className="space-y-3">
              {dueSoonList.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink-900 truncate">{item.resources?.title}</span>
                  <span className="text-xs text-amber-ink shrink-0 ml-2">{new Date(item.due_date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
