"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { apiErrorMessage } from "@/lib/api";
import { Btn, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const [email, setEmail] = useState("seller@demo.com");
  const [password, setPassword] = useState("Demo@1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      console.log("email", email);
      console.log("password", password);
      const user = await login(email, password);

      console.log("user", user);

      let allowedRole = "seller";
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname;
        if (hostname.includes("masteradmin")) {
          allowedRole = "superadmin";
        } else if (hostname.includes("admin")) {
          allowedRole = "admin";
        }
      }

      if (user.role === "seller") router.push("/dashboard");
      else router.push("/dashboard/admin");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf0] p-4">
      <div className="nb-card w-full max-w-sm p-6">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center border-2 border-black bg-c3 font-bold shadow-nb-sm">
            M
          </div>
          <div>
            <div className="text-lg font-bold leading-tight">Mozopost</div>
            <div className="font-mono-nb text-[9px] text-[#888]">
              SHIPPING AGGREGATOR
            </div>
          </div>
        </div>
        <h1 className="mb-4 mt-4 text-xl font-bold">Sign in</h1>

        <form onSubmit={handleSubmit}>
          <Field label="Email" required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password" required>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error && (
            <div className="mb-3 border-2 border-black bg-c2 px-3 py-2 text-xs font-bold text-white">
              ⚠ {error}
            </div>
          )}

          <Btn
            type="submit"
            variant="dark"
            disabled={loading}
            className="w-full justify-center py-2.5"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Btn>
        </form>

        <div className="mt-4 border-2 border-black bg-c5 p-3 text-[11px]">
          <strong>Demo accounts</strong> (password:{" "}
          <code className="font-mono-nb">Demo@1234</code>)
          <div className="font-mono-nb mt-1">
            seller@demo.com · admin@demo.com · superadmin@demo.com
          </div>
        </div>

        <div className="mt-4 text-center text-xs">
          New seller?{" "}
          <Link href="/register" className="font-bold underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
