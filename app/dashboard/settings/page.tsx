"use client";

import { useEffect, useState } from "react";
import { Check, Building2, Phone, MapPin, User, Store } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { queueLocalMutation } from "@/lib/sync";
import { useInstallPrompt } from "@/lib/hooks/use-install-prompt";
import { requestNotificationPermission } from "@/lib/notifications";
import type { Business } from "@/types";

const BUSINESS_TYPES = ["Supermarket", "Provision Store", "General Store"] as const;

export default function SettingsPage() {
  const { business } = useAuth();
  const [form, setForm] = useState<Partial<Business>>({
    name: "",
    type: "Supermarket",
    address: "",
    phone: "",
    currency: "₦",
    low_stock_threshold: 5,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { canInstall, isInstalled, triggerInstall } = useInstallPrompt();
  const [notifPermission, setNotifPermission] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (business) {
      setForm(business);
    }
  }, [business]);

  async function handleSave() {
    setSaving(true);
    try {
      if (business?.id) {
        const payload = { ...form, updated_at: new Date().toISOString() };
        await db.businesses.update(business.id, payload as any);
        await queueLocalMutation('businesses', 'update', business.id, payload);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof Business, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <div className="animate-fade-in">
      <Topbar title="Settings" />
      <div className="px-4 lg:px-6 py-5 max-w-lg mx-auto space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Business Profile</h2>
          <p className="text-sm text-gray-500">This information appears on your statements</p>
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <label className="flex text-sm font-semibold text-gray-700 mb-1.5 items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> Business Name
            </label>
            <input className="input" placeholder="e.g. Ade's Supermarket" value={form.name ?? ""} onChange={(e) => update("name", e.target.value)} />
          </div>

          <div>
            <label className="flex text-sm font-semibold text-gray-700 mb-1.5 items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Business Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => update("type", type)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${
                    form.type === type ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex text-sm font-semibold text-gray-700 mb-1.5 items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Business Address
            </label>
            <input className="input" placeholder="e.g. 12 Market Road, Lagos" value={form.address ?? ""} onChange={(e) => update("address", e.target.value)} />
          </div>

          <div>
            <label className="flex text-sm font-semibold text-gray-700 mb-1.5 items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Business Phone
            </label>
            <input className="input" placeholder="+234..." type="tel" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Preferences</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Low Stock Alert Threshold</label>
            <div className="flex items-center gap-3">
              <input
                className="input w-24"
                type="number"
                min="1"
                value={form.low_stock_threshold ?? 5}
                onChange={(e) => update("low_stock_threshold", parseInt(e.target.value) || 5)}
              />
              <span className="text-sm text-gray-400">units (alert when stock falls below this)</span>
            </div>
          </div>
        </div>

        {/* App & Notifications */}
        <div className="card p-5 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-gray-900">App & Notifications</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-800">Install App</p>
                <p className="text-xs text-gray-500">Add to home screen for offline access</p>
              </div>
              {isInstalled ? (
                <span className="text-sm text-gray-400 flex items-center gap-1"><Check className="w-4 h-4"/> Installed</span>
              ) : canInstall ? (
                <button onClick={triggerInstall} className="btn-primary py-1.5 px-3 text-xs">Install</button>
              ) : (
                <span className="text-xs text-gray-400">Not supported on this browser/OS</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Push Notifications</p>
                <p className="text-xs text-gray-500">Get alerts for low stock and credit</p>
              </div>
              {notifPermission === "granted" ? (
                <span className="text-sm text-green-600 flex items-center gap-1 font-medium"><Check className="w-4 h-4"/> Enabled</span>
              ) : notifPermission === "denied" ? (
                <span className="text-xs text-red-500 max-w-25 text-right">Blocked in browser settings</span>
              ) : (
                <button 
                  onClick={async () => {
                    const status = await requestNotificationPermission();
                    setNotifPermission(status);
                  }} 
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
            saved ? "bg-green-50 text-green-600" : "bg-green-600 hover:bg-green-700 text-white active:scale-95"
          }`}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved</> : saving ? "Saving..." : "Save Changes"}
        </button>

        {/* Version */}
        <div className="text-center">
          <p className="text-xs text-gray-300">StoreOS v1.0 · University Tech Hub</p>
        </div>
      </div>
    </div>
  );
}
