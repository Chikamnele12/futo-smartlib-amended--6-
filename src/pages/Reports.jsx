import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Library, Users2, RefreshCcw, AlertTriangle, Download } from "lucide-react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";

const TYPE_LABELS = {
  academic_book: "Academic Books",
  ebook: "eBooks",
  pdf: "PDFs",
  past_question: "Past Questions",
  revision_note: "Revision Notes",
};
const DONUT_COLORS = ["#6d28d9", "#2563eb", "#16a34a", "#d97706", "#dc2626"];

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

function downloadCsv(filename, header, rows) {
  const csv = [header.join(","), ...rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [byType, setByType] = useState([]);
  const [totals, setTotals] = useState({ resources: 0, users: 0, borrowed: 0, overdue: 0 });
  const [resourcesRaw, setResourcesRaw] = useState([]);
  const [usersRaw, setUsersRaw] = useState([]);
  const [borrowedRaw, setBorrowedRaw] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: resources } = await supabase.from("resources").select("type, title, course_code, department, downloads_count, created_at");
      const counts = {};
      (resources || []).forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });
      setByType(Object.entries(counts).map(([type, count]) => ({ name: TYPE_LABELS[type] || type, count })));
      setResourcesRaw(resources || []);

      const { data: users } = await supabase.from("profiles").select("full_name, email, role, department");
      setUsersRaw(users || []);

      const { data: borrowed } = await supabase.from("borrowed_items").select("status, due_date, borrowed_at, resources(title), profiles(full_name)");
      setBorrowedRaw(borrowed || []);

      const overdueCount = (borrowed || []).filter((b) => b.status === "borrowed" && new Date(b.due_date) < new Date()).length;
      const borrowedCount = (borrowed || []).filter((b) => b.status === "borrowed").length;

      setTotals({ resources: (resources || []).length, users: (users || []).length, borrowed: borrowedCount, overdue: overdueCount });
    }
    load();
  }, []);

  return (
    <Layout searchPlaceholder="Search reports by name or type...">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Reports</h1>
        <p className="text-sm text-ink-500">Home &gt; Reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Library} value={totals.resources} label="Total Resources" bg="bg-brand-100" ink="text-brand-700" />
            <StatCard icon={Users2} value={totals.users} label="Registered Users" bg="bg-blue-soft" ink="text-blue-ink" />
            <StatCard icon={RefreshCcw} value={totals.borrowed} label="Currently Borrowed" bg="bg-green-soft" ink="text-green-ink" />
            <StatCard icon={AlertTriangle} value={totals.overdue} label="Overdue" bg="bg-rose-soft" ink="text-rose-ink" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card p-5">
              <h2 className="font-display text-sm font-semibold text-ink-900 mb-4">Collection by Type</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byType} dataKey="count" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {byType.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-5">
              <h2 className="font-display text-sm font-semibold text-ink-900 mb-4">Resources per Type</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byType}>
                  <CartesianGrid stroke="#eeeef5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8b87a3" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8b87a3" }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e0e0ec" }} />
                  <Bar dataKey="count" fill="#6d28d9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-sm font-semibold text-ink-900 mb-3">Quick Export</h2>
          <div className="space-y-1">
            <button
              onClick={() => downloadCsv("resources-report.csv", ["type", "title", "course_code", "department", "downloads", "uploaded"],
                resourcesRaw.map((r) => [r.type, r.title, r.course_code, r.department, r.downloads_count, r.created_at]))}
              className="w-full flex items-center justify-between text-sm text-ink-700 hover:bg-paper-100 rounded-md px-2 py-2.5 transition-colors"
            >
              <span>Export Resources Report</span> <Download size={14} className="text-brand-700" />
            </button>
            <button
              onClick={() => downloadCsv("users-report.csv", ["full_name", "email", "role", "department"],
                usersRaw.map((u) => [u.full_name, u.email, u.role, u.department]))}
              className="w-full flex items-center justify-between text-sm text-ink-700 hover:bg-paper-100 rounded-md px-2 py-2.5 transition-colors"
            >
              <span>Export Users Report</span> <Download size={14} className="text-brand-700" />
            </button>
            <button
              onClick={() => downloadCsv("borrowing-report.csv", ["title", "borrower", "status", "borrowed_at", "due_date"],
                borrowedRaw.map((b) => [b.resources?.title, b.profiles?.full_name, b.status, b.borrowed_at, b.due_date]))}
              className="w-full flex items-center justify-between text-sm text-ink-700 hover:bg-paper-100 rounded-md px-2 py-2.5 transition-colors"
            >
              <span>Export Borrowing Report</span> <Download size={14} className="text-brand-700" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
