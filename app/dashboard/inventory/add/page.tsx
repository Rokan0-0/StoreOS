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
    sell_type: "unit" as "unit" | "pack" | "both",
    pack_size: "",
    pack_label: "",
    unit_label: "",
    sell_price_pack: "",
    sku: "",
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
    
    if ((form.sell_type === "pack" || form.sell_type === "both") && !form.pack_size) {
      return setError("Pack size is required for packed items.");
    }


    setSaving(true);
    try {
      if (!business) throw new Error("No business context");

      // 1. Duplicate check (case-insensitive)
      const existing = await db.products
        .where('business_id').equals(business.id)
        .filter(p => p.name.toLowerCase() === form.name.trim().toLowerCase())
        .first();

      if (existing) {
        setSaving(false);
        return setError("A product with this name already exists. Try adding a variant (e.g. 'Milo 500g').");
      }

      const product: Product = {
        id: uuidv4(),
        business_id: business.id,
        name: form.name.trim(),
        category: form.category,
        buy_price: parseFloat(form.buy_price) || 0,
        sell_price: parseFloat(form.sell_price),
        quantity: parseInt(form.quantity),
        threshold: parseInt(form.threshold) || 5,
        sell_type: form.sell_type,
        pack_size: parseInt(form.pack_size) || null,
        pack_label: form.pack_label.trim() || null,
        unit_label: form.unit_label.trim() || null,
        sell_price_pack: form.sell_price_pack ? parseFloat(form.sell_price_pack) : (parseFloat(form.sell_price) * parseInt(form.pack_size) || null),
        sku: form.sku.trim() || undefined,
        updated_at: new Date().toISOString(),
      };
      
      await db.products.add(product);
      await queueLocalMutation('products', 'insert', product.id, product);

      setSaved(true);
      setTimeout(() => router.push("/dashboard/inventory"), 800);
    } catch (err: any) {
      console.error("Product Save Error:", err);
      setError(err?.message || "Failed to save product. Try again.");
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Buying Price (₦) <span className="text-gray-400 font-normal">(per unit)</span></label>
              <input
                className="input"
                type="number"
                placeholder="0.00"
                value={form.buy_price}
                onChange={(e) => updateForm("buy_price", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Selling Price (₦) <span className="text-gray-400 font-normal">(per unit)</span> *</label>
              <input
                className="input"
                type="number"
                placeholder="0.00"
                value={form.sell_price}
                onChange={(e) => updateForm("sell_price", e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 pb-2 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Unit & Pack System</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["unit", "pack", "both"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => updateForm("sell_type", type)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all capitalize ${
                    form.sell_type === type ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {(form.sell_type === "pack" || form.sell_type === "both") && (
              <div className="space-y-4 animate-fade-in bg-gray-50 p-4 rounded-xl mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pack Size *</label>
                    <input className="input" type="number" placeholder="e.g. 24" value={form.pack_size} onChange={(e) => updateForm("pack_size", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pack Type</label>
                    <input className="input" placeholder="e.g. Carton, Crate" value={form.pack_label} onChange={(e) => updateForm("pack_label", e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Pack Selling Price (₦)</label>
                  <input className="input" type="number" placeholder="Leave blank to auto-calc" value={form.sell_price_pack} onChange={(e) => updateForm("sell_price_pack", e.target.value)} />
                  {!form.sell_price_pack && form.sell_price && form.pack_size && !isNaN(parseFloat(form.sell_price)) && !isNaN(parseInt(form.pack_size)) && (
                    <p className="mt-1 text-xs text-gray-500">
                      Auto: ₦{form.sell_price} × {form.pack_size} = <span className="font-bold text-gray-900">₦{(parseFloat(form.sell_price) * parseInt(form.pack_size)).toLocaleString()}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit Type <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input className="input" placeholder="e.g. Sachet, Piece, Bottle" value={form.unit_label} onChange={(e) => updateForm("unit_label", e.target.value)} />
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
              <p className="mt-1 text-xs text-gray-400">Total units stored</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Alert Threshold</label>
              <input
                className="input"
                type="number"
                placeholder="5"
                value={form.threshold}
                onChange={(e) => updateForm("threshold", e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-400">Low stock level</p>
            </div>
          </div>

          <div>
             <label className="block text-sm font-semibold text-gray-700 mb-1.5">Barcode / SKU <span className="text-gray-400 font-normal">(Optional)</span></label>
             <input className="input" placeholder="Scan or type barcode" value={form.sku} onChange={(e) => updateForm("sku", e.target.value)} />
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
