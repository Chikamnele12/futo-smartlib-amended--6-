import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, RefreshCcw, Bell, Clock, Users2, Library, Banknote, TrendingUp, ArrowUpRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { feeOwed } from "../lib/borrow";

const TYPE_LABELS = {
  academic_book: "Academic Books",
  ebook: "eBooks",
  pdf: "PDFs",
  past_question: "Past Questions",
  revision_note: "Revision Notes",
};

const ACCENT = "#4f46e5"; // indigo-600
const ACCENT_SOFT = "#eef2ff"; // indigo-50

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-slate-900 tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, isStaff } = useAuth();
  const [totalResources, setTotalResources] = useState(null);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [staffStats, setStaffStats] = useState(null);
  const [typeBreakdown, setTypeBreakdown] = useState([]);
  const [borrowTrend, setBorrowTrend] = useState([]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .then(({ count }) => setTotalResources(count ?? 0));

    supabase
      .from("borrowed_items")
      .select("id, due_date, resources(title, course_code)")
      .eq("user_id", user.id)
      .eq("status", "borrowed")
      .order("due_date", { ascending: true })
      .then(({ data }) => setActiveBorrows(data || []));

    supabase
      .from("notifications")
      .select("id, title, message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => setRecentNotifications(data || []));
  }, [user]);

  useEffect(() => {
    if (!isStaff) return;

    async function loadStaffStats() {
      const [{ count: booksBorrowed }, { count: totalUsers }, { data: allBorrows }, { data: resources }] = await Promise.all([
        supabase.from("borrowed_items").select("id", { count: "exact", head: true }).eq("status", "borrowed"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("borrowed_items").select("id, status, due_date, returned_at, borrowed_at"),
        supabase.from("resources").select("type"),
      ]);

      const totalFees = (allBorrows || []).reduce((sum, b) => sum + feeOwed(b), 0);
      setStaffStats({ booksBorrowed: booksBorrowed ?? 0, totalUsers: totalUsers ?? 0, totalFees });

      const counts = {};
      (resources || []).forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
      setTypeBreakdown(Object.entries(counts).map(([type, value]) => ({ name: TYPE_LABELS[type] || type, value })));

      const days = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) };
      });
      const dayCounts = Object.fromEntries(days.map((d) => [d.key, 0]));
      (allBorrows || []).forEach((b) => {
        const key = (b.borrowed_at || "").slice(0, 10);
        if (key in dayCounts) dayCounts[key] += 1;
      });
      setBorrowTrend(days.map((d) => ({ date: d.label, borrows: dayCounts[d.key] })));
    }
    loadStaffStats();
  }, [isStaff]);

  const firstName = (profile?.full_name || "there").split(" ")[0];
  const hasChartData = useMemo(() => typeBreakdown.some((t) => t.value > 0), [typeBreakdown]);

  return (
    <Layout>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-slate-500">Home</p>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Welcome back, {firstName}</h1>
        </div>
        <Link
          to="/academic-books"
          className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-md transition-colors"
          style={{ background: ACCENT }}
        >
          <BookOpen size={15} /> Browse catalog
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">Resources in the collection</p>
          <p className="text-4xl font-semibold text-slate-900 tracking-tight">{totalResources === null ? "—" : totalResources}</p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: ACCENT }}>
          <ArrowUpRight size={16} />
          <span>Growing collection</span>
        </div>
      </div>

      {isStaff && staffStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Library} value={totalResources ?? "—"} label="Total books" />
          <StatCard icon={RefreshCcw} value={staffStats.booksBorrowed} label="Currently borrowed" />
          <StatCard icon={Users2} value={staffStats.totalUsers} label="Total users" />
          <StatCard icon={Banknote} value={`₦${staffStats.totalFees.toLocaleString()}`} label="Fees owed" />
        </div>
      )}

      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Borrowing activity — last 14 days</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={borrowTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="borrowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Area type="monotone" dataKey="borrows" stroke={ACCENT} strokeWidth={2} fill="url(#borrowFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <Library size={16} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-900">Catalog by type</h2>
            </div>
            {hasChartData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeBreakdown} layout="vertical" margin={{ left: -10 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500">No resources uploaded yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCcw size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Currently borrowed</h2>
          </div>
          {activeBorrows.length === 0 && (
            <p className="text-sm text-slate-500">You have nothing borrowed. Browse the catalog to check something out.</p>
          )}
          <div className="space-y-3">
            {activeBorrows.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-slate-900">{b.resources?.title}</p>
                  <p className="text-xs text-slate-500 font-mono">{b.resources?.course_code}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  <Clock size={12} /> Due {new Date(b.due_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Recent notifications</h2>
          </div>
          {recentNotifications.length === 0 && (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          )}
          <div className="space-y-3">
            {recentNotifications.map((n) => (
              <div key={n.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                <p className="text-xs text-slate-500">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
