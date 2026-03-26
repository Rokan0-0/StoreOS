"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function PwaUpdater() {
  const [hasPrompted, setHasPrompted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleControllerChange = () => {
      if (hasPrompted) return;
      
      setHasPrompted(true);
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-gray-900">
              Update Available \uD83D\uDE80
            </span>
            <span className="text-xs text-gray-500 mb-1">
              A new version of StoreOS was installed in the background. Refresh to use the latest features!
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  window.location.reload();
                }}
                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700 w-full"
              >
                Refresh Now
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity, 
          position: "top-center",
          style: {
            border: "1px solid #22c55e",
            padding: "16px",
          },
        }
      );
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [hasPrompted]);

  return null;
}
