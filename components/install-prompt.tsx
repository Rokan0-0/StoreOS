"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";

export default function InstallPrompt() {
  const { canInstall, isInstalled, triggerInstall } = useInstallPrompt();
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if on iOS
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(isIOSDevice);

    // Don't show if installed or recently dismissed
    if (isInstalled) return;

    const dismissedUntil = localStorage.getItem("storeos_install_dismissed");
    if (dismissedUntil && new Date().getTime() < parseInt(dismissedUntil)) return;

    // Show banner after a slight delay
    const timer = setTimeout(() => {
      // If prompt is ready or it's iOS (which doesn't support the prompt event), make it visible
      if (canInstall || isIOSDevice) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  const handleDismiss = () => {
    setIsVisible(false);
    // Hide for 7 days
    const nextWeek = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("storeos_install_dismissed", nextWeek.toString());
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 relative overflow-hidden">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-green-600" />
          </div>
          <div className="pr-4">
            <h3 className="text-base font-bold text-gray-900 leading-tight">Install StoreOS</h3>
            {isIos ? (
              <div className="mt-1 text-sm text-gray-500">
                Tap the <strong className="text-gray-700">Share</strong> button on your browser toolbar, then select <strong className="text-gray-700">Add to Home Screen</strong>.
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-500">
                Add to your home screen for faster access and offline use.
              </p>
            )}
            
            {!isIos && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={triggerInstall}
                  className="btn-primary text-xs py-2 px-3 flex-1 justify-center"
                >
                  Install App
                </button>
                <button
                  onClick={handleDismiss}
                  className="btn-secondary text-xs py-2 px-3 flex-1 justify-center"
                >
                  Not now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
