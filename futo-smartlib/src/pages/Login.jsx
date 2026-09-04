import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex bg-paper-100 font-sans">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-forest-950 text-paper-50 flex-col justify-center px-16">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-brass-500 flex items-center justify-center text-forest-950 font-display text-xl">F</div>
          <p className="font-display text-2xl leading-tight">SmartLib</p>
        </div>
        <h1 className="font-display text-4xl leading-tight mb-4 max-w-md">
          The university library, catalogued for the way you actually study.
        </h1>
        <div className="w-14 h-1 bg-brass-500 mb-5" />
        <p className="text-paper-200/80 max-w-sm">
          Academic books, eBooks, past questions, and revision notes — one shelf, always open.
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <form onSubmit={handleSignIn} className="w-full max-w-md bg-paper-50 border border-paper-300 p-8">
          <h2 className="font-display text-2xl text-ink-900 mb-1">Welcome back</h2>
          <p className="text-ink-500 text-sm mb-6">Sign in to continue to your account</p>

          {error && (
            <div className="mb-4 text-sm text-clay-600 bg-clay-500/10 border border-clay-500/30 px-3 py-2">
              {error}
            </div>
          )}

          <label className="text-sm font-medium text-ink-700">Email</label>
          <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
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

          <label className="text-sm font-medium text-ink-700">Password</label>
          <div className="mt-1.5 mb-3 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
            <Lock size={16} className="text-ink-500" />
            <input
              required
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Toggle password visibility">
              {showPw ? <EyeOff size={16} className="text-ink-500" /> : <Eye size={16} className="text-ink-500" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest-800 hover:bg-forest-700 disabled:opacity-60 text-paper-50 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors mt-3"
          >
            {loading ? "Signing in..." : "Sign in"} <ArrowRight size={16} />
          </button>

          <p className="text-center text-sm text-ink-500 mt-5">
            New to SmartLib? <Link to="/signup" className="text-forest-800 font-medium">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
