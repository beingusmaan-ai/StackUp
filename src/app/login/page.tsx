"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const canSubmit = email.trim() && password.trim();

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-10 px-4 relative overflow-hidden">

      {/* Gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-white" />
        <div className="absolute top-0 left-0 w-[45%] h-[55%] bg-gradient-to-br from-[#ffd4cc] via-[#ffb8c6] to-transparent opacity-60 blur-3xl" />
        <div className="absolute top-0 right-0 w-[45%] h-[55%] bg-gradient-to-bl from-[#d4d4ff] via-[#c4b5fd] to-transparent opacity-50 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-gradient-to-t from-[#fde4dc] to-transparent opacity-40 blur-3xl" />
      </div>

      {/* Top spacer */}
      <div />

      {/* Main content */}
      <div className="w-full max-w-[400px] flex flex-col items-center">

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg ring-1 ring-black/10 mb-4">
            <Image src="/logo.jfif" alt="StackUp" width={48} height={48} className="object-contain w-full h-full" />
          </div>
          <h1 className="text-[22px] font-bold text-gray-900">Welcome back!</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Internal platform · <span className="text-[#e8170b] font-medium">Arthur Lawrence</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3 mt-2">
          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Work email"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800 transition shadow-sm"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all mt-1 disabled:cursor-not-allowed"
            style={{
              background: canSubmit
                ? "linear-gradient(135deg, #e8170b, #c91409)"
                : "#c8c8c8",
              color: "white",
              boxShadow: canSubmit ? "0 4px 14px rgba(232,23,11,0.35)" : "none",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : "Log In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full my-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">quick fill</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Quick fill buttons */}
        <div className="grid grid-cols-2 gap-2 w-full">
          {[
            { label: "Admin", email: "aseem.jibran@arthurlawrence.net", pass: "admin123" },
            { label: "Team Member", email: "saad.hassan@arthurlawrence.net", pass: "member123" },
          ].map((demo) => (
            <button
              key={demo.label}
              onClick={() => { setEmail(demo.email); setPassword(demo.pass); }}
              className="py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 text-xs font-medium transition shadow-sm"
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <p className="text-sm text-gray-400">Need help?</p>
    </div>
  );
}
