"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/api";

/* ─────────────────────────────────────────────────────────────
   Premium USP Floating Bento Animation
   Shows Mozopost USPs (AI NDR, Early COD, 15+ Couriers)
   using Glassmorphism and smooth floating animations
───────────────────────────────────────────────────────────── */

function USPAnimation() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-[#F8FAFC] flex items-center justify-center">
      {/* ── Soft Mesh Gradient Background ── */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-200 opacity-40 blur-[100px] mix-blend-multiply animate-blob" />
      <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-200 opacity-40 blur-[100px] mix-blend-multiply animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-200 opacity-40 blur-[100px] mix-blend-multiply animate-blob animation-delay-4000" />

      <div className="relative w-full max-w-[600px] aspect-square">
        {/* ── Center Piece: AI NDR Resolution ── */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30
             w-[280px] bg-white/70 backdrop-blur-xl border border-white/80 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.15)] 
             rounded-2xl p-5"
          style={{ animation: "float 6s ease-in-out infinite" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-4 0V4a2 2 0 0 1 2-2z"></path>
                <path d="M20 10v2a8 8 0 0 1-16 0v-2"></path>
                <line x1="12" y1="20" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">
                AI NDR Resolution
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-white/50 p-2 rounded-lg border border-white">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />{" "}
              Calling buyer to confirm delivery...
            </div>
            <div className="flex justify-between items-center px-1">
              <div className="text-[10px] text-gray-500 font-semibold">
                RTO Reduced By
              </div>
              <div className="text-sm font-black text-indigo-600">42%</div>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[78%] rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* ── Top Right: Early COD ── */}
        <div
          className="absolute top-[12%] right-[5%] z-20
             w-[220px] bg-white/60 backdrop-blur-lg border border-white/60 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)] 
             rounded-2xl p-4"
          style={{
            animation: "float 5s ease-in-out infinite",
            animationDelay: "1.5s",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              Early COD
            </div>
          </div>
          <div className="text-xs font-semibold text-gray-500 mb-0.5">
            Wallet Balance
          </div>
          <div className="text-lg font-black text-gray-900 font-mono">
            ₹1,24,500
          </div>
        </div>

        {/* ── Bottom Left: 15+ Couriers ── */}
        <div
          className="absolute bottom-[15%] left-[8%] z-40
             w-[240px] bg-white/80 backdrop-blur-xl border border-white/80 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] 
             rounded-2xl p-4"
          style={{
            animation: "float 7s ease-in-out infinite",
            animationDelay: "2.5s",
          }}
        >
          <div className="text-[11px] font-bold text-gray-800 uppercase tracking-widest mb-3">
            15+ Courier Partners
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                >
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-gray-500 font-semibold text-center bg-gray-50 py-1.5 rounded-lg border border-gray-100">
            Smart courier allocation & routing
          </div>
        </div>

        {/* ── Top Left: WhatsApp Alerts ── */}
        <div
          className="absolute top-[25%] left-[5%] z-10
             bg-white/60 backdrop-blur-lg border border-white/60 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.05)] 
             rounded-full px-4 py-2.5 flex items-center gap-3"
          style={{
            animation: "float 6s ease-in-out infinite",
            animationDelay: "0.5s",
          }}
        >
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-gray-800">
            Branded Tracking & Alerts
          </span>
        </div>

        {/* ── Connecting animated dashes (Optional) ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <path
            d="M 300 250 C 400 150, 450 150, 500 100"
            fill="none"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.3"
            className="animate-dash"
          />
          <path
            d="M 300 350 C 200 450, 200 500, 150 550"
            fill="none"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            opacity="0.3"
            className="animate-dash-reverse"
          />
        </svg>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(-50%); }
          50% { transform: translateY(-15px) translateX(-50%); }
        }
        @keyframes floatNoTranslate {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
        @keyframes dash-reverse {
          to { stroke-dashoffset: 20; }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animate-dash { animation: dash 1s linear infinite; }
        .animate-dash-reverse { animation: dash-reverse 1s linear infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        .absolute.top-\\[12\\%\\].right-\\[5\\%\\] { transform: translateX(0); animation: floatNoTranslate 5s ease-in-out infinite; }
        .absolute.bottom-\\[15\\%\\].left-\\[8\\%\\] { transform: translateX(0); animation: floatNoTranslate 7s ease-in-out infinite; }
        .absolute.top-\\[25\\%\\].left-\\[5\\%\\] { transform: translateX(0); animation: floatNoTranslate 6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Eye icon for password toggle
───────────────────────────────────────────────────────────── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Login Page
───────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("seller@demo.com");
  const [password, setPassword] = useState("Demo@1234");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "seller") router.push("/dashboard");
      else if (user.role === "super_admin")
        router.push("/dashboard/superadmin");
      else router.push("/dashboard/admin");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── LEFT — Login form ────────────────────────────── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-8 py-10 relative z-10 border-r border-gray-100 shadow-[10px_0_40px_rgba(0,0,0,0.02)] bg-white">
        <div className="w-full max-w-[380px]">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shadow-md"
              style={{
                background: "linear-gradient(135deg,#7C3AED 0%,#4F46E5 100%)",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <div className="font-bold text-gray-900 text-xl tracking-tight">
              Mozopost
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Login</h1>
            <p className="text-sm text-gray-500">
              We suggest using the email address you use at work.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-200 rounded-lg text-gray-900
                  outline-none transition-all duration-200
                  focus:border-[#6366F1] focus:ring-4 focus:ring-[#6366F1]/10"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-white border border-gray-200 rounded-lg text-gray-900
                    outline-none transition-all duration-200
                    focus:border-[#6366F1] focus:ring-4 focus:ring-[#6366F1]/10"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Forgot password
                </Link>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200
                disabled:opacity-70 active:scale-[0.99] bg-[#6366F1] hover:bg-[#4F46E5] shadow-sm"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
              OR
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Social Logins */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          {/* Register link */}
          <div className="mt-8 text-center text-[13px] text-gray-500">
            You dont have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
            >
              Sign up
            </Link>
          </div>

          <div className="mt-12 text-center text-[11px] text-gray-400">
            By creating account you agree to our{" "}
            <a href="#" className="text-gray-500 hover:underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-gray-500 hover:underline">
              Privacy Policy
            </a>
          </div>

          {/* Optional Demo Credentials Notice for Development */}
          <div className="mt-6 text-center text-[10px] text-gray-300">
            Demo: seller@demo.com / Demo@1234
          </div>
        </div>
      </div>

      {/* ── RIGHT — Animated USP Floating Showcase ────────────── */}
      <div className="hidden lg:block lg:w-[55%] relative">
        <USPAnimation />
      </div>
    </div>
  );
}
