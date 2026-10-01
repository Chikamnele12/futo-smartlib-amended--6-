import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail, User, ArrowRight, Hash, Building2, CheckCircle2, GraduationCap, Phone,
  BookOpen, Clock, ShieldCheck,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";
import ThemeToggle from "../components/ThemeToggle";
import "../lib/theme";

// Signup flow: fill details -> we email a sign-in link -> clicking it lands
// on /complete-signup where the session is already active and they set a
// password. Role is never taken from the client: the DB trigger looks the
// email up in staff_invites (created by an admin) and grants "librarian"
// if found, otherwise everyone signs up as "student".

const inputCls = "w-full min-w-0 bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500";

function Field({ label, icon: Icon, delay = 0, children }) {
  return (
    <label className="block fade-up" style={{ "--d": `${delay}ms` }}>
      <span className="text-sm font-medium text-ink-700">{label}</span>
      <div className="mt-1.5 flex items-center gap-2 border border-paper-300 bg-paper-50 rounded-xl px-3 py-2.5 transition-all focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
        <Icon size={16} className="text-ink-500 shrink-0" />
        {children}
      </div>
    </label>
  );
}

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [matric, setMatric] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendLink(e) {
    e.preventDefault();
    setError("");
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!/^(\+?234|0)[789]\d{9}$/.test(cleanPhone)) {
      return setError("Enter a valid Nigerian phone number, e.g. 08012345678.");
    }
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName, matric_number: matric, department, level, phone: cleanPhone },
        emailRedirectTo: `${window.location.origin}/complete-signup`,
      },
    });
    setLoading(false);
    if (otpError) return setError(otpError.message);
    setSent(true);
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-100 via-paper-100 to-brand-100 font-sans p-3 sm:p-6 overflow-hidden">
      {/* soft background shapes */}
      <div className="blob pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="blob pointer-events-none absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-brand-600/20 blur-3xl" style={{ animationDelay: "3s" }} />

      <ThemeToggle className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10 bg-paper-50/80 backdrop-blur" />

      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-paper-300/60 fade-up">
        {/* brand panel (desktop) */}
        <div className="relative hidden lg:flex flex-col justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white px-14 py-16 overflow-hidden">
          <div className="blob pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
          <div className="blob pointer-events-none absolute bottom-0 -left-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" style={{ animationDelay: "2s" }} />

          <div className="relative">
            <div className="mb-8"><Logo className="w-16 h-16" /></div>
            <h1 className="font-display text-3xl font-extrabold leading-tight mb-3">
              Get your own<br /><span className="text-violet-200">library card.</span><br />It takes a minute.
            </h1>
            <p className="text-white/75 max-w-sm mb-8">
              Sign up as a student with a secure link sent to your email. Librarian accounts are opened
              by an admin invite and use this same sign-up.
            </p>
            <ul className="space-y-3 text-sm text-white/85">
              <li className="flex items-center gap-3"><BookOpen size={17} className="text-violet-200" /> Borrow academic books and get a reference</li>
              <li className="flex items-center gap-3"><Clock size={17} className="text-violet-200" /> Due-date reminders by email</li>
              <li className="flex items-center gap-3"><ShieldCheck size={17} className="text-violet-200" /> No password to remember until you set one</li>
            </ul>
          </div>
        </div>

        {/* form */}
        <div className="bg-paper-50 px-5 py-8 sm:px-12 sm:py-12 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-6 fade-up">
            <Logo className="w-10 h-10" />
            <div className="leading-tight">
              <p className="font-display font-bold text-ink-900">FUTO SmartLib</p>
              <p className="text-[11px] text-ink-500">Digital Academic Library</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-rose-ink bg-rose-soft border border-rose-ink/20 px-3 py-2 rounded-lg fade-up">
              {error}
            </div>
          )}

          {!sent ? (
            <form onSubmit={sendLink} className="space-y-4">
              <div className="fade-up">
                <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Create your account</h2>
                <p className="text-ink-500 text-sm">We'll email you a link to verify it's you</p>
              </div>

              <Field label="Full name" icon={User} delay={60}>
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name" autoComplete="name" className={inputCls} />
              </Field>

              <Field label="Email" icon={Mail} delay={110}>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" autoComplete="email" className={inputCls} />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Matric number" icon={Hash} delay={160}>
                  <input required value={matric} onChange={(e) => setMatric(e.target.value)}
                    placeholder="e.g. 20211234567" inputMode="numeric" className={inputCls} />
                </Field>
                <Field label="Level" icon={GraduationCap} delay={210}>
                  <select required value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
                    <option value="">Select your level</option>
                    {["100", "200", "300", "400", "500"].map((l) => <option key={l} value={l}>{l} Level</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Department" icon={Building2} delay={260}>
                <input required value={department} onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science" className={inputCls} />
              </Field>

              <Field label="Phone number" icon={Phone} delay={310}>
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678" autoComplete="tel" className={inputCls} />
              </Field>

              <button type="submit" disabled={loading}
                style={{ "--d": "360ms" }}
                className="fade-up btn-primary w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 mt-2 disabled:opacity-70">
                {loading ? "Sending link..." : "Send sign-in link"} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="pop-in mx-auto mb-4 w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
                <CheckCircle2 size={34} className="text-brand-700" />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-2 fade-up">Check your email</h2>
              <p className="text-ink-500 text-sm fade-up" style={{ "--d": "80ms" }}>
                We sent a sign-in link to <span className="font-medium text-ink-900 break-all">{email}</span>.
                Open it on this device to finish creating your account.
              </p>
            </div>
          )}

          <p className="text-center text-sm text-ink-500 mt-6 fade-up" style={{ "--d": "400ms" }}>
            Already have an account? <Link to="/" className="text-brand-700 font-medium hover:text-brand-600 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
