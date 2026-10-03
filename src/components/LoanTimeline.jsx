import React from "react";
import { PENALTY_PER_DAY, feeOwed } from "../lib/borrow";

const DAY = 86400000;
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const fmt = (t) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function Node({ pct, label, date, side = "below", dot }) {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2" style={{ left: `${pct}%` }}>
      <div className={`w-3 h-3 rounded-full border-2 ${dot}`} />
      <div
        className={`absolute left-1/2 -translate-x-1/2 text-center whitespace-nowrap leading-tight ${
          side === "below" ? "top-full mt-1.5" : "bottom-full mb-1.5"
        }`}
      >
        <p className="text-[10px] font-semibold text-ink-700">{label}</p>
        {date && <p className="text-[10px] text-ink-500">{date}</p>}
      </div>
    </div>
  );
}

// Borrowed -> Due -> Today/Returned, with the late stretch in red.
export default function LoanTimeline({ item }) {
  const start = new Date(item.borrowed_at || item.due_date).getTime();
  const due = new Date(item.due_date).getTime();
  const returned = item.status === "returned" && item.returned_at ? new Date(item.returned_at).getTime() : null;
  const now = Date.now();
  const end = returned ?? now;

  const span = Math.max(due, end) - start || 1;
  const pct = (t) => Math.min(100, Math.max(0, ((t - start) / span) * 100));
  const duePct = pct(due);
  const endPct = pct(end);
  const late = end > due;
  const fee = feeOwed(item);
  const diff = Math.round((startOfDay(due) - startOfDay(end)) / DAY); // days between due day and today/return day

  let status;
  let tone = "text-ink-700";
  if (returned) {
    status = late ? `Returned ${fmt(returned)}, ${-diff} day${-diff === 1 ? "" : "s"} late` : `Returned ${fmt(returned)}, on time`;
    tone = late ? "text-rose-ink" : "text-green-ink";
  } else if (late) {
    status = `${-diff} day${-diff === 1 ? "" : "s"} overdue`;
    tone = "text-rose-ink";
  } else if (diff === 0) {
    status = "Due today";
    tone = "text-amber-ink";
  } else {
    status = `${diff} day${diff === 1 ? "" : "s"} left`;
    tone = diff <= 3 ? "text-amber-ink" : "text-green-ink";
  }

  return (
    <div className="w-full basis-full pt-1">
      <div className="relative mx-10 mt-7 mb-9 h-1.5 rounded-full bg-paper-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${Math.min(endPct, duePct)}%` }}
        />
        {late && (
          <div
            className="absolute inset-y-0 rounded-full bg-rose-ink"
            style={{ left: `${duePct}%`, width: `${Math.max(0, endPct - duePct)}%` }}
          />
        )}
        <Node pct={0} label="Borrowed" date={fmt(start)} dot="bg-brand-700 border-brand-700" />
        <Node pct={duePct} label="Due" date={fmt(due)} dot={late ? "bg-rose-ink border-rose-ink" : "bg-paper-50 border-brand-700"} />
        <Node
          pct={endPct}
          side="above"
          label={returned ? "Returned" : "Today"}
          dot={returned ? "bg-green-ink border-green-ink" : "bg-paper-50 border-brand-500 ring-2 ring-brand-500/30"}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-medium ${tone}`}>{status}</span>
        {fee > 0 ? (
          <span className="font-medium text-rose-ink">₦{fee.toLocaleString()} {returned ? "late fee" : "owed"}</span>
        ) : !returned ? (
          <span className="text-ink-500">Late fee ₦{PENALTY_PER_DAY}/day after {fmt(due)}</span>
        ) : null}
      </div>
    </div>
  );
}
