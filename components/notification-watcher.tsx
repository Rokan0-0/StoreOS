"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/db";
import { sendLocalNotification } from "@/lib/notifications";

export default function NotificationWatcher() {
  const { business } = useAuth();

  useEffect(() => {
    if (!business?.id) return;

    // 1. Check for overdue credit
    const checkCredit = async () => {
      const today = new Date().toDateString();
      const lastCheck = localStorage.getItem("storeos_last_credit_check");
      if (lastCheck === today) return; // Only check once per day

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const oldDebits = await db.credit_transactions
        .where("business_id")
        .equals(business.id)
        .filter((t) => t.type === "debit" && new Date(t.created_at!) < sevenDaysAgo)
        .toArray();

      if (oldDebits.length > 0) {
        sendLocalNotification(
          "Overdue Credit",
          `You have ${oldDebits.length} overdue credit records. Remind your customers.`,
          "/dashboard/credit"
        );
      }
      
      localStorage.setItem("storeos_last_credit_check", today);
    };

    checkCredit();

    // 2. Daily Sales Summary (Simulated for 8:00 PM)
    const checkSummary = () => {
      const now = new Date();
      const today = now.toDateString();
      
      if (now.getHours() >= 20) { // After 8:00 PM
        const lastSummary = localStorage.getItem("storeos_last_summary");
        if (lastSummary !== today) {
          sendLocalNotification(
            "Daily Summary Ready",
            "Your sales summary for today is ready. Tap to view.",
            "/dashboard"
          );
          localStorage.setItem("storeos_last_summary", today);
        }
      }
    };

    // Check right away, and then every hour
    checkSummary();
    const interval = setInterval(checkSummary, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [business?.id]);

  return null; // This component has no UI
}
