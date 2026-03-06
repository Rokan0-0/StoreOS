"use client";

import { Bell, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { syncNow } from "@/lib/sync";
import { useAuth } from "@/lib/auth-context";

interface TopbarProps {
  businessName?: string;
  title?: string;
}

export default function Topbar({ businessName = "My Store", title }: TopbarProps) {
  const { business } = useAuth();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger background sync when connection is restored
      syncNow();
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100 h-14 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-2">
        {business?.logo_url && (
          <img src={business.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-gray-50 border border-gray-100 shrink-0" />
        )}
        {title ? (
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
        ) : (
          <span className="text-base font-semibold text-gray-900">{business?.name || businessName}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full ${
            isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden sm:inline">{isOnline ? "Online" : "Offline"}</span>
        </div>
        <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors relative">
          <Bell className="w-4.5 h-4.5 text-gray-500" />
        </button>
      </div>
    </header>
  );
}
