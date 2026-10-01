import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, BookMarked, FileText, PencilLine, HelpCircle,
  Users2, Download, AlertTriangle, Banknote, UploadCloud,
  RefreshCcw, Bell, Clock, TrendingUp, Library, Search, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { feeOwed } from "../lib/borrow";

const TYPE_META = {
  academic_book: { label: "Academic Books", icon: BookOpen, bg: "bg-brand-100", ink: "text-brand-700" },
  ebook: { label: "eBooks", icon: BookMarked, bg: "bg-green-soft", ink: "text-green-ink" },
  pdf: { label: "PDFs", icon: FileText, bg: "bg-blue-soft", ink: "text-blue-ink" },
  revision_note: { label: "Revision Notes", icon: PencilLine, bg: "bg-amber-soft", ink: "text-amber-ink" },
  past_question: { label: "Past Questions", icon: HelpCircle, bg: "bg-rose-soft", ink: "text-rose-ink" },
};
const TYPE_ORDER = ["academic_book", "ebook", "pdf", "revision_note", "past_question"];
const DONUT_COLORS = ["#6d28d9", "#2563eb", "#16a34a", "#d97706", "#dc2626", "#94a3b8"];

function StatCard({ icon: Icon, value, label, bg, ink }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${bg} ${ink}`}>
        <Icon size={19} />
      </div>
      <div className="min-w-0">
        <p className="stat-number text-xl font-bold text-ink-900 leading-tight">{value}</p>
        <p className="text-xs text-ink-500 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, isStaff } = useAuth();
  const [typeCounts, setTypeCounts] = useState({});
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [staffStats, setStaffStats] = useState(null);
  const [facultyBreakdown, setFacultyBreakdown] = useState([]);
  const [borrowTrend, setBorrowTrend] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [topDownloads, setTopDownloads] = useState([]);

  const totalResources = useMemo(
    () => Object.values(typeCounts).reduce((sum, n) => sum + n, 0),
    [typeCounts]
  );

  useEffect(() => {
    if (!user) return;

    supabase.from("resources").select("type, faculty, downloads_count, created_at, title, course_code")
      .then(({ data }) => {
        const rows = data || [];
        const counts = {};
        const faculties = {};
        rows.forEach((r) => {
          counts[r.type] = (counts[r.type] || 0) + 1;
          if (r.faculty) faculties[r.faculty] = (faculties[r.faculty] || 0) + 1;
        });
        setTypeCounts(counts);
        setFacultyBreakdown(Object.entries(faculties).map(([name, value]) => ({ name, value })));
        setTopDownloads([...rows].sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0)).slice(0, 5));
        setRecentUploads([...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5));
      });

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
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [{ count: totalUsers }, { data: allBorrows }, { count: uploadedToday }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("borrowed_items").select("id, status, due_date, returned_at, borrowed_at"),
        supabase.from("resources").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      ]);

      const totalFees = (allBorrows || []).reduce((sum, b) => sum + feeOwed(b), 0);
      const overdueCount = (allBorrows || []).filter(
        (b) => b.status === "borrowed" && new Date(b.due_date) < new Date()
      ).length;
      const booksBorrowed = (allBorrows || []).filter((b) => b.status === "borrowed").length;

      setStaffStats({ totalUsers: totalUsers ?? 0, totalFees, overdueCount, uploadedToday: uploadedToday ?? 0, booksBorrowed });

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
  const totalDownloadsSum = useMemo(() => {
    return topDownloads.length ? topDownloads.reduce((s, r) => s + (r.downloads_count || 0), 0) : 0;
  }, [topDownloads]);

  return (
    <Layout>
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="text-sm text-ink-500">Welcome back, {firstName}! 👋</p>
        </div>
        <Link to="/academic-books" className="btn-primary flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg">
          <BookOpen size={15} /> Browse Catalog
        </Link>
      </div>

      {/* Row 1: resource type counts, everyone sees these */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {TYPE_ORDER.map((type) => {
          const meta = TYPE_META[type];
          return (
            <StatCard
              key={type}
              icon={meta.icon}
              value={typeCounts[type] ?? "—"}
              label={`Total ${meta.label}`}
              bg={meta.bg}
              ink={meta.ink}
            />
          );
        })}
      </div>

      {/* Row 2: operational metrics, staff only */}
      {isStaff && staffStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Users2} value={staffStats.totalUsers} label="Registered Users" bg="bg-brand-100" ink="text-brand-700" />
          <StatCard icon={Download} value={totalDownloadsSum.toLocaleString()} label="Total Downloads" bg="bg-blue-soft" ink="text-blue-ink" />
          <StatCard icon={AlertTriangle} value={staffStats.overdueCount} label="Overdue Returns" bg="bg-rose-soft" ink="text-rose-ink" />
          <StatCard icon={Banknote} value={`₦${staffStats.totalFees.toLocaleString()}`} label="Outstanding Fines" bg="bg-green-soft" ink="text-green-ink" />
          <StatCard icon={UploadCloud} value={staffStats.uploadedToday} label="Uploaded Today" bg="bg-amber-soft" ink="text-amber-ink" />
        </div>
      )}

      {/* Row 3: charts + quick actions */}
      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Library size={16} className="text-ink-500" />
              <h2 className="font-display text-sm font-semibold text-ink-900">Resources by Faculty</h2>
            </div>
            {facultyBreakdown.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={facultyBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {facultyBreakdown.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 text-xs flex-1">
                  {facultyBreakdown.map((f, i) => (
                    <div key={f.name} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-ink-700 truncate">{f.name}</span>
                      <span className="ml-auto text-ink-500">{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-500">No resources uploaded yet.</p>
            )}
          </div>

          <div className="lg:col-span-1 card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-ink-500" />
              <h2 className="font-display text-sm font-semibold text-ink-900">Borrowing — 14 days</h2>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={borrowTrend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="borrowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6d28d9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eeeef5" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8b87a3" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#8b87a3" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e0e0ec" }} />
                <Area type="monotone" dataKey="borrows" stroke="#6d28d9" strokeWidth={2} fill="url(#borrowFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-sm font-semibold text-ink-900 mb-4">Quick Actions</h2>
            <div className="space-y-1">
              {[
                { label: "Browse Academic Books", to: "/academic-books", icon: BookOpen },
                { label: "Upload Resource", to: "/upload-resources", icon: UploadCloud },
                { label: "Borrowed Items", to: "/borrowed-items", icon: RefreshCcw },
                { label: "View Reports", to: "/reports", icon: TrendingUp },
              ].map(({ label, to, icon: Icon }) => (
                <Link key={label} to={to} className="flex items-center justify-between text-sm text-ink-700 hover:bg-paper-100 rounded-md px-2 py-2 transition-colors group">
                  <span className="flex items-center gap-2"><Icon size={15} className="text-brand-700" /> {label}</span>
                  <ArrowRight size={13} className="text-ink-500 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 4: staff — recent uploads + most downloaded */}
      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <h2 className="font-display text-sm font-semibold text-ink-900 mb-4">Recent Uploads</h2>
            {recentUploads.length === 0 && <p className="text-sm text-ink-500">No uploads yet.</p>}
            <div className="space-y-3">
              {recentUploads.map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-paper-200 pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{r.title}</p>
                    <p className="text-xs text-ink-500 font-mono-tag">{r.course_code} · {r.faculty}</p>
                  </div>
                  <span className="text-xs text-ink-500 shrink-0 ml-3">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-sm font-semibold text-ink-900 mb-4">Most Downloaded Resources</h2>
            {topDownloads.length === 0 && <p className="text-sm text-ink-500">No downloads yet.</p>}
            <div className="space-y-3">
              {topDownloads.map((r, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-paper-200 pb-3 last:border-0 last:pb-0">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center shrink-0">{i + 1}</span>
                  <p className="text-sm text-ink-900 flex-1 truncate">{r.title}</p>
                  <span className="flex items-center gap-1 text-xs text-ink-500 shrink-0"><Download size={12} /> {r.downloads_count || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Personal: everyone sees their own borrows + notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCcw size={16} className="text-ink-500" />
            <h2 className="font-display text-sm font-semibold text-ink-900">Currently Borrowed</h2>
          </div>
          {activeBorrows.length === 0 && (
            <p className="text-sm text-ink-500">You have nothing borrowed. Browse the catalog to check something out.</p>
          )}
          <div className="space-y-3">
            {activeBorrows.map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b border-paper-200 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-ink-900">{b.resources?.title}</p>
                  <p className="text-xs text-ink-500 font-mono-tag">{b.resources?.course_code}</p>
                </div>
                <div className="stamp flex items-center gap-1.5 text-xs font-medium text-amber-ink px-2.5 py-1">
                  <Clock size={12} /> Due {new Date(b.due_date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-ink-500" />
            <h2 className="font-display text-sm font-semibold text-ink-900">Recent Notifications</h2>
          </div>
          {recentNotifications.length === 0 && (
            <p className="text-sm text-ink-500">No notifications yet.</p>
          )}
          <div className="space-y-3">
            {recentNotifications.map((n) => (
              <div key={n.id} className="border-b border-paper-200 pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-ink-900">{n.title}</p>
                <p className="text-xs text-ink-500">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
