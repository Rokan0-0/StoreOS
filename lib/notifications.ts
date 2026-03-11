"use client";

/**
 * Sends a local push notification using the active Service Worker.
 * Does not require a push server for basic local triggers (like low stock).
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  url: string = "/dashboard"
) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  
  if (Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg) {
      reg.showNotification(title, {
        body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-96x96.png",
        data: { url },
      });
    }
  } catch (error) {
    console.error("Error showing notification:", error);
  }
}

/**
 * Request notification permission. 
 * Should only be called after user intention (e.g. clicking a button).
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const permission = await Notification.requestPermission();
  localStorage.setItem("storeos_notif_permission", permission);
  return permission;
}
