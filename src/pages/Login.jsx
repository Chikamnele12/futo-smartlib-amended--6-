import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, User, ShieldCheck, BookOpen, Clock } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import "../lib/theme";

const ROLES = [
  { key: "student", label: "Student", icon: GraduationCap },
  { key: "librarian", label: "Librarian", icon: User },
  { key: "admin", label: "Admin", icon: ShieldCheck },
];

const fieldBox = "flex items-center gap-2 border border-paper-300 bg-paper-50 rounded-xl px-3 py-2.5 transition-all focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15";
const inputCls = "w-full min-w-0 bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500";

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
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-100 via-paper-100 to-brand-100 font-sans p-3 sm:p-6 overflow-hidden">
      <div className="blob pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="blob pointer-events-none absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-brand-600/20 blur-3xl" style={{ animationDelay: "3s" }} />

      <ThemeToggle className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 bg-paper-50/80 backdrop-blur" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-paper-300/60 fade-up">
        {/* Left panel */}
        <div className="relative hidden lg:flex flex-col justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white px-14 py-16 overflow-hidden">
          <div className="blob pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="blob pointer-events-none absolute bottom-0 -left-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" style={{ animationDelay: "2s" }} />
          <div className="relative">
            <div className="mb-8"><Logo className="w-16 h-16" /></div>
            <h1 className="font-display text-3xl font-extrabold leading-tight mb-3">
              Digital Academic<br /><span className="text-violet-200">Library Management</span><br />System
            </h1>
            <p className="text-white/75 max-w-sm mb-8">
              Your one-stop platform for accessing academic resources and research materials.
            </p>
            <ul className="space-y-3 text-sm text-white/85">
              <li className="flex items-center gap-3"><BookOpen size={17} className="text-violet-200" /> Books, eBooks, notes and past questions</li>
              <li className="flex items-center gap-3"><Clock size={17} className="text-violet-200" /> Borrow and track returns online</li>
            </ul>
          </div>
        </div>

        {/* Right panel: form */}
        <div className="bg-paper-50 px-5 py-8 sm:px-12 sm:py-12 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-6 fade-up">
            <Logo className="w-10 h-10" />
            <div className="leading-tight">
              <p className="font-display font-bold text-ink-900">FUTO SmartLib</p>
              <p className="text-[11px] text-ink-500">Digital Academic Library</p>
            </div>
          </div>

          <div className="fade-up">
            <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Welcome Back! 👋</h2>
            <p className="text-ink-500 text-sm mb-6">Sign in to continue to your account</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6 fade-up" style={{ "--d": "60ms" }}>
            {ROLES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRole(key)}
                className={`pill-tab flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-medium border active:scale-95 ${
                  role === key ? "active border-brand-700" : "border-paper-300 text-ink-700 bg-paper-50"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="text-sm text-rose-ink bg-rose-soft border border-rose-ink/20 px-3 py-2 rounded-lg fade-up">
                {error}
              </div>
            )}

            <label className="block fade-up" style={{ "--d": "110ms" }}>
              <span className="text-sm font-medium text-ink-700">Email</span>
              <div className={`mt-1.5 ${fieldBox}`}>
                <Mail size={16} className="text-ink-500 shrink-0" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className={inputCls}
                />
              </div>
            </label>

            <div className="fade-up" style={{ "--d": "160ms" }}>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-ink-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-brand-700 hover:text-brand-600 transition-colors font-medium">
                  Forgot Password?
                </Link>
              </div>
              <div className={`mt-1.5 ${fieldBox}`}>
                <Lock size={16} className="text-ink-500 shrink-0" />
                <input
                  id="login-password"
                  required
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={inputCls}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label="Toggle password visibility" className="shrink-0">
                  {showPw ? <EyeOff size={16} className="text-ink-500" /> : <Eye size={16} className="text-ink-500" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ "--d": "210ms" }}
              className="fade-up btn-primary w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign In"} <ArrowRight size={16} />
            </button>

            <p className="text-center text-sm text-ink-500 pt-1 fade-up" style={{ "--d": "260ms" }}>
              Don't have an account? <Link to="/signup" className="text-brand-700 font-medium hover:text-brand-600 transition-colors">Register here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
