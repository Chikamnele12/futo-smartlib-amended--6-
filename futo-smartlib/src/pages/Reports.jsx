import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";

const TYPE_LABELS = {
  academic_book: "Academic Books",
  ebook: "eBooks",
  pdf: "PDFs",
  past_question: "Past Questions",
  revision_note: "Revision Notes",
};

export default function Reports() {
  const [byType, setByType] = useState([]);
  const [totals, setTotals] = useState({ resources: 0, users: 0, borrowed: 0, overdue: 0 });

  useEffect(() => {
    async function load() {
      const { data: resources } = await supabase.from("resources").select("type, downloads_count");
      const counts = {};
      let downloads = 0;
      (resources || []).forEach((r) => {
        counts[r.type] = (counts[r.type] || 0) + 1;
        downloads += r.downloads_count || 0;
      });
      setByType(Object.entries(counts).map(([type, count]) => ({ name: TYPE_LABELS[type] || type, count })));

      const { count: userCount } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      const { count: borrowedCount } = await supabase.from("borrowed_items").select("id", { count: "exact", head: true }).eq("status", "borrowed");
      const { count: overdueCount } = await supabase.from("borrowed_items").select("id", { count: "exact", head: true }).eq("status", "borrowed").lt("due_date", new Date().toISOString());

      setTotals({ resources: (resources || []).length, users: userCount || 0, borrowed: borrowedCount || 0, overdue: overdueCount || 0 });
    }
    load();
  }, []);

  const cards = [
    { label: "Total resources", value: totals.resources },
    { label: "Registered users", value: totals.users },
    { label: "Currently borrowed", value: totals.borrowed },
    { label: "Overdue", value: totals.overdue },
  ];

  return (
    <Layout searchPlaceholder="Search reports...">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Reports</h1>
        <p className="text-sm text-ink-500">Manage &gt; Reports</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-paper-50 border border-paper-300 p-5">
            <p className="font-display text-3xl text-ink-900">{c.value}</p>
            <p className="text-xs text-ink-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-paper-50 border border-paper-300 p-5">
        <h2 className="font-display text-lg text-ink-900 mb-4">Collection by type</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byType}>
              <CartesianGrid stroke="#e8e4d4" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#46493f" }} />
              <YAxis tick={{ fontSize: 12, fill: "#46493f" }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#24463b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  );
}
