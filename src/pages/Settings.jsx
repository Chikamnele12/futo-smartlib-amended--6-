import React, { useEffect, useRef, useState } from "react";
import { Lock, LogOut, Info, Camera, Trash2 } from "lucide-react";
import Layout from "../components/Layout";
import ReadingStats from "../components/ReadingStats";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabaseClient";
import Avatar from "../components/Avatar";

const TABS = ["Account Settings", "Security"];

export default function Settings() {
  const { profile, refreshProfile, signOut } = useAuth();
  const [tab, setTab] = useState("Account Settings");

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [matric, setMatric] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState(null);

  const fileRef = useRef(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);

  async function shrinkImage(file, max = 400) {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  }

  async function handleAvatarPick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarMsg(null);
    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ type: "error", text: "Please choose an image file." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setAvatarMsg({ type: "error", text: "Image is too large. Choose one under 8 MB." });
      return;
    }
    setAvatarBusy(true);
    try {
      const blob = await shrinkImage(file);
      const path = `${profile.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
      setAvatarMsg({ type: "success", text: "Profile photo updated." });
    } catch (err) {
      setAvatarMsg({ type: "error", text: err.message || "Upload failed. Try again." });
    }
    setAvatarBusy(false);
  }

  async function handleAvatarRemove() {
    setAvatarBusy(true);
    setAvatarMsg(null);
    await supabase.storage.from("avatars").remove([`${profile.id}/avatar.jpg`]);
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    await refreshProfile();
    setAvatarBusy(false);
  }

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDepartment(profile.department || "");
      setLevel(profile.level || "");
      setMatric(profile.matric_number || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase
      .from("profiles")
      .update({ full_name: fullName, department, level, matric_number: matric, phone })
      .eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault();
    setPwSaving(true);
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "Password must be at least 6 characters." });
      setPwSaving(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) setPwMessage({ type: "error", text: error.message });
    else { setPwMessage({ type: "success", text: "Password updated." }); setNewPassword(""); }
  }

  const inputClass = "mt-1.5 w-full border border-paper-300 bg-paper-50 rounded-lg px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500";

  return (
    <Layout searchPlaceholder="Search settings...">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500">Account &gt; Settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-2 border-b border-paper-300">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t ? "border-brand-700 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-900"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "Account Settings" && (
            <form onSubmit={handleSave} className="card p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Avatar profile={profile} size={72} />
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={avatarBusy}
                      onClick={() => fileRef.current?.click()}
                      className="btn-primary disabled:opacity-60 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      <Camera size={15} /> {avatarBusy ? "Working..." : profile?.avatar_url ? "Change photo" : "Add photo"}
                    </button>
                    {profile?.avatar_url && (
                      <button
                        type="button"
                        disabled={avatarBusy}
                        onClick={handleAvatarRemove}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-rose-ink hover:bg-rose-soft transition-colors"
                      >
                        <Trash2 size={15} /> Remove
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
                  <p className="text-xs text-ink-500">JPG or PNG. It is resized automatically.</p>
                </div>
              </div>
              {avatarMsg && (
                <p className={`text-sm rounded-md px-3 py-2 ${avatarMsg.type === "error" ? "text-rose-ink bg-rose-soft" : "text-green-ink bg-green-soft"}`}>
                  {avatarMsg.text}
                </p>
              )}

              {saved && <p className="text-sm text-green-ink bg-green-soft rounded-md px-3 py-2">Profile updated</p>}

              <div>
                <label className="text-sm font-medium text-ink-700">Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="text-sm font-medium text-ink-700">Matric number</label>
                <input value={matric} onChange={(e) => setMatric(e.target.value)} className={inputClass} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink-700">Department</label>
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink-700">Level</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass}>
                    <option value="">Select level</option>
                    {["100", "200", "300", "400", "500"].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-ink-700">Phone number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className={inputClass} />
              </div>

              <p className="text-xs text-ink-500">Email: {profile?.email}</p>

              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60 px-5 py-2.5 rounded-lg text-sm font-medium">
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          )}

          {tab === "Security" && (
            <form onSubmit={handlePasswordUpdate} className="card p-6 space-y-4 max-w-md">
              <div className="flex items-center gap-2 text-ink-900 font-semibold text-sm mb-1">
                <Lock size={16} className="text-brand-700" /> Change Password
              </div>
              {pwMessage && (
                <p className={`text-sm rounded-md px-3 py-2 ${pwMessage.type === "error" ? "text-rose-ink bg-rose-soft" : "text-green-ink bg-green-soft"}`}>
                  {pwMessage.text}
                </p>
              )}
              <div>
                <label className="text-sm font-medium text-ink-700">New password</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} placeholder="At least 6 characters" />
              </div>
              <button type="submit" disabled={pwSaving} className="btn-primary disabled:opacity-60 px-5 py-2.5 rounded-lg text-sm font-medium">
                {pwSaving ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          <ReadingStats />

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-ink-500" />
              <h2 className="font-display text-sm font-semibold text-ink-900">System Information</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">Role</dt><dd className="text-ink-900 font-medium capitalize">{profile?.role}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Account Created</dt><dd className="text-ink-900 font-medium">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-500">Status</dt><dd><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-soft text-green-ink">Active</span></dd></div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-sm font-semibold text-ink-900 mb-3">Quick Settings</h2>
            <button onClick={signOut} className="w-full flex items-center justify-between text-sm text-rose-ink hover:bg-rose-soft rounded-md px-2 py-2 transition-colors">
              <span className="flex items-center gap-2"><LogOut size={15} /> Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
