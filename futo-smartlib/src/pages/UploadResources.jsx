import React, { useState } from "react";
import { UploadCloud } from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

const TYPES = [
  { value: "academic_book", label: "Academic Book" },
  { value: "ebook", label: "eBook" },
  { value: "pdf", label: "PDF" },
  { value: "past_question", label: "Past Question" },
  { value: "revision_note", label: "Revision Note" },
];

export default function UploadResources() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: "academic_book", title: "", author: "", course_code: "",
    department: "", faculty: "", level: "", semester: "", description: "",
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

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

    const { error: insertError } = await supabase.from("resources").insert({
      ...form,
      file_path,
      uploaded_by: user.id,
    });

    setSaving(false);

    if (insertError) {
      setMessage({ type: "error", text: insertError.message });
    } else {
      setMessage({ type: "success", text: "Resource added to the catalog." });
      setForm({ type: "academic_book", title: "", author: "", course_code: "", department: "", faculty: "", level: "", semester: "", description: "" });
      setFile(null);
    }
  }

  return (
    <Layout searchPlaceholder="Search uploads...">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Upload Resources</h1>
        <p className="text-sm text-ink-500">Manage &gt; Upload Resources</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-paper-50 border border-paper-300 p-6 max-w-2xl space-y-4">
        {message && (
          <p className={`text-sm px-3 py-2 ${message.type === "error" ? "text-clay-600 bg-clay-500/10" : "text-forest-800 bg-forest-800/10"}`}>
            {message.text}
          </p>
        )}

        <div>
          <label className="text-sm font-medium text-ink-700">Resource type</label>
          <select
            value={form.type}
            onChange={(e) => update("type", e.target.value)}
            className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm"
          >
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Title</label>
            <input required value={form.title} onChange={(e) => update("title", e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Author</label>
            <input value={form.author} onChange={(e) => update("author", e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Course code</label>
            <input value={form.course_code} onChange={(e) => update("course_code", e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm font-mono-tag" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Department</label>
            <input value={form.department} onChange={(e) => update("department", e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Faculty</label>
            <input value={form.faculty} onChange={(e) => update("faculty", e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Level</label>
            <input value={form.level} onChange={(e) => update("level", e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Semester</label>
            <input value={form.semester} onChange={(e) => update("semester", e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)}
            className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700 block mb-1.5">File</label>
          <label className="flex items-center gap-2 border border-dashed border-paper-300 px-4 py-6 justify-center text-sm text-ink-500 cursor-pointer">
            <UploadCloud size={16} />
            {file ? file.name : "Click to choose a file"}
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-forest-800 hover:bg-forest-700 disabled:opacity-60 text-paper-50 px-5 py-2.5 text-sm font-medium"
        >
          {saving ? "Uploading..." : "Add to catalog"}
        </button>
      </form>
    </Layout>
  );
}
