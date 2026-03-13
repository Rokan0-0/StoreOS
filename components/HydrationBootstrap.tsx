"use client";

import { useEffect } from "react";
import { hydrateData, syncNow } from "@/lib/sync";

/**
 * HydrationBootstrap — mounts invisibly inside the dashboard layout.
 *
 * On every login it:
 *  1. Calls hydrateData() to pull all Supabase cloud data into local Dexie
 *  2. Calls syncNow() to flush any pending offline queue items to Supabase
 *  3. Wires syncNow() to window 'online' so it auto-syncs when reconnected
 */
export default function HydrationBootstrap({ businessId }: { businessId: string }) {
  useEffect(() => {
    // 1. Hydrate Dexie from Supabase on login
    hydrateData(businessId);

    // 2. Drain any queued offline mutations immediately
    syncNow();

    // 3. Re-sync whenever the device reconnects to the internet
    window.addEventListener("online", syncNow);
    return () => window.removeEventListener("online", syncNow);
  }, [businessId]);

  return null;
}
