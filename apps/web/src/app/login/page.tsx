"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/api";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initMode = searchParams.get("mode") === "signup" ? "signup" : "login";
  
  const [mode, setMode] = useState<"login" | "signup">(initMode);
  
  // Login state
  const login = useAuthStore((s) => s.login);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  
  // Register state
  const register = useAuthStore((s) => s.register);
  const [regForm, setRegForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    gstin: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If the user navigates to /login?mode=signup, update state
    const m = searchParams.get("mode");
    if (m === "signup" || m === "login") {
      setMode(m);
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      router.push("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err));
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(regForm);
      router.push("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err));
      setLoading(false);
    }
  }

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const activeBg = "#546B41";
  const activeColor = "#fff";
  const idleBg = "transparent";
  const idleColor = "#6b6359";

  const carriers = [
    { n: "Delhivery", m: "D" }, { n: "Ekart", m: "E" }, { n: "Blue Dart", m: "BD" },
    { n: "DTDC", m: "DT" }, { n: "XpressBees", m: "XB" }, { n: "Shadowfax", m: "SF" },
  ];
  const mini = [
    { icon: "🏷️", l: "Order", pos: "4%", d: "0s" },
    { icon: "📦", l: "Picked", pos: "36%", d: "1s" },
    { icon: "🚚", l: "Transit", pos: "68%", d: "2s" },
    { icon: "🏠", l: "Delivered", pos: "96%", d: "3s" },
  ];

  const handleContinue = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] font-sans bg-[#FFF8EC] text-[#1B2113]">
      <style>{`
        @keyframes azpulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes azfloat { 0%,100%{transform:translateY(0) rotate(var(--r))} 50%{transform:translateY(-16px) rotate(var(--r))} }
        @keyframes azflow { 0%{transform:translateX(-130%)} 100%{transform:translateX(430%)} }
        @keyframes azring { 0%{opacity:0;transform:scale(.7)} 25%{opacity:.8} 100%{opacity:0;transform:scale(1.5)} }
      `}</style>

      {/* LEFT BRAND PANEL */}
      <div className="relative bg-[#2A331F] text-white py-[52px] px-[5vw] flex flex-col justify-between overflow-hidden min-h-auto lg:min-h-screen">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(rgba(153,173,122,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(153,173,122,.10) 1px,transparent 1px)",
            backgroundSize: "46px 46px",
            WebkitMaskImage: "radial-gradient(circle at 30% 30%,#000,transparent 78%)",
            maskImage: "radial-gradient(circle at 30% 30%,#000,transparent 78%)",
          }}
        ></div>
        <div className="absolute top-[-120px] left-[-80px] w-[540px] h-[360px] pointer-events-none" style={{ background: "radial-gradient(closest-side,rgba(153,173,122,.30),transparent)" }}></div>
        <div className="absolute text-[40px] top-[18%] right-[12%] opacity-90" style={{ animation: "azfloat 6s ease-in-out infinite", "--r": "-12deg" } as any}>📦</div>
        <div className="absolute text-[26px] top-[46%] right-[26%] opacity-70" style={{ animation: "azfloat 7.5s ease-in-out infinite", "--r": "8deg" } as any}>📦</div>

        {/* logo */}
        <Link href="/" className="relative z-10 flex items-center">
          <img src="/logo-cream.png" alt="mozopost" className="h-[30px] w-auto block" />
        </Link>

        {/* middle */}
        <div className="relative z-10 max-w-none lg:max-w-[440px] my-[40px] lg:my-0">
          <div className="inline-flex items-center gap-[9px] bg-[#DCCCAC1E] border border-[#DCCCAC4D] px-[13px] py-[6px] rounded-full text-[12px] font-semibold text-[#DCCCAC] mb-[24px]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#99AD7A] shadow-[0_0_9px_#99AD7A] animate-[azpulse_1.5s_infinite]"></span>
            Live across 14+ carriers
          </div>
          <h1 className="font-['Space_Grotesk',sans-serif] text-[clamp(34px,3.6vw,48px)] font-bold tracking-[-0.04em] leading-[1.04] mb-[18px]">
            Ship the world from one dashboard.
          </h1>
          <p className="text-[17px] leading-[1.55] text-[#C6CDB8] mb-[34px]">
            Pull parcels from your store, coordinate pickups and run NDR recovery — mozopost sits between you and every courier.
          </p>

          {/* mini journey */}
          <div className="relative h-[62px] mb-[8px]">
            <div className="absolute top-[13px] left-0 right-0 h-[2px] bg-white/10 overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-[34%] bg-gradient-to-r from-transparent via-[#99AD7A] to-[#DCCCAC] animate-[azflow_4s_linear_infinite]"></div>
            </div>
            {mini.map((m, idx) => (
              <div key={idx} className="absolute top-0 flex flex-col items-center -translate-x-1/2" style={{ left: m.pos }}>
                <span className="relative w-[28px] h-[28px] rounded-[9px] bg-white/5 border border-[#DCCCAC66] flex items-center justify-center text-[13px]">
                  {m.icon}
                  <span className="absolute -inset-[4px] rounded-[12px] border border-[#99AD7A] opacity-0 animate-[azring_4s_ease-out_infinite]" style={{ animationDelay: m.d }}></span>
                </span>
                <span className="mt-[8px] text-[11px] text-[#9FAA88] whitespace-nowrap">{m.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* carriers */}
        <div className="relative z-10">
          <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#8F9A78] mb-[14px]">Trusted alongside</div>
          <div className="flex flex-wrap gap-[9px]">
            {carriers.map((c, idx) => (
              <span key={idx} className="inline-flex items-center gap-[7px] bg-white/5 border border-white/10 px-[12px] py-[6px] rounded-full text-[13px] font-semibold text-[#DCCCAC]">
                <span className="w-[18px] h-[18px] rounded-[5px] bg-[#99AD7A4D] text-[#DCCCAC] flex items-center justify-center font-['Space_Grotesk',sans-serif] text-[9px] font-bold">{c.m}</span>
                {c.n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="flex items-center justify-center px-[8vw] lg:px-[6vw] py-[40px] lg:py-[48px]">
        <div className="w-full max-w-[412px]">

          {/* tabs */}
          <div className="flex gap-[4px] bg-[#EFE9D8] rounded-full p-[4px] mb-[30px]">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="flex-1 border-none cursor-pointer text-[14px] font-bold p-[11px] rounded-full transition-all duration-200"
              style={{ background: isLogin ? activeBg : idleBg, color: isLogin ? activeColor : idleColor }}
            >
              Log in
            </button>
            <button
              onClick={() => { setMode("signup"); setError(""); }}
              className="flex-1 border-none cursor-pointer text-[14px] font-bold p-[11px] rounded-full transition-all duration-200"
              style={{ background: isSignup ? activeBg : idleBg, color: isSignup ? activeColor : idleColor }}
            >
              Sign up
            </button>
          </div>

          <div>
              <h2 className="font-['Space_Grotesk',sans-serif] text-[29px] font-bold tracking-[-0.03em] mb-[7px]">
                {isLogin ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-[15px] text-[#6b6359] mb-[26px]">
                {isLogin ? "Log in to manage your shipments and carriers." : "Start shipping across every courier in minutes."}
              </p>

              {/* social */}
              <div className="flex flex-col gap-[10px] mb-[22px]">
                <button
                  type="button"
                  className="flex items-center justify-center gap-[10px] w-full border-[1.5px] border-black/10 bg-white cursor-pointer text-[15px] font-semibold p-[13px] rounded-[11px] text-[#1B2113] hover:bg-gray-50 transition-colors"
                >
                  <span className="w-[18px] h-[18px] rounded-full" style={{ background: "conic-gradient(#EA4335,#FBBC05,#34A853,#4285F4,#EA4335)" }}></span>
                  Continue with Google
                </button>
              </div>
              <div className="flex items-center gap-[14px] mb-[22px] text-[#b3a994] text-[12px] font-semibold tracking-[0.05em]">
                <span className="flex-1 h-[1px] bg-black/10"></span>OR<span className="flex-1 h-[1px] bg-black/10"></span>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-2">
                  ⚠️ {error}
                </div>
              )}

              {/* fields */}
              <form onSubmit={isLogin ? handleLogin : handleSignup} className="flex flex-col gap-[15px]">
                
                {isSignup && (
                  <>
                    <div className="grid grid-cols-2 gap-[15px]">
                      <label className="block">
                        <span className="text-[13px] font-bold text-[#5c544b]">First name</span>
                        <input
                          required
                          value={regForm.firstName}
                          onChange={(e) => setRegForm({ ...regForm, firstName: e.target.value })}
                          placeholder="Priya"
                          className="w-full mt-[7px] px-[15px] py-[13px] rounded-[11px] border-[1.5px] border-black/10 text-[15px] outline-none bg-white focus:border-[#546B41] transition-colors"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[13px] font-bold text-[#5c544b]">Last name</span>
                        <input
                          required
                          value={regForm.lastName}
                          onChange={(e) => setRegForm({ ...regForm, lastName: e.target.value })}
                          placeholder="Nair"
                          className="w-full mt-[7px] px-[15px] py-[13px] rounded-[11px] border-[1.5px] border-black/10 text-[15px] outline-none bg-white focus:border-[#546B41] transition-colors"
                        />
                      </label>
                    </div>
                  </>
                )}

                <label className="block">
                  <span className="text-[13px] font-bold text-[#5c544b]">Work email</span>
                  <input
                    required
                    type="email"
                    value={isLogin ? loginForm.email : regForm.email}
                    onChange={(e) => isLogin ? setLoginForm({ ...loginForm, email: e.target.value }) : setRegForm({ ...regForm, email: e.target.value })}
                    placeholder="you@store.com"
                    className="w-full mt-[7px] px-[15px] py-[13px] rounded-[11px] border-[1.5px] border-black/10 text-[15px] outline-none bg-white focus:border-[#546B41] transition-colors"
                  />
                </label>

                <label className="block">
                  <span className="flex justify-between items-center">
                    <span className="text-[13px] font-bold text-[#5c544b]">Password</span>
                    {isLogin && <a href="#" className="text-[12px] font-semibold text-[#546B41]">Forgot?</a>}
                  </span>
                  <input
                    required
                    type="password"
                    value={isLogin ? loginForm.password : regForm.password}
                    onChange={(e) => isLogin ? setLoginForm({ ...loginForm, password: e.target.value }) : setRegForm({ ...regForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full mt-[7px] px-[15px] py-[13px] rounded-[11px] border-[1.5px] border-black/10 text-[15px] outline-none bg-white focus:border-[#546B41] transition-colors"
                  />
                </label>

                {isSignup && (
                  <>
                    <label className="block">
                      <span className="text-[13px] font-bold text-[#5c544b]">Company / Business name</span>
                      <input
                        required
                        value={regForm.businessName}
                        onChange={(e) => setRegForm({ ...regForm, businessName: e.target.value })}
                        placeholder="Looma Living"
                        className="w-full mt-[7px] px-[15px] py-[13px] rounded-[11px] border-[1.5px] border-black/10 text-[15px] outline-none bg-white focus:border-[#546B41] transition-colors"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-[15px]">
                      <label className="block">
                        <span className="text-[13px] font-bold text-[#5c544b]">Phone</span>
                        <input
                          required
                          maxLength={10}
                          value={regForm.phone}
                          onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                          placeholder="9876543210"
                          className="w-full mt-[7px] px-[15px] py-[13px] rounded-[11px] border-[1.5px] border-black/10 text-[15px] outline-none bg-white focus:border-[#546B41] transition-colors"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[13px] font-bold text-[#5c544b]">GSTIN <span className="text-[#b3a994] font-medium">(optional)</span></span>
                        <input
                          value={regForm.gstin}
                          onChange={(e) => setRegForm({ ...regForm, gstin: e.target.value })}
                          placeholder="22AAAAA0000A1Z5"
                          className="w-full mt-[7px] px-[15px] py-[13px] rounded-[11px] border-[1.5px] border-black/10 text-[15px] outline-none bg-white focus:border-[#546B41] transition-colors"
                        />
                      </label>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-[9px] bg-[#546B41] hover:bg-[#3C4E2D] transition-colors text-white border-none cursor-pointer font-bold text-[16px] p-[15px] rounded-[11px] shadow-[0_12px_26px_rgba(84,107,65,.3)] disabled:opacity-70"
                >
                  {loading ? (isLogin ? "Logging in..." : "Creating account...") : (isLogin ? "Log in" : "Create account")}
                </button>
              </form>

              {isSignup && (
                <p className="text-[12px] text-[#9a9088] text-center mt-[14px] leading-[1.5]">
                  By creating an account you agree to our Terms & Privacy Policy.
                </p>
              )}
              <p className="text-[14px] text-[#6b6359] text-center mt-[18px]">
                {isLogin ? "New to mozopost?" : "Already have an account?"} {" "}
                <button
                  type="button"
                  onClick={() => { setMode(isLogin ? "signup" : "login"); setError(""); }}
                  className="font-bold text-[#546B41] hover:underline"
                >
                  {isLogin ? "Create an account" : "Log in"}
                </button>
              </p>

              {/* Optional Demo Credentials Notice for Development */}
              {isLogin && (
                <div className="mt-[24px] text-center text-[11px] text-gray-400">
                  Demo: seller@demo.com / Demo@1234
                </div>
              )}
            </div>

        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FFF8EC]"></div>}>
      <AuthContent />
    </Suspense>
  );
}
