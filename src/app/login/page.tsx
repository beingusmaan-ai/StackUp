"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-[#e8170b] via-[#c91409] to-[#7a0a04] flex-col justify-between p-12 relative overflow-hidden">

        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/[0.03]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg">
            <Image src="/logo.jfif" alt="Arthur Lawrence" width={36} height={36} className="object-contain rounded-lg" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">StackUp</p>
            <p className="text-white/60 text-xs">by Arthur Lawrence</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
            Your team's<br />work, all in<br />one place.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-sm">
            Manage projects, track tasks, collaborate across teams — everything your marketing operation needs.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {["Project Management", "Task Tracking", "Team Reports", "Templates", "Workload"].map((f) => (
              <span key={f} className="px-3 py-1.5 rounded-full bg-white/15 text-white/90 text-xs font-medium backdrop-blur-sm border border-white/20">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10">
          <p className="text-white/40 text-sm">© {new Date().getFullYear()} Arthur Lawrence. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#fafafa]">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-[#e8170b] flex items-center justify-center shadow">
              <Image src="/logo.jfif" alt="AL" width={32} height={32} className="object-contain rounded-lg" />
            </div>
            <span className="text-xl font-bold text-gray-900">StackUp</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-1.5 text-[15px]">Sign in to your StackUp account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@arthurlawrence.net"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]/30 focus:border-[#e8170b] transition shadow-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#e8170b]/30 focus:border-[#e8170b] transition shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#e8170b] to-[#c91409] hover:from-[#d41409] hover:to-[#b01208] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-[#e8170b]/25 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign in"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">Quick access</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Quick fill */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Admin", email: "aseem.jibran@arthurlawrence.net", pass: "admin123" },
              { label: "Team Member", email: "saad.hassan@arthurlawrence.net", pass: "member123" },
            ].map((demo) => (
              <button
                key={demo.label}
                onClick={() => { setEmail(demo.email); setPassword(demo.pass); }}
                className="flex items-center justify-center gap-1.5 text-xs py-2.5 px-3 rounded-xl bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 border border-gray-200 transition shadow-sm font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8170b]" />
                {demo.label}
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            Internal platform · Arthur Lawrence
          </p>
        </div>
      </div>
    </div>
  );
}
