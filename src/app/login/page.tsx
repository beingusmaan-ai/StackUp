"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
const LOGO_B64 = "data:image/jpeg;base64,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";

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
    <>
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-white">

        {/* Soft pastel blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[40%] h-[45%] bg-gradient-to-br from-[#ffd4b8] via-[#ffb8c8] to-transparent opacity-70 blur-[60px]" />
          <div className="absolute top-0 right-0 w-[40%] h-[45%] bg-gradient-to-bl from-[#c4b5fd] via-[#a5c8ff] to-transparent opacity-60 blur-[60px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-[30%] bg-gradient-to-t from-[#fde4dc] to-transparent opacity-50 blur-[60px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center">

          {/* Logo */}
          <div className="mb-5 w-[68px] h-[68px] rounded-[18px] overflow-hidden shadow-lg flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_B64} alt="Arthur Lawrence" width={68} height={68} className="object-contain" />
          </div>

          {/* Headline */}
          <h1
            className="text-[26px] font-bold text-gray-900 text-center leading-snug mb-1"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            All your work, all your people,<br />all powered by AI
          </h1>
          <p className="text-[13px] text-gray-400 mb-7">To get started, please sign in</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Work email"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition shadow-sm"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="w-full px-4 py-3 pr-11 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-400 transition shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #e8170b, #c91409)",
                color: "white",
                boxShadow: canSubmit ? "0 4px 14px rgba(232,23,11,0.35)" : "none",
                opacity: !canSubmit ? 0.5 : 1,
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
        </div>
      </div>
    </>
  );
}
