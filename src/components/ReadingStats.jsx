import React, { useEffect, useState } from "react";
import { Flame, BookOpen, Library, GraduationCap, Zap, Trophy, Lock } from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { computeReadingStats, BADGES } from "../lib/reading";

const ICONS = { BookOpen, Library, GraduationCap, Flame, Zap, Trophy };

export default function ReadingStats() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("reading_activity")
      .select("resource_id, opened_on")
      .eq("user_id", user.id)
      .order("opened_on", { ascending: false })
      .limit(3000)
      .then(({ data, error }) => setRows(error ? [] : data || []));
  }, [user]);

  const stats = computeReadingStats(rows || []);

  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stats.current > 0 ? "bg-amber-soft text-amber-ink" : "bg-paper-200 text-ink-500"}`}>
          <Flame size={22} />
        </div>
        <div className="min-w-0">
          {rows === null ? (
            <>
              <div className="skeleton h-5 w-24 rounded mb-1.5" />
              <div className="skeleton h-3 w-32 rounded" />
            </>
          ) : (
            <>
              <p className="stat-number font-display text-xl font-bold text-ink-900 leading-tight">
                {stats.current}-day streak
              </p>
              <p className="text-xs text-ink-500">
                {stats.current === 0 ? "Open a resource today to start one" : stats.activeToday ? "You've read today. Nice." : "Read today to keep it going"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center mb-4">
        {[
          { v: stats.semester, l: "This semester" },
          { v: stats.best, l: "Best streak" },
          { v: stats.total, l: "All time" },
        ].map((s) => (
          <div key={s.l} className="rounded-lg bg-paper-100 py-2">
            <p className="stat-number text-lg font-bold text-ink-900">{rows === null ? "—" : s.v}</p>
            <p className="text-[10px] text-ink-500">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-ink-500 -mt-2 mb-4">Counts each different resource you open.</p>

      <h3 className="font-display text-xs font-semibold text-ink-900 mb-2">Badges</h3>
      <div className="grid grid-cols-3 gap-2">
        {BADGES.map((b) => {
          const Icon = ICONS[b.icon];
          const earned = rows !== null && b.test(stats);
          return (
            <div
              key={b.key}
              title={b.hint}
              className={`rounded-lg border p-2 text-center transition-colors ${
                earned ? "border-brand-500/40 bg-brand-100" : "border-paper-300 bg-paper-100 opacity-70"
              }`}
            >
              <div className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center ${earned ? "bg-brand-700 text-white" : "bg-paper-200 text-ink-500"}`}>
                {earned ? <Icon size={15} /> : <Lock size={13} />}
              </div>
              <p className="text-[11px] font-semibold text-ink-900 mt-1 leading-tight">{b.name}</p>
              <p className="text-[9px] text-ink-500 leading-tight">{b.hint}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
