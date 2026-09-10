import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login: setAuthSession } = useAuth();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length > 0;

  async function login(e) {
    if (e) e.preventDefault();
    setTouched({ email: true, password: true });

    if (!isEmailValid || !isPasswordValid) {
      setError("Please check your email and password format.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await loginUser(email, password);
      if (res.status === "success") {
        setAuthSession(res.user || { email }, res.access_token);
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid login credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 relative overflow-hidden text-foreground font-sans select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-[400px] z-10 flex flex-col items-center">
        {/* Glow Logo Badge */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur-sm opacity-60 animate-pulse" />
          <div className="relative w-14 h-14 bg-surface border border-purple-500/30 rounded-2xl flex items-center justify-center shadow-inner">
            <Sparkles className="w-7 h-7 text-purple-400" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
          Log in to your account
        </h1>
        <p className="text-sm text-muted mb-7 text-center">
          Welcome back! Please enter your details.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={login} className="w-full space-y-4">
          {/* Email Field */}
          <div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
              <input
                type="email"
                value={email}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your email"
                required
                className={`w-full bg-surface border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder-slate-500 outline-none transition-all ${
                  touched.email && !isEmailValid && email.length > 0
                    ? "border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : isEmailValid
                    ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    : "border-subtle focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                }`}
              />
              {/* Validation Icon on the right */}
              {isEmailValid && (
                <CheckCircle2 className="absolute right-3.5 top-3.5 w-4 h-4 text-emerald-400" />
              )}
            </div>
            {touched.email && !isEmailValid && email.length > 0 && (
              <p className="mt-1 text-[11px] text-rose-400 pl-1">
                Please enter a valid email address (e.g. name@example.com)
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your password"
                required
                className={`w-full bg-surface border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder-slate-500 outline-none transition-all ${
                  touched.password && !isPasswordValid
                    ? "border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-subtle focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                }`}
              />
              {/* Password visibility toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-muted hover:text-foreground transition cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {touched.password && !isPasswordValid && (
              <p className="mt-1 text-[11px] text-rose-400 pl-1">
                Password is required
              </p>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Logging in..." : "Continue with email"}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Footer link */}
        <p className="mt-8 text-xs text-muted text-center">
          Don't have an account?{" "}
          <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
