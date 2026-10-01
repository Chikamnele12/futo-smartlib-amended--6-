import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, User, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";

const ROLES = [
  { key: "student", label: "Student", icon: GraduationCap },
  { key: "librarian", label: "Librarian", icon: User },
  { key: "admin", label: "Admin", icon: ShieldCheck },
];

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-100 via-paper-100 to-brand-100 font-sans p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl">
        {/* Left panel */}
        <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white px-14 py-16 relative overflow-hidden">
          <div className="mb-8">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-tight mb-3">
            Digital Academic<br /><span className="text-brand-100">Library Management</span><br />System
          </h1>
          <p className="text-white/75 max-w-sm">
            Your one-stop platform for accessing academic resources and research materials.
          </p>
        </div>

        {/* Right panel: form */}
        <div className="bg-paper-50 px-8 py-12 sm:px-12 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Logo className="w-9 h-9" />
            <p className="font-display font-bold text-ink-900">SmartLib</p>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Welcome Back! 👋</h2>
          <p className="text-ink-500 text-sm mb-6">Sign in to continue to your account</p>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {ROLES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key)}
                className={`pill-tab flex flex-col items-center gap-1 py-2.5 rounded-lg text-xs font-medium border ${
                  role === key ? "active border-brand-700" : "border-paper-300 text-ink-700 bg-paper-50"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSignIn}>
            {error && (
              <div className="mb-4 text-sm text-rose-ink bg-rose-soft border border-rose-ink/20 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <label className="text-sm font-medium text-ink-700">Email</label>
            <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
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

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-ink-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-brand-700 hover:text-brand-600 transition-colors font-medium">
                Forgot Password?
              </Link>
            </div>
            <div className="mt-1.5 mb-5 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
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
              className="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              {loading ? "Signing in..." : "Sign In"} <ArrowRight size={16} />
            </button>

            <p className="text-center text-sm text-ink-500 mt-5">
              Don't have an account? <Link to="/signup" className="text-brand-700 font-medium hover:text-brand-600 transition-colors">Register here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
