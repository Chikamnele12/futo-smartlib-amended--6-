import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [matric, setMatric] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDepartment(profile.department || "");
      setLevel(profile.level || "");
      setMatric(profile.matric_number || "");
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({ full_name: fullName, department, level, matric_number: matric })
      .eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  }

  return (
    <Layout searchPlaceholder="Search settings...">
      <div>
        <h1 className="font-display text-3xl text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Account &gt; Settings</p>
      </div>

      <form onSubmit={handleSave} className="bg-paper-50 border border-paper-300 p-6 max-w-lg space-y-4">
        {saved && <p className="text-sm text-forest-800 bg-forest-800/10 px-3 py-2">Profile updated</p>}

        <div>
          <label className="text-sm font-medium text-ink-700">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm outline-none focus-visible:border-brass-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink-700">Matric number</label>
          <input
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
            className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm outline-none focus-visible:border-brass-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink-700">Department</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm outline-none focus-visible:border-brass-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink-700">Level</label>
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-2 text-sm outline-none focus-visible:border-brass-500"
            />
          </div>
        </div>

        <p className="text-xs text-ink-500">Email: {profile?.email}</p>

        <button
          type="submit"
          disabled={saving}
          className="bg-forest-800 hover:bg-forest-700 disabled:opacity-60 text-paper-50 px-5 py-2.5 text-sm font-medium"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </Layout>
  );
}
