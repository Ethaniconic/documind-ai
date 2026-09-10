import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "../services/api";
import { 
  Sparkles, 
  ArrowRight, 
  Lock, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldCheck 
} from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const navigate = useNavigate();

  // Validation formulas
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isLengthValid = password.length >= 6;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);

  // Calculate password strength (0 to 3)
  const strengthScore = [isLengthValid, hasNumberOrSymbol, hasUpperCase].filter(Boolean).length;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function signup(e) {
    if (e) e.preventDefault();
    setTouched({ email: true, password: true, confirm: true });

    if (!isEmailValid) {
      setError("Please provide a valid email address.");
      return;
    }

    if (!isLengthValid) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (confirmPassword && !passwordsMatch) {
      setError("Passwords do not match.");
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

  const getStrengthLabel = () => {
    if (!password) return "";
    if (strengthScore === 1) return "Weak";
    if (strengthScore === 2) return "Medium";
    if (strengthScore === 3) return "Strong";
    return "Too short";
  };

  const getStrengthColor = () => {
    if (strengthScore === 1) return "bg-rose-500";
    if (strengthScore === 2) return "bg-amber-500";
    if (strengthScore === 3) return "bg-emerald-500";
    return "bg-slate-700";
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 relative overflow-hidden text-foreground font-sans select-none">
      {/* Radial ambient glow */}
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
          Create your account
        </h1>
        <p className="text-sm text-muted mb-6 text-center">
          Get started with DocuMind AI in seconds.
        </p>

        {/* Feedback Alerts */}
        {error && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="w-full mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={signup} className="w-full space-y-3.5">
          {/* Email */}
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
              {isEmailValid && (
                <CheckCircle2 className="absolute right-3.5 top-3.5 w-4 h-4 text-emerald-400" />
              )}
            </div>
            {touched.email && !isEmailValid && email.length > 0 && (
              <p className="mt-1 text-[11px] text-rose-400 pl-1">
                Please enter a valid email address
              </p>
            )}
          </div>

          {/* Password */}
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
                placeholder="Create password (min 6 characters)"
                required
                className={`w-full bg-surface border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder-slate-500 outline-none transition-all ${
                  touched.password && !isLengthValid && password.length > 0
                    ? "border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : isLengthValid
                    ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    : "border-subtle focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-muted hover:text-foreground transition cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Indicator Bar */}
            {password.length > 0 && (
              <div className="mt-2 px-1">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-muted flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    Security
                  </span>
                  <span className={`font-medium ${
                    strengthScore === 3 ? "text-emerald-400" : strengthScore === 2 ? "text-amber-400" : "text-rose-400"
                  }`}>
                    {getStrengthLabel()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                  <div className={`rounded-full transition-all duration-200 ${strengthScore >= 1 ? getStrengthColor() : "bg-surface-hover"}`} />
                  <div className={`rounded-full transition-all duration-200 ${strengthScore >= 2 ? getStrengthColor() : "bg-surface-hover"}`} />
                  <div className={`rounded-full transition-all duration-200 ${strengthScore >= 3 ? getStrengthColor() : "bg-surface-hover"}`} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onBlur={() => setTouched((prev) => ({ ...prev, confirm: true }))}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Confirm password"
                required
                className={`w-full bg-surface border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder-slate-500 outline-none transition-all ${
                  touched.confirm && confirmPassword.length > 0 && !passwordsMatch
                    ? "border-rose-500/70 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : passwordsMatch
                    ? "border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    : "border-subtle focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                }`}
              />
              {passwordsMatch && (
                <CheckCircle2 className="absolute right-3.5 top-3.5 w-4 h-4 text-emerald-400" />
              )}
            </div>
            {touched.confirm && confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-1 text-[11px] text-rose-400 pl-1">
                Passwords do not match
              </p>
            )}
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
        <p className="mt-8 text-xs text-muted text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
