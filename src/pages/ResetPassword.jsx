import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase puts the visitor into a temporary "recovery" session when they
  // land here from the emailed link — we just need to confirm one exists.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/dashboard"), 1500);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-100 via-paper-100 to-brand-100 font-sans p-6">
      <div className="w-full max-w-md bg-paper-50 rounded-2xl shadow-2xl p-8 page-enter">
          <div className="flex items-center gap-3 mb-6">
            <Logo className="w-9 h-9" />
            <p className="font-display font-bold text-lg text-ink-900">SmartLib</p>
          </div>

          {!ready && !done && (
            <p className="text-sm text-ink-500">
              Open this page using the reset link from your email — this link isn't valid on its own.
            </p>
          )}

          {ready && !done && (
            <form onSubmit={handleSubmit}>
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Choose a new password</h2>
              <p className="text-ink-500 text-sm mb-6">Make it something you haven't used before.</p>

              {error && (
                <div className="mb-4 text-sm text-rose-ink bg-rose-soft border border-rose-ink/20 px-3 py-2 rounded-md">
                  {error}
                </div>
              )}

              <label className="text-sm font-medium text-ink-700">New password</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
                <Lock size={16} className="text-ink-500" />
                <input
                  required
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Toggle password visibility">
                  {showPw ? <EyeOff size={16} className="text-ink-500" /> : <Eye size={16} className="text-ink-500" />}
                </button>
              </div>

              <label className="text-sm font-medium text-ink-700">Confirm password</label>
              <div className="mt-1.5 mb-5 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
                <Lock size={16} className="text-ink-500" />
                <input
                  required
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {loading ? "Saving..." : "Update password"} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {done && (
            <>
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Password updated</h2>
              <p className="text-ink-500 text-sm">Taking you to your dashboard...</p>
            </>
          )}
      </div>
    </div>
  );
}
