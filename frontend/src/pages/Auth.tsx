import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/context/ProfileContext";
import { Mail, Lock, ArrowRight, KeyRound } from "lucide-react";

type View = "sign-in" | "sign-up" | "reset";

const Auth = () => {
  const [view, setView] = useState<View>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const { fetchProfile } = useProfile();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (view === "sign-in") {
        await signIn(email, password);
        // Wait for profile to load from backend BEFORE navigating
        // so Dashboard doesn't see an empty profile and redirect to onboarding
       console.log("Signed in, fetching profile...");
        const profile = await fetchProfile();
        console.log("Profile fetched:", profile);
        if (profile && profile.name) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      } else if (view === "sign-up") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        await signUp(email, password);
        navigate("/onboarding");
      } else {
        await resetPassword(email);
        setSuccess("If an account exists with this email, a reset link has been sent.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const switchView = (v: View) => {
    setView(v);
    setError("");
    setSuccess("");
  };

  const title = view === "sign-in" ? "Welcome Back" : view === "sign-up" ? "Create Account" : "Reset Password";
  const subtitle = view === "sign-in"
    ? "Sign in to your career dashboard"
    : view === "sign-up"
    ? "Start your career journey"
    : "Enter your email to reset your password";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl p-8 md:p-10" style={{
          background: "hsl(220 20% 96%)",
          color: "hsl(220 20% 15%)",
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8 text-center">
                <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(var(--neon) / 0.15)" }}>
                  <KeyRound className="w-6 h-6" style={{ color: "hsl(var(--neon))" }} />
                </div>
                <h1 className="text-2xl font-display font-bold" style={{ color: "hsl(220 20% 10%)" }}>{title}</h1>
                <p className="text-sm mt-1 font-body" style={{ color: "hsl(220 10% 50%)" }}>{subtitle}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-display font-medium mb-1 block" style={{ color: "hsl(220 10% 40%)" }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(220 10% 60%)" }} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm font-body outline-none transition-all"
                      style={{
                        background: "hsl(220 20% 92%)",
                        border: "1px solid hsl(220 15% 85%)",
                        color: "hsl(220 20% 10%)",
                      }}
                    />
                  </div>
                </div>

                {view !== "reset" && (
                  <div>
                    <label className="text-xs font-display font-medium mb-1 block" style={{ color: "hsl(220 10% 40%)" }}>Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(220 10% 60%)" }} />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm font-body outline-none transition-all"
                        style={{
                          background: "hsl(220 20% 92%)",
                          border: "1px solid hsl(220 15% 85%)",
                          color: "hsl(220 20% 10%)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {view === "sign-up" && (
                  <div>
                    <label className="text-xs font-display font-medium mb-1 block" style={{ color: "hsl(220 10% 40%)" }}>Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(220 10% 60%)" }} />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm font-body outline-none transition-all"
                        style={{
                          background: "hsl(220 20% 92%)",
                          border: "1px solid hsl(220 15% 85%)",
                          color: "hsl(220 20% 10%)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-xs font-body px-3 py-2 rounded-lg" style={{ background: "hsl(0 80% 95%)", color: "hsl(0 70% 45%)" }}>
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-xs font-body px-3 py-2 rounded-lg" style={{ background: "hsl(145 60% 93%)", color: "hsl(145 60% 30%)" }}>
                    {success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg font-display font-medium text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{
                    background: "hsl(var(--neon))",
                    color: "hsl(220 20% 5%)",
                  }}
                >
                  {loading ? "Signing in..." : view === "reset" ? "Send Reset Link" : view === "sign-in" ? "Sign In" : "Create Account"}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>

              <div className="mt-6 text-center space-y-2">
                {view === "sign-in" && (
                  <>
                    <button onClick={() => switchView("reset")} className="text-xs font-body block mx-auto" style={{ color: "hsl(var(--neon))" }}>
                      Forgot Password?
                    </button>
                    <p className="text-xs font-body" style={{ color: "hsl(220 10% 50%)" }}>
                      Don't have an account?{" "}
                      <button onClick={() => switchView("sign-up")} className="font-medium" style={{ color: "hsl(var(--neon))" }}>
                        Sign Up
                      </button>
                    </p>
                  </>
                )}
                {view === "sign-up" && (
                  <p className="text-xs font-body" style={{ color: "hsl(220 10% 50%)" }}>
                    Already have an account?{" "}
                    <button onClick={() => switchView("sign-in")} className="font-medium" style={{ color: "hsl(var(--neon))" }}>
                      Sign In
                    </button>
                  </p>
                )}
                {view === "reset" && (
                  <button onClick={() => switchView("sign-in")} className="text-xs font-body" style={{ color: "hsl(var(--neon))" }}>
                    ← Back to Sign In
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;