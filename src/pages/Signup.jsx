import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, User, ArrowRight, Hash, Building2, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Logo from "../components/Logo";

// Signup flow: fill details -> we email a sign-in link -> clicking it lands
// on /complete-signup where the session is already active and they set a
// password. Role is never taken from the client: the DB trigger looks the
// email up in staff_invites (created by an admin) and grants "librarian"
// if found, otherwise everyone signs up as "student".
export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [matric, setMatric] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendLink(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName, matric_number: matric, department },
        emailRedirectTo: `${window.location.origin}/complete-signup`,
      },
    });
    setLoading(false);
    if (otpError) return setError(otpError.message);
    setSent(true);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-brand-100 via-paper-100 to-brand-100 font-sans p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl">
        <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white px-14 py-16">
          <div className="mb-8">
            <Logo className="w-16 h-16" />
          </div>
          <h1 className="font-display text-3xl font-extrabold leading-tight mb-3">
            Get your own<br /><span className="text-brand-100">library card.</span><br />It takes a minute.
          </h1>
          <p className="text-white/75 max-w-sm">
            Sign up as a student with a secure link sent to your email. Librarian accounts are opened
            by an admin invite and use this same sign-up.
          </p>
        </div>

        <div className="bg-paper-50 px-8 py-12 sm:px-12 flex flex-col justify-center">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <Logo className="w-9 h-9" />
            <p className="font-display font-bold text-ink-900">SmartLib</p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-rose-ink bg-rose-soft border border-rose-ink/20 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {!sent ? (
            <form onSubmit={sendLink}>
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Create your account</h2>
              <p className="text-ink-500 text-sm mb-6">We'll email you a link to verify it's you</p>

              <label className="text-sm font-medium text-ink-700">Full name</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
                <User size={16} className="text-ink-500" />
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <label className="text-sm font-medium text-ink-700">Email</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
                <Mail size={16} className="text-ink-500" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <label className="text-sm font-medium text-ink-700">Matric number</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
                <Hash size={16} className="text-ink-500" />
                <input required value={matric} onChange={(e) => setMatric(e.target.value)}
                  placeholder="e.g. 20211234567"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <label className="text-sm font-medium text-ink-700">Department</label>
              <div className="mt-1.5 mb-3 flex items-center gap-2 border border-paper-300 rounded-lg px-3 py-2.5 transition-colors focus-within:border-brand-500">
                <Building2 size={16} className="text-ink-500" />
                <input required value={department} onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 mt-3">
                {loading ? "Sending link..." : "Send sign-in link"} <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 size={40} className="text-brand-700 mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-2">Check your email</h2>
              <p className="text-ink-500 text-sm">
                We sent a sign-in link to <span className="font-medium text-ink-900">{email}</span>.
                Open it on this device to finish creating your account.
              </p>
            </div>
          )}

          <p className="text-center text-sm text-ink-500 mt-5">
            Already have an account? <Link to="/" className="text-brand-700 font-medium hover:text-brand-600 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
