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
            <Image src="/logo.jfif" alt="Arthur Lawrence" width={68} height={68} className="object-contain" />
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
