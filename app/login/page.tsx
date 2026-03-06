"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError("Please enter email and password.");
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Check if they need onboarding
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", data.user.id)
        .single();

      if (business) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0d1117]">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
            <Store className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">StoreOS</span>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to manage your store</p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-gray-700">Password</label>
                <Link href="#" className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors cursor-not-allowed opacity-50">
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? "Signing in..." : "Sign in"} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-green-400 font-semibold hover:text-green-300 transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
