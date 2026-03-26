"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { Store, ArrowLeft, Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { sendMagicLink } from "@/app/auth/actions";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    
    startTransition(async () => {
      const result = await sendMagicLink(formData);
      if (result?.error) {
        setError(result.error);
      } else {
         setSuccess(true);
      }
    });
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
          <h2 className="text-xl font-bold text-gray-900 mb-1">Reset Password</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a magic link to reset your password.</p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success ? (
             <div className="bg-green-50 text-green-700 text-sm px-4 py-6 rounded-xl mb-5 flex flex-col items-center text-center gap-3 animate-fade-in border border-green-100">
               <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-1">
                 <Mail className="w-6 h-6 text-green-600" />
               </div>
               <div>
                  <h3 className="font-bold text-green-900 text-base mb-1">Check your inbox</h3>
                  <p>We've sent a magic link to your email containing a secure password reset link.</p>
               </div>
               <Link href="/login" className="mt-2 text-green-700 font-bold hover:underline">
                  Return to Login
               </Link>
             </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  name="email"
                  className="input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
              >
                {isPending ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>Send Reset Link <Mail className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <p className="text-center text-sm text-gray-400 mt-8">
            Remembered your password?{" "}
            <Link href="/login" className="text-green-400 font-semibold hover:text-green-300 transition-colors flex items-center justify-center gap-1 mt-1">
              <ArrowLeft className="w-3 h-3" /> Back to Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
