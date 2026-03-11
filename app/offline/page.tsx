import { Smartphone } from "lucide-react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";

export default function OfflinePage() {
  return (
    <div className="animate-fade-in min-h-screen bg-gray-50 flex flex-col">
      <Topbar title="StoreOS" />
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Smartphone className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You're offline</h2>
        <p className="text-gray-500 max-w-sm mb-8 leading-relaxed">
          Don't worry — everything you've recorded is saved on this device. Your data will sync automatically when you're back online.
        </p>
        <Link href="/dashboard" className="btn-primary w-full max-w-xs justify-center">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
