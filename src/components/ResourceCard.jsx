import React, { useState } from "react";
import { Star, Download, BookOpen, Bookmark, RefreshCcw, Flag, MessageSquarePlus } from "lucide-react";
import { getFileUrl, incrementDownload } from "../lib/useResources";
import { borrowResource } from "../lib/borrow";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

const COVER_GRADIENTS = [
  "from-indigo-600 to-violet-800",
  "from-fuchsia-600 to-purple-800",
  "from-blue-600 to-indigo-800",
  "from-rose-500 to-pink-700",
  "from-emerald-600 to-teal-800",
];

export default function ResourceCard({ resource, index = 0, onOpen }) {
  const { profile, isStaff } = useAuth();
  const cover = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
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

  const outOfStock = resource.type === "academic_book" && (resource.available_copies ?? 1) <= 0;

  async function handleBorrow() {
    if (!profile || outOfStock) return;
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
    <div className="card card-hover overflow-hidden flex flex-col">
      <div className={`h-32 bg-gradient-to-br ${cover} relative flex items-start justify-between p-3`}>
        <p className="font-display font-bold text-white text-base leading-snug pr-6">{resource.title}</p>
        <button
          className="w-7 h-7 shrink-0 bg-white/90 rounded-md flex items-center justify-center"
          aria-label="Save to bookmarks"
        >
          <Bookmark size={13} className="text-ink-900" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <p className="text-sm text-ink-700 mb-2">{resource.author || "Unknown author"}</p>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {resource.course_code && (
            <span className="font-mono-tag text-[11px] font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded">
              {resource.course_code}
            </span>
          )}
          <span className="text-[11px] text-ink-500">{resource.department}</span>
        </div>

        <p className="text-[11px] text-ink-500 mb-3">
          Level {resource.level || "—"} · Semester {resource.semester || "—"}
        </p>

        {resource.type === "academic_book" && (
          <p className={`text-[11px] font-medium mb-2 ${outOfStock ? "text-rose-ink" : "text-green-ink"}`}>
            {outOfStock ? "No copies available" : `${resource.available_copies ?? 1} of ${resource.total_copies ?? 1} copies available`}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-ink-700 mb-3">
          <span className="flex items-center gap-1">
            <Star size={12} className="text-amber-ink fill-amber-ink" /> {resource.avg_rating || "—"} ({resource.review_count || 0})
          </span>
          <span className="flex items-center gap-1">
            <Download size={12} /> {resource.downloads_count || 0}
          </span>
        </div>

        <button
          onClick={handleOpen}
          className="btn-primary flex items-center justify-center gap-2 text-sm rounded-md py-2"
        >
          <BookOpen size={14} /> Open resource
        </button>

        {!isStaff && resource.type === "academic_book" && (
          <button
            onClick={handleBorrow}
            disabled={busy || outOfStock}
            className="mt-2 flex items-center justify-center gap-2 text-sm border border-brand-700 text-brand-700 hover:bg-brand-700 hover:text-white rounded-md py-2 transition-colors disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-brand-700"
          >
            <RefreshCcw size={14} /> {outOfStock ? "Out of stock" : busy ? "Borrowing..." : "Borrow this book"}
          </button>
        )}

        {!isStaff && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => { setPanel(panel === "report" ? null : "report"); setText(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-paper-300 text-ink-700 hover:bg-paper-200 rounded-md py-2 transition-colors"
            >
              <Flag size={12} /> Report
            </button>
            <button
              onClick={() => { setPanel(panel === "remark" ? null : "remark"); setText(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-paper-300 text-ink-700 hover:bg-paper-200 rounded-md py-2 transition-colors"
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
              className="w-full text-xs border border-paper-300 rounded-md p-2 outline-none focus:border-brand-500"
              rows={2}
            />
            <button type="submit" disabled={busy} className="text-xs bg-rose-ink text-white rounded-md px-3 py-1.5 disabled:opacity-60">
              {busy ? "Sending..." : "Submit report"}
            </button>
          </form>
        )}

        {panel === "remark" && (
          <form onSubmit={submitRemark} className="mt-2 space-y-2">
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="text-xs border border-paper-300 rounded-md px-2 py-1">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
            </select>
            <textarea
              required value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Leave a remark about this book..."
              className="w-full text-xs border border-paper-300 rounded-md p-2 outline-none focus:border-brand-500"
              rows={2}
            />
            <button type="submit" disabled={busy} className="text-xs btn-primary rounded-md px-3 py-1.5 disabled:opacity-60">
              {busy ? "Sending..." : "Submit remark"}
            </button>
          </form>
        )}

        {msg && <p className="mt-2 text-[11px] text-green-ink">{msg}</p>}
      </div>
    </div>
  );
}
