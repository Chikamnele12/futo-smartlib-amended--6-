import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-100 via-paper-100 to-brand-100 font-sans p-6">
      <div className="w-full max-w-md bg-paper-50 rounded-2xl shadow-2xl p-8 page-enter">
        <div className="flex items-center gap-3 mb-6">
          <Logo className="w-9 h-9" />
          <p className="font-display font-bold text-lg text-ink-900">SmartLib</p>
        </div>

        {sent ? (
          <>
            <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Check your email</h2>
            <p className="text-ink-500 text-sm mb-6">
              We sent a password reset link to <span className="font-medium text-ink-700">{email}</span>. Open it to choose a new password.
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Reset your password</h2>
            <p className="text-ink-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>

            {error && (
              <div className="mb-4 text-sm text-rose-ink bg-rose-soft border border-rose-ink/20 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <label className="text-sm font-medium text-ink-700">Email</label>
            <div className="mt-1.5 mb-5 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
              <Mail size={16} className="text-ink-500" />
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading ? "Sending link..." : "Send reset link"} <ArrowRight size={16} />
            </button>
          </form>
        )}

        <Link to="/" className="flex items-center gap-1.5 justify-center text-sm text-ink-500 hover:text-brand-700 mt-6 transition-colors">
          <ArrowLeft size={14} /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
