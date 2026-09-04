import React, { useState } from "react";
import { Star, Download, BookOpen, Bookmark, RefreshCcw, Flag, MessageSquarePlus } from "lucide-react";
import { getFileUrl, incrementDownload } from "../lib/useResources";
import { borrowResource } from "../lib/borrow";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

const SPINE_COLORS = [
  "bg-forest-800", "bg-brass-600", "bg-forest-900", "bg-clay-600", "bg-forest-700",
];

export default function ResourceCard({ resource, index = 0, onOpen }) {
  const { profile, isStaff } = useAuth();
  const spine = SPINE_COLORS[index % SPINE_COLORS.length];
  const [panel, setPanel] = useState(null); // null | "report" | "remark"
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleOpen() {
    const url = await getFileUrl("resource-files", resource.file_path);
    incrementDownload(resource.id, resource.downloads_count);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    onOpen?.(resource);
  }

  async function handleBorrow() {
    if (!profile) return;
    setBusy(true);
    setMsg("");
    const { error } = await borrowResource(resource, profile);
    setBusy(false);
    setMsg(error ? error.message : "Borrowed! Check your email for the due date and penalty details.");
  }

  async function submitReport(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    await supabase.from("book_reports").insert({ resource_id: resource.id, user_id: profile.id, message: text });
    setBusy(false);
    setText("");
    setPanel(null);
    setMsg("Report sent to the library staff. Thank you.");
  }

  async function submitRemark(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    await supabase.from("resource_reviews").upsert(
      { resource_id: resource.id, user_id: profile.id, rating, comment: text },
      { onConflict: "resource_id,user_id" }
    );
    setBusy(false);
    setText("");
    setPanel(null);
    setMsg("Thanks for your remark!");
  }

  return (
    <div className="catalog-card bg-paper-50 border border-paper-300 flex flex-col">
      <div className={`h-28 ${spine} relative flex items-end p-3`}>
        <button
          className="absolute top-2 right-2 w-7 h-7 bg-paper-50/90 flex items-center justify-center rounded-sm"
          aria-label="Save to bookmarks"
        >
          <Bookmark size={13} className="text-ink-900" />
        </button>
        <p className="font-display text-paper-50 text-base leading-tight pr-6">{resource.title}</p>
      </div>

      <div className="p-4 flex-1 flex flex-col border-t border-paper-300">
        <p className="text-sm text-ink-700 mb-2">{resource.author || "Unknown author"}</p>

        <div className="flex items-center gap-2 mb-2">
          {resource.course_code && (
            <span className="font-mono-tag text-[11px] bg-forest-800 text-paper-50 px-2 py-0.5">
              {resource.course_code}
            </span>
          )}
          <span className="text-[11px] text-ink-500">{resource.department}</span>
        </div>

        <p className="text-[11px] text-ink-500 mb-3">
          Level {resource.level || "—"} · Semester {resource.semester || "—"}
        </p>

        <div className="flex items-center gap-3 text-xs text-ink-700 mb-3">
          <span className="flex items-center gap-1">
            <Star size={12} className="text-brass-500 fill-brass-500" /> {resource.avg_rating || "—"} ({resource.review_count || 0})
          </span>
          <span className="flex items-center gap-1">
            <Download size={12} /> {resource.downloads_count || 0}
          </span>
        </div>

        <button
          onClick={handleOpen}
          className="flex items-center justify-center gap-2 text-sm bg-forest-800 hover:bg-forest-700 text-paper-50 py-2 transition-colors"
        >
          <BookOpen size={14} /> Open resource
        </button>

        {!isStaff && resource.type === "academic_book" && (
          <button
            onClick={handleBorrow}
            disabled={busy}
            className="mt-2 flex items-center justify-center gap-2 text-sm border border-forest-800 text-forest-800 hover:bg-forest-800 hover:text-paper-50 py-2 transition-colors disabled:opacity-60"
          >
            <RefreshCcw size={14} /> {busy ? "Borrowing..." : "Borrow this book"}
          </button>
        )}

        {!isStaff && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => { setPanel(panel === "report" ? null : "report"); setText(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-paper-300 text-ink-700 hover:bg-paper-200 py-2"
            >
              <Flag size={12} /> Report
            </button>
            <button
              onClick={() => { setPanel(panel === "remark" ? null : "remark"); setText(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-paper-300 text-ink-700 hover:bg-paper-200 py-2"
            >
              <MessageSquarePlus size={12} /> Remark
            </button>
          </div>
        )}

        {panel === "report" && (
          <form onSubmit={submitReport} className="mt-2 space-y-2">
            <textarea
              required value={text} onChange={(e) => setText(e.target.value)}
              placeholder="What's wrong with this book? (missing pages, damaged, wrong title...)"
              className="w-full text-xs border border-paper-300 p-2 outline-none"
              rows={2}
            />
            <button type="submit" disabled={busy} className="text-xs bg-clay-600 text-paper-50 px-3 py-1.5 disabled:opacity-60">
              {busy ? "Sending..." : "Submit report"}
            </button>
          </form>
        )}

        {panel === "remark" && (
          <form onSubmit={submitRemark} className="mt-2 space-y-2">
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="text-xs border border-paper-300 px-2 py-1">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
            </select>
            <textarea
              required value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Leave a remark about this book..."
              className="w-full text-xs border border-paper-300 p-2 outline-none"
              rows={2}
            />
            <button type="submit" disabled={busy} className="text-xs bg-forest-800 text-paper-50 px-3 py-1.5 disabled:opacity-60">
              {busy ? "Sending..." : "Submit remark"}
            </button>
          </form>
        )}

        {msg && <p className="mt-2 text-[11px] text-forest-800">{msg}</p>}
      </div>
    </div>
  );
}
