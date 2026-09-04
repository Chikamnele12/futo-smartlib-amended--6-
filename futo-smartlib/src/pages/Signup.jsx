import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Hash, Building2, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// Signup flow: details -> email OTP sent -> code verified -> password set.
// Role is never taken from the client: the DB trigger looks the email up
// in staff_invites (created by an admin) and grants "librarian" if found,
// otherwise everyone signs up as "student".
export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState("details"); // details -> otp -> password
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [matric, setMatric] = useState("");
  const [department, setDepartment] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: { full_name: fullName, matric_number: matric, department },
      },
    });
    setLoading(false);
    if (otpError) return setError(otpError.message);
    setStep("otp");
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (verifyError) return setError(verifyError.message);
    setStep("password");
  }

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
    <div className="min-h-screen w-full flex bg-paper-100 font-sans">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-forest-950 text-paper-50 flex-col justify-center px-16">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-brass-500 flex items-center justify-center text-forest-950 font-display text-xl">F</div>
          <p className="font-display text-2xl leading-tight">SmartLib</p>
        </div>
        <h1 className="font-display text-4xl leading-tight mb-4 max-w-md">
          Get your own library card. It takes a minute.
        </h1>
        <div className="w-14 h-1 bg-brass-500 mb-5" />
        <p className="text-paper-200/80 max-w-sm">
          Sign up as a student with a one-time code sent to your email. Librarian accounts are opened
          by an admin invite and use this same code sign-up.
        </p>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-paper-50 border border-paper-300 p-8">
          {error && (
            <div className="mb-4 text-sm text-clay-600 bg-clay-500/10 border border-clay-500/30 px-3 py-2">
              {error}
            </div>
          )}

          {step === "details" && (
            <form onSubmit={sendOtp}>
              <h2 className="font-display text-2xl text-ink-900 mb-1">Create your account</h2>
              <p className="text-ink-500 text-sm mb-6">We'll email you a one-time code to verify it's you</p>

              <label className="text-sm font-medium text-ink-700">Full name</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
                <User size={16} className="text-ink-500" />
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <label className="text-sm font-medium text-ink-700">Email</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
                <Mail size={16} className="text-ink-500" />
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <label className="text-sm font-medium text-ink-700">Matric number</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
                <Hash size={16} className="text-ink-500" />
                <input required value={matric} onChange={(e) => setMatric(e.target.value)}
                  placeholder="e.g. 20211234567"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <label className="text-sm font-medium text-ink-700">Department</label>
              <div className="mt-1.5 mb-3 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
                <Building2 size={16} className="text-ink-500" />
                <input required value={department} onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-forest-800 hover:bg-forest-700 disabled:opacity-60 text-paper-50 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors mt-3">
                {loading ? "Sending code..." : "Send verification code"} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp}>
              <h2 className="font-display text-2xl text-ink-900 mb-1">Check your email</h2>
              <p className="text-ink-500 text-sm mb-6">Enter the 6-digit code we sent to {email}</p>

              <label className="text-sm font-medium text-ink-700">Verification code</label>
              <div className="mt-1.5 mb-4 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
                <ShieldCheck size={16} className="text-ink-500" />
                <input required value={otp} onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456" maxLength={6}
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500 tracking-widest" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-forest-800 hover:bg-forest-700 disabled:opacity-60 text-paper-50 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors mt-3">
                {loading ? "Verifying..." : "Verify code"} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={setAccountPassword}>
              <h2 className="font-display text-2xl text-ink-900 mb-1">Set a password</h2>
              <p className="text-ink-500 text-sm mb-6">You're verified — choose a password for future logins</p>

              <label className="text-sm font-medium text-ink-700">Password</label>
              <div className="mt-1.5 mb-3 flex items-center gap-2 border border-paper-300 px-3 py-2.5">
                <Lock size={16} className="text-ink-500" />
                <input required minLength={6} type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
                  className="w-full bg-transparent outline-none text-sm text-ink-900 placeholder-ink-500" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-forest-800 hover:bg-forest-700 disabled:opacity-60 text-paper-50 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors mt-3">
                {loading ? "Saving..." : "Finish sign up"} <ArrowRight size={16} />
              </button>
            </form>
          )}

          <p className="text-center text-sm text-ink-500 mt-5">
            Already have an account? <Link to="/" className="text-forest-800 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
