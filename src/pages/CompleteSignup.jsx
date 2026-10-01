import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Landed here from the "sign-in link" email. supabase-js automatically
// picks up the session from the URL, so by the time this mounts the user
// should already be logged in — we just need to ask them to set a password.
export default function CompleteSignup() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // Give supabase-js a moment to parse the URL and set the session.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(!!data.session);
      setChecking(false);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setChecking(false);
      }
    });

    check();
    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  async function setAccountPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: pwError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (pwError) return setError(pwError.message);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-100 via-paper-100 to-brand-100 font-sans p-6">
      <div className="w-full max-w-md bg-paper-50 rounded-2xl shadow-2xl p-8 page-enter">
        {checking && <p className="text-sm text-ink-500 text-center">Verifying your link...</p>}

        {!checking && !hasSession && (
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-ink-900 mb-2">Link expired or invalid</h2>
            <p className="text-sm text-ink-500 mb-4">
              This sign-in link is no longer valid. Please request a new one.
            </p>
            <Link to="/signup" className="text-brand-700 font-medium text-sm hover:text-brand-600 transition-colors">Back to sign up</Link>
          </div>
        )}

        {!checking && hasSession && (
          <form onSubmit={setAccountPassword}>
            {error && (
              <div className="mb-4 text-sm text-rose-ink bg-rose-soft border border-rose-ink/20 px-3 py-2 rounded-md">
                {error}
              </div>
            )}
            <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Set a password</h2>
            <p className="text-ink-500 text-sm mb-6">You're verified — choose a password for future logins</p>

            <label className="text-sm font-medium text-ink-700">Password</label>
            <div className="mt-1.5 mb-3 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
              <Lock size={16} className="text-ink-500" />
              <input required minLength={6} type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
                className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 mt-3">
              {loading ? "Saving..." : "Finish sign up"} <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
