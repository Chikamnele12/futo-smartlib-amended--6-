import React, { useState } from "react";
import { Star, Download, BookOpen, Bookmark, RefreshCcw, Flag, MessageSquarePlus, Trash2 } from "lucide-react";
import { getFileUrl, incrementDownload } from "../lib/useResources";
import { borrowResource, addDays, toInputDate, BORROW_DAYS, MAX_BORROW_DAYS } from "../lib/borrow";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { coverUrl, COVER_TYPES, COVER_BUCKET } from "../lib/image";

const COVER_GRADIENTS = [
  "from-indigo-600 to-violet-800",
  "from-fuchsia-600 to-purple-800",
  "from-blue-600 to-indigo-800",
  "from-rose-500 to-pink-700",
  "from-emerald-600 to-teal-800",
];

export default function ResourceCard({ resource, index = 0, onOpen, onDeleted }) {
  const { profile, isStaff } = useAuth();
  const cover = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  const [panel, setPanel] = useState(null); // null | "report" | "remark" | "borrow"
  const [returnDate, setReturnDate] = useState(toInputDate(addDays(BORROW_DAYS)));
  const [isError, setIsError] = useState(false);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [receipt, setReceipt] = useState(null); // { ref, due } after a successful borrow
  const [deleted, setDeleted] = useState(false);
  const [coverOk, setCoverOk] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const showCover = COVER_TYPES.includes(resource.type) && !coverFailed;

  async function handleOpen() {
    const url = await getFileUrl("resource-files", resource.file_path);
    incrementDownload(resource.id, resource.downloads_count);
    if (profile?.id) {
      supabase
        .from("reading_activity")
        .upsert(
          { user_id: profile.id, resource_id: String(resource.id), opened_on: toInputDate(new Date()) },
          { onConflict: "user_id,resource_id,opened_on", ignoreDuplicates: true }
        )
        .then(() => {});
    }
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    onOpen?.(resource);
  }

  const outOfStock = resource.type === "academic_book" && (resource.available_copies ?? 1) <= 0;

  async function handleBorrow(e) {
    e?.preventDefault();
    if (outOfStock) return;
    if (profile && (!profile.phone || !profile.level)) {
      setIsError(true);
      setMsg("Please add your level and phone number to your profile before borrowing.");
      return;
    }
    if (!profile) {
      setIsError(true);
      setMsg("Your profile could not be loaded. Please sign out and sign in again.");
      return;
    }
    setBusy(true);
    setMsg("");
    const { data, error } = await borrowResource(resource, profile, returnDate);
    setBusy(false);
    setIsError(!!error);
    setMsg(error ? error.message : "");
    if (!error) {
      setPanel(null);
      setReceipt({ ref: data.borrow_ref, due: data.due_date });
    }
  }

  async function handleDelete() {
    setBusy(true);
    setMsg("");
    setIsError(false);

    // delete the database row first; if loans or other records block it, we stop before touching the file
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    if (error) {
      setBusy(false);
      setIsError(true);
      setMsg(
        error.code === "23503"
          ? "This book has borrow records and can't be deleted."
          : error.message || "Could not delete this resource."
      );
      return;
    }

    if (resource.file_path) {
      await supabase.storage.from("resource-files").remove([resource.file_path]);
    }
    if (COVER_TYPES.includes(resource.type)) {
      await supabase.storage.from(COVER_BUCKET).remove([`${resource.id}.jpg`]);
    }
    setBusy(false);
    setDeleted(true);
    onDeleted?.(resource);
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

  if (deleted) return null;

  return (
    <div className="card card-hover overflow-hidden flex flex-col">
      <div className={`h-40 bg-gradient-to-br ${cover} relative overflow-hidden flex items-start justify-between p-3`}>
        {showCover && (
          <img
            src={coverUrl(resource.id)}
            alt=""
            loading="lazy"
            onLoad={() => setCoverOk(true)}
            onError={() => setCoverFailed(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: coverOk ? 1 : 0 }}
          />
        )}
        {!coverOk && (
          <p className="relative font-display font-bold text-white text-base leading-snug pr-6">{resource.title}</p>
        )}
        <button
          className="relative ml-auto w-7 h-7 shrink-0 bg-white/90 rounded-md flex items-center justify-center"
          aria-label="Save to bookmarks"
        >
          <Bookmark size={13} className="text-ink-900" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {coverOk && <p className="text-sm font-semibold text-ink-900 leading-snug mb-1">{resource.title}</p>}
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

        {isStaff && (
          <button
            onClick={() => { setPanel(panel === "delete" ? null : "delete"); setMsg(""); }}
            disabled={busy}
            className="mt-2 flex items-center justify-center gap-2 text-sm border border-rose-ink text-rose-ink hover:bg-rose-ink hover:text-white rounded-md py-2 transition-colors disabled:opacity-60"
          >
            <Trash2 size={14} /> {panel === "delete" ? "Cancel" : "Delete"}
          </button>
        )}

        {isStaff && panel === "delete" && (
          <div className="mt-2 border border-rose-ink/40 rounded-md p-3 bg-paper-100 space-y-2">
            <p className="text-xs text-ink-700">
              Delete <span className="font-semibold">{resource.title}</span> permanently? The file will be removed too.
            </p>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="w-full text-xs bg-rose-ink text-white rounded-md px-3 py-2 disabled:opacity-60"
            >
              {busy ? "Deleting..." : "Yes, delete"}
            </button>
          </div>
        )}

        {!isStaff && resource.type === "academic_book" && (
          <button
            onClick={() => { setPanel(panel === "borrow" ? null : "borrow"); setMsg(""); }}
            disabled={busy || outOfStock}
            className="mt-2 flex items-center justify-center gap-2 text-sm border border-brand-700 text-brand-700 hover:bg-brand-700 hover:text-white rounded-md py-2 transition-colors disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-brand-700"
          >
            <RefreshCcw size={14} /> {outOfStock ? "Out of stock" : busy ? "Borrowing..." : panel === "borrow" ? "Cancel" : "Borrow this book"}
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

        {panel === "borrow" && (
          <form onSubmit={handleBorrow} className="mt-2 space-y-2 border border-paper-300 rounded-md p-3 bg-paper-100">
            <label className="block text-xs font-medium text-ink-700">
              Return date
              <input
                type="date"
                required
                value={returnDate}
                min={toInputDate(addDays(1))}
                max={toInputDate(addDays(MAX_BORROW_DAYS))}
                onChange={(e) => setReturnDate(e.target.value)}
                className="mt-1 w-full text-sm border border-paper-300 rounded-md px-2 py-1.5 outline-none focus:border-brand-500 bg-white"
              />
            </label>
            <p className="text-[11px] text-ink-500">
              You can keep it for up to {MAX_BORROW_DAYS} days. Returning after this date costs ₦500 per day.
            </p>
            <button type="submit" disabled={busy} className="w-full text-xs btn-primary rounded-md px-3 py-2 disabled:opacity-60">
              {busy ? "Borrowing..." : "Confirm borrow"}
            </button>
          </form>
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

        {receipt && (
          <div className="mt-2 border border-green-ink/30 bg-paper-100 rounded-md p-3 text-center">
            <p className="text-[11px] text-ink-700">Borrowed! Give this reference to the librarian for payment and return:</p>
            <p className="font-mono-tag text-lg font-bold text-brand-700 tracking-wider my-1 select-all">{receipt.ref}</p>
            <p className="text-[11px] text-ink-500">Due {new Date(receipt.due).toLocaleDateString()} · also sent to your email</p>
            <button onClick={() => setReceipt(null)} className="mt-1 text-[11px] underline text-ink-500">Dismiss</button>
          </div>
        )}

        {msg && <p className={`mt-2 text-[11px] ${isError ? "text-rose-ink" : "text-green-ink"}`}>{msg}</p>}
      </div>
    </div>
  );
}
