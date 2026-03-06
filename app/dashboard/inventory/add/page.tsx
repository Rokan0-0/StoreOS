"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ArrowLeft, Check } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { queueLocalMutation } from "@/lib/sync";
import { v4 as uuidv4 } from "uuid";
import type { Product } from "@/types";

const CATEGORIES = [
  "Beverages",
  "Dairy",
  "Grains & Cereals",
  "Snacks",
  "Toiletries",
  "Canned Foods",
  "Frozen Foods",
  "Cleaning",
  "Other",
];

export default function AddProductPage() {
  const router = useRouter();
  const { business } = useAuth();
  const [form, setForm] = useState({
    name: "",
    category: "Beverages",
    buy_price: "",
    sell_price: "",
    quantity: "",
    threshold: "5",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const updateForm = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  }, []);

  async function handleSave() {
    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.sell_price || isNaN(+form.sell_price)) return setError("Enter a valid selling price.");
    if (!form.quantity || isNaN(+form.quantity)) return setError("Enter a valid quantity.");

    setSaving(true);
    try {
      if (!business) throw new Error("No business context");

      const product: Product = {
        id: uuidv4(),
        business_id: business.id,
        name: form.name.trim(),
        category: form.category,
        buy_price: parseFloat(form.buy_price) || 0,
        sell_price: parseFloat(form.sell_price),
        quantity: parseInt(form.quantity),
        threshold: parseInt(form.threshold) || 5,
        updated_at: new Date().toISOString(),
      };
      
      await db.products.add(product);
      await queueLocalMutation('products', 'insert', product.id, product);

      setSaved(true);
      setTimeout(() => router.push("/dashboard/inventory"), 800);
    } catch {
      setError("Failed to save product. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <Topbar title="Add Product" />
      <div className="px-4 lg:px-6 py-5 max-w-lg mx-auto space-y-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </button>

        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Name *</label>
            <input
              className="input"
              placeholder="e.g. Peak Milk 400g"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
            <div className="relative">
              <select
                className="input appearance-none pr-8"
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Buying Price (₦)</label>
              <input
                className="input"
                type="number"
                placeholder="0.00"
                value={form.buy_price}
                onChange={(e) => updateForm("buy_price", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Selling Price (₦) *</label>
              <input
                className="input"
                type="number"
                placeholder="0.00"
                value={form.sell_price}
                onChange={(e) => updateForm("sell_price", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Current Stock *</label>
              <input
                className="input"
                type="number"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => updateForm("quantity", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Low Stock Alert at</label>
              <input
                className="input"
                type="number"
                placeholder="5"
                value={form.threshold}
                onChange={(e) => updateForm("threshold", e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              saved
                ? "bg-green-50 text-green-600"
                : "bg-green-600 hover:bg-green-700 text-white active:scale-95"
            }`}
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved!</>
            ) : saving ? (
              "Saving..."
            ) : (
              "Save Product"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
