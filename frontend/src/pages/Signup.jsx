import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "../services/api";
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2 } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  async function signup(e) {
    if (e) e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password should be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await signupUser(email, password);
      if (res.status === "success") {
        setSuccessMsg("Account created! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#080d1a] flex items-center justify-center p-4 relative overflow-hidden text-slate-100 font-sans select-none">
      {/* Radial ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-[400px] z-10 flex flex-col items-center">
        {/* Glow Logo Badge */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur-sm opacity-60 animate-pulse" />
          <div className="relative w-14 h-14 bg-[#131929] border border-purple-500/30 rounded-2xl flex items-center justify-center shadow-inner">
            <Sparkles className="w-7 h-7 text-purple-400" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
          Create your account
        </h1>
        <p className="text-sm text-slate-400 mb-7 text-center">
          Get started with DocuMind AI in seconds.
        </p>

        {/* Feedback Alerts */}
        {error && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={signup} className="w-full space-y-3.5">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full bg-[#101626] border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-10 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password (min 6 chars)"
              required
              className="w-full bg-[#101626] border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-10 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Sign Up Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Creating account..." : "Continue with email"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-8 text-xs text-slate-400 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
