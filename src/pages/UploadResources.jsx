import React, { useEffect, useState } from "react";
import { UploadCloud, FileSpreadsheet, Download, BookPlus, ImagePlus, X } from "lucide-react";
import Layout from "../components/Layout";
import Dropzone from "../components/Dropzone";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { COVER_TYPES, uploadCover } from "../lib/image";

const TYPES = [
  { value: "academic_book", label: "Academic Book" },
  { value: "ebook", label: "eBook" },
  { value: "pdf", label: "PDF" },
  { value: "past_question", label: "Past Question" },
  { value: "revision_note", label: "Revision Note" },
];

const CSV_COLUMNS = [
  "type", "title", "author", "course_code", "department",
  "faculty", "level", "semester", "description", "total_copies",
];

const EMPTY_FORM = {
  type: "academic_book", title: "", author: "", course_code: "",
  department: "", faculty: "", level: "", semester: "", description: "",
  total_copies: 1,
};

const inputCls = "mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 rounded-md text-sm transition-colors focus:border-brand-500 focus:outline-none";

// Small CSV parser that handles quoted fields containing commas.
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { header: [], rows: [] };

  function parseLine(line) {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else cur += ch;
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  const header = parseLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map(parseLine);
  return { header, rows };
}

export default function UploadResources() {
  const { user } = useAuth();
  const [mode, setMode] = useState("single"); // single | bulk

  // ---- single upload state ----
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // thumbnail of the chosen cover
  useEffect(() => {
    if (!cover) { setCoverPreview(null); return; }
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  const canHaveCover = COVER_TYPES.includes(form.type);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    let file_path = null;
    if (file) {
      const path = `${form.type}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resource-files").upload(path, file);
      if (uploadError) {
        setMessage({ type: "error", text: uploadError.message });
        setSaving(false);
        return;
      }
      file_path = path;
    }

    const total = Math.max(1, Number(form.total_copies) || 1);
    const { data: created, error: insertError } = await supabase
      .from("resources")
      .insert({
        ...form,
        total_copies: total,
        available_copies: total,
        file_path,
        uploaded_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      setSaving(false);
      setMessage({ type: "error", text: insertError.message });
      return;
    }

    // cover image (optional); the book is already saved even if this step fails
    let coverError = null;
    if (cover && canHaveCover) {
      try {
        coverError = await uploadCover(created.id, cover);
      } catch (err) {
        coverError = err;
      }
    }

    setSaving(false);
    setMessage(
      coverError
        ? { type: "error", text: `Resource added, but the cover could not be uploaded: ${coverError.message}` }
        : { type: "success", text: "Resource added to the catalog." }
    );
    setForm(EMPTY_FORM);
    setFile(null);
    setCover(null);
  }

  // ---- bulk upload state ----
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState(null);

  function handleCsvFile(f) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      setCsvText(text);
      buildPreview(text);
    };
    reader.readAsText(f);
  }

  function buildPreview(text) {
    const { header, rows } = parseCsv(text);
    const errors = [];

    if (!header.includes("title") || !header.includes("type")) {
      setPreview([]);
      setBulkErrors(["CSV must include at least 'type' and 'title' columns."]);
      return;
    }

    const parsed = rows.map((cells, i) => {
      const obj = {};
      header.forEach((col, idx) => { obj[col] = cells[idx] ?? ""; });
      if (!obj.title) errors.push(`Row ${i + 2}: missing title.`);
      if (!TYPES.some((t) => t.value === obj.type)) errors.push(`Row ${i + 2}: unknown type "${obj.type}".`);
      const total = Math.max(1, parseInt(obj.total_copies, 10) || 1);
      return { ...obj, total_copies: total, available_copies: total };
    });

    setPreview(parsed);
    setBulkErrors(errors);
  }

  async function submitBulk() {
    if (preview.length === 0 || bulkErrors.length > 0) return;
    setBulkSaving(true);
    setBulkMessage(null);

    const rows = preview.map((r) => ({
      type: r.type,
      title: r.title,
      author: r.author || null,
      course_code: r.course_code || null,
      department: r.department || null,
      faculty: r.faculty || null,
      level: r.level || null,
      semester: r.semester || null,
      description: r.description || null,
      total_copies: r.total_copies,
      available_copies: r.available_copies,
      uploaded_by: user.id,
    }));

    const { error, data } = await supabase.from("resources").insert(rows).select("id");

    setBulkSaving(false);
    if (error) {
      setBulkMessage({ type: "error", text: error.message });
    } else {
      setBulkMessage({ type: "success", text: `${data.length} books added to the catalog.` });
      setCsvText("");
      setPreview([]);
    }
  }

  function downloadTemplate() {
    const header = CSV_COLUMNS.join(",");
    const example = 'academic_book,"Introduction to Algorithms",Cormen,CSC301,Computer Science,SICT,300,1,"Core textbook",5';
    const blob = new Blob([`${header}\n${example}\n`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smartlib-bulk-upload-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout searchPlaceholder="Search uploads...">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white p-4 sm:p-6 page-enter">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
            <BookPlus size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl">Upload Resources</h1>
            <p className="text-sm text-white/70">Add a single title, or import many at once with a CSV.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMode("single")}
          className={`pill-tab px-4 py-2 text-sm font-medium border rounded-lg ${mode === "single" ? "active border-brand-700" : "border-paper-300 text-ink-700 bg-paper-50"}`}
        >
          Single book
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`pill-tab px-4 py-2 text-sm font-medium border rounded-lg ${mode === "bulk" ? "active border-brand-700" : "border-paper-300 text-ink-700 bg-paper-50"}`}
        >
          Bulk upload (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {mode === "single" && (
            <form onSubmit={handleSubmit} className="card p-4 sm:p-6 max-w-2xl space-y-4 page-enter">
              {message && (
                <p className={`text-sm px-3 py-2 rounded-md ${message.type === "error" ? "text-rose-ink bg-rose-soft" : "text-green-ink bg-green-soft"}`}>
                  {message.text}
                </p>
              )}

              <div>
                <label className="text-sm font-medium text-ink-700">Resource type</label>
                <select value={form.type} onChange={(e) => update("type", e.target.value)} className={inputCls}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink-700">Title</label>
                  <input required value={form.title} onChange={(e) => update("title", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700">Author</label>
                  <input value={form.author} onChange={(e) => update("author", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink-700">Course code</label>
                  <input value={form.course_code} onChange={(e) => update("course_code", e.target.value)} className={`${inputCls} font-mono-tag`} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700">Department</label>
                  <input value={form.department} onChange={(e) => update("department", e.target.value)} className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink-700">Faculty</label>
                  <input value={form.faculty} onChange={(e) => update("faculty", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700">Level</label>
                  <input value={form.level} onChange={(e) => update("level", e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700">Semester</label>
                  <input value={form.semester} onChange={(e) => update("semester", e.target.value)} className={inputCls} />
                </div>
              </div>

              {form.type === "academic_book" && (
                <div>
                  <label className="text-sm font-medium text-ink-700">Number of copies (for renting)</label>
                  <input type="number" min={1} value={form.total_copies}
                    onChange={(e) => update("total_copies", e.target.value)}
                    className="mt-1.5 w-32 border border-paper-300 bg-paper-50 px-3 py-2 rounded-md text-sm transition-colors focus:border-brand-500 focus:outline-none" />
                  <p className="text-[11px] text-ink-500 mt-1">
                    Available copies go down automatically each time a student borrows this book, and go back up when it's returned.
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-ink-700">Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} className={inputCls} />
              </div>

              {canHaveCover && (
                <div>
                  <label className="text-sm font-medium text-ink-700 block mb-1.5">Cover image (optional)</label>
                  {coverPreview ? (
                    <div className="flex items-center gap-3">
                      <img src={coverPreview} alt="Cover preview" className="w-20 h-28 object-cover rounded-md border border-paper-300" />
                      <div className="min-w-0">
                        <p className="text-xs text-ink-700 truncate">{cover?.name}</p>
                        <button
                          type="button"
                          onClick={() => setCover(null)}
                          className="mt-1 inline-flex items-center gap-1 text-xs text-rose-ink hover:underline"
                        >
                          <X size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <Dropzone
                      icon={ImagePlus}
                      label="Click to choose a cover picture"
                      accept="image/*"
                      onFile={setCover}
                    />
                  )}
                  <p className="text-[11px] text-ink-500 mt-1">JPG or PNG. It is resized automatically. Books without a cover show a colored card.</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-ink-700 block mb-1.5">File</label>
                <Dropzone
                  icon={UploadCloud}
                  label="Click to choose a file"
                  fileName={file?.name}
                  onFile={setFile}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-60 w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                {saving ? "Uploading..." : "Add to catalog"}
              </button>
            </form>
          )}

          {mode === "bulk" && (
            <div className="card p-4 sm:p-6 max-w-3xl space-y-4 page-enter">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-ink-700">
                  Upload many books at once with a CSV file. Columns: <span className="font-mono-tag text-xs break-words">{CSV_COLUMNS.join(", ")}</span>.
                  Set <span className="font-mono-tag text-xs">total_copies</span> to however many copies of that book the library has for renting.
                  Cover images can't be imported by CSV, so these books show a colored card.
                </p>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs border border-paper-300 rounded-md px-3 py-1.5 text-ink-700 bg-paper-50 hover:bg-paper-100 transition-colors whitespace-nowrap">
                  <Download size={13} /> Download template
                </button>
              </div>

              <Dropzone
                icon={FileSpreadsheet}
                label="Click to choose a .csv file"
                accept=".csv,text/csv"
                fileName={csvText ? "CSV loaded — review below" : null}
                onFile={handleCsvFile}
              />

              <div>
                <label className="text-sm font-medium text-ink-700">...or paste CSV directly</label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => { setCsvText(e.target.value); buildPreview(e.target.value); }}
                  placeholder={`type,title,author,course_code,department,faculty,level,semester,description,total_copies\nacademic_book,Data Structures,Weiss,CSC201,Computer Science,SICT,200,1,,3`}
                  className={`${inputCls} text-xs font-mono-tag`}
                />
              </div>

              {bulkErrors.length > 0 && (
                <div className="text-sm text-rose-ink bg-rose-soft px-3 py-2 rounded-md">
                  {bulkErrors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}

              {preview.length > 0 && bulkErrors.length === 0 && (
                <div>
                  <p className="text-sm text-ink-700 mb-2">{preview.length} book(s) ready to import:</p>
                  <div className="overflow-x-auto border border-paper-300">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-paper-300 text-left text-ink-500">
                          <th className="p-2">Title</th>
                          <th className="p-2">Type</th>
                          <th className="p-2">Dept</th>
                          <th className="p-2">Copies</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((r, i) => (
                          <tr key={i} className="border-b border-paper-200">
                            <td className="p-2 text-ink-900">{r.title}</td>
                            <td className="p-2 text-ink-700">{r.type}</td>
                            <td className="p-2 text-ink-700">{r.department}</td>
                            <td className="p-2 text-ink-700">{r.total_copies}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {bulkMessage && (
                <p className={`text-sm px-3 py-2 rounded-md ${bulkMessage.type === "error" ? "text-rose-ink bg-rose-soft" : "text-green-ink bg-green-soft"}`}>
                  {bulkMessage.text}
                </p>
              )}

              <button
                onClick={submitBulk}
                disabled={bulkSaving || preview.length === 0 || bulkErrors.length > 0}
                className="btn-primary disabled:opacity-60 w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-medium"
              >
                {bulkSaving ? "Importing..." : `Import ${preview.length || ""} book(s)`}
              </button>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display text-sm font-semibold text-ink-900 mb-3">Upload Guidelines</h2>
          <ul className="space-y-2 text-xs text-ink-700">
            <li className="flex gap-2"><span className="text-green-ink">✓</span> Accepted file types: PDF, DOCX, PPTX, TXT, ZIP</li>
            <li className="flex gap-2"><span className="text-green-ink">✓</span> Maximum file size: 50MB</li>
            <li className="flex gap-2"><span className="text-green-ink">✓</span> Ensure the content is relevant and educational</li>
            <li className="flex gap-2"><span className="text-green-ink">✓</span> Do not upload copyrighted or unauthorized materials</li>
            <li className="flex gap-2"><span className="text-green-ink">✓</span> Provide accurate information for easy discovery</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
