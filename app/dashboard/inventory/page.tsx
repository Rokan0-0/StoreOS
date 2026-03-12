"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  X,
  ChevronDown,
} from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { queueLocalMutation } from "@/lib/sync";
import { v4 as uuidv4 } from "uuid";
import type { Product } from "@/types";
import InventoryRow from "@/components/inventory/inventory-row";
import { useSearchParams } from "next/navigation";

const CATEGORIES = [
  "All",
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

export default function InventoryPage() {
  const { business } = useAuth();
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get("filter");

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showLowStock, setShowLowStock] = useState(filterQuery === "low-stock");
  const [loading, setLoading] = useState(true);
  const [showDeleteId, setShowDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (filterQuery === "low-stock") setShowLowStock(true);
  }, [filterQuery]);

  const loadProducts = useCallback(async () => {
    if (!business) return;
    setLoading(true);
    const all = await db.products.where("business_id").equals(business.id).toArray();
    setProducts(all.sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, [business]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function deleteProduct(id: string) {
    if (!business) return;
    await db.products.delete(id);
    await queueLocalMutation('products', 'delete', id, null);
    setShowDeleteId(null);
    loadProducts();
  }

  async function seedSampleData() {
    if (!business) return;
    setLoading(true);
    
    const samples: Product[] = [
      { id: uuidv4(), business_id: business.id, name: "Peak Milk 400g", category: "Dairy", buy_price: 1500, sell_price: 1800, quantity: 24, threshold: 5, sell_type: "unit", updated_at: new Date().toISOString() },
      { id: uuidv4(), business_id: business.id, name: "Milo 500g", category: "Beverages", buy_price: 2000, sell_price: 2500, quantity: 15, threshold: 5, sell_type: "unit", updated_at: new Date().toISOString() },
      { id: uuidv4(), business_id: business.id, name: "Golden Penny Spaghetti", category: "Grains & Cereals", buy_price: 400, sell_price: 550, quantity: 50, threshold: 10, sell_type: "unit", updated_at: new Date().toISOString() },
      { id: uuidv4(), business_id: business.id, name: "Eva Water 75cl", category: "Beverages", buy_price: 150, sell_price: 250, quantity: 120, threshold: 20, sell_type: "unit", updated_at: new Date().toISOString() },
      { id: uuidv4(), business_id: business.id, name: "Digestive Biscuits", category: "Snacks", buy_price: 800, sell_price: 1000, quantity: 30, threshold: 5, sell_type: "unit", updated_at: new Date().toISOString() },
    ];

    try {
      for (const p of samples) {
        await db.products.add(p);
        await queueLocalMutation('products', 'insert', p.id, p);
      }
      await loadProducts();
    } catch (err) {
      console.error("Seed error:", err);
      alert("Failed to seed data. Check console.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.includes(search));
    const matchCategory = category === "All" || p.category === category;
    const matchLowStock = showLowStock ? (p.quantity <= p.threshold) : true;
    return matchSearch && matchCategory && matchLowStock;
  });

  const allLowStockCount = products.filter((p) => p.quantity <= p.threshold).length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * p.buy_price), 0);

  return (
    <div className="animate-fade-in">
      <Topbar title="Inventory" />

      {/* Header Summary Strip */}
      <div className="bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6 py-3 text-xs sm:text-sm font-medium sticky top-14 z-20">
         <div className="flex items-center gap-4 text-gray-500">
            <span>Total: <strong className="text-gray-900">{products.length}</strong></span>
            <span className="hidden sm:inline">Value: <strong className="text-gray-900">{formatCurrency(totalStockValue)}</strong></span>
         </div>
         <button 
           onClick={() => setShowLowStock(!showLowStock)}
           className={cn("flex items-center gap-1.5 transition-colors", showLowStock ? "text-amber-600 bg-amber-50 px-2 pl-1.5 py-0.5 rounded-full" : "text-amber-600 hover:text-amber-700")}
         >
            <AlertTriangle className="w-4 h-4" /> 
            {showLowStock ? "Clear Alert Filter" : `Low Stock: ${allLowStockCount} \u2192`}
         </button>
      </div>

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Products</h2>
            <p className="text-sm text-gray-500">
              Manage items, prices and stock levels
            </p>
          </div>
          <Link href="/dashboard/inventory/add" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input pr-8 appearance-none min-w-[120px]"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Product List */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No products found</p>
            {products.length === 0 && (
              <div className="flex flex-col items-center gap-3 mt-4">
                <Link href="/dashboard/inventory/add" className="btn-primary text-sm px-6">
                  Add your first product
                </Link>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span className="h-px w-12 bg-gray-200"></span>
                  or
                  <span className="h-px w-12 bg-gray-200"></span>
                </div>
                <button 
                  onClick={seedSampleData}
                  className="px-6 py-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-600 transition-colors text-sm font-semibold"
                >
                  Seed Example Data
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((product) => (
              <InventoryRow 
                 key={product.id} 
                 product={product} 
                 onUpdate={loadProducts} 
                 onDeleteRequest={setShowDeleteId} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteId !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowDeleteId(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Delete Product?</h3>
              <button onClick={() => setShowDeleteId(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">This will permanently delete the product. Sales history will be preserved.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteId(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={() => deleteProduct(showDeleteId!)} className="btn-danger flex-1 text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
