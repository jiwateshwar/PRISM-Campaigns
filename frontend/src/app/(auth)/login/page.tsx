"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push("/operators");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0D1B2E 0%, #1E3A5F 50%, #0D1B2E 100%)" }}>
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-center px-16 py-12">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#0A7EA4" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
              <circle cx="12" cy="12" r="3" fill="white"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Prism Campaigns</h1>
            <p className="text-sm text-blue-300 mt-0.5">Marketing Operations Platform</p>
          </div>
        </div>

        <h2 className="text-4xl font-bold text-white leading-tight mb-4">
          Plan smarter.<br />
          Execute with<br />
          precision.
        </h2>
        <p className="text-blue-200 text-lg leading-relaxed max-w-md">
          The central planning hub for your telecom marketing operations — from campaign ideation to execution tracking and business intelligence.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-4 max-w-md">
          {[
            { label: "Multi-operator", desc: "Manage multiple telco operators from one platform" },
            { label: "Journey Builder", desc: "Visual drag-and-drop campaign journeys" },
            { label: "KPI Forecasting", desc: "Auto-calculating activation and revenue forecasts" },
            { label: "Analytics", desc: "8 interactive dashboards with real-time data" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="text-sm font-semibold text-white mb-1">{item.label}</div>
              <div className="text-xs text-blue-300 leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div className="flex flex-col justify-center w-full lg:w-[480px] px-8 py-12 lg:px-12" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(20px)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "#0A7EA4" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="text-lg font-bold text-white">Prism Campaigns</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Sign in</h2>
          <p className="text-blue-300 mt-1 text-sm">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@company.com"
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder:text-blue-400/50 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0A7EA4")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-medium text-blue-200">Password</label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder:text-blue-400/50 outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#0A7EA4")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-semibold text-white transition-all"
            style={{
              background: loading ? "rgba(10,126,164,0.6)" : "#0A7EA4",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs text-blue-400 text-center">
            Default credentials: <span className="text-blue-300">admin@prism.local / Admin@123456</span>
          </p>
        </div>
      </div>
    </div>
  );
}
