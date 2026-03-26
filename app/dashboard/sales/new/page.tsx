"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  X,
  ShoppingCart,
  ArrowLeft,
  Check,
} from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { queueLocalMutation } from "@/lib/sync";
import { sendLocalNotification } from "@/lib/notifications";
import { v4 as uuidv4 } from "uuid";
import type { Product, SaleItem, PaymentType, Customer, Sale, CreditTransaction } from "@/types";
import toast from "react-hot-toast";
import Link from "next/link";

export default function NewSalePage() {
  const router = useRouter();
  const { business } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentType, setPaymentType] = useState<PaymentType>("Cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const loadData = useCallback(async () => {
    if (!business) return;
    const prods = await db.products.where("business_id").equals(business.id).toArray();
    const custs = await db.customers.where("business_id").equals(business.id).toArray();
    setProducts(prods);
    setCustomers(custs);
  }, [business]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = products.filter(
    (p) => p.quantity > 0 && p.name.toLowerCase().includes(search.toLowerCase())
  );

  const [showPackSelect, setShowPackSelect] = useState<Product | null>(null);

  function handleProductClick(p: Product) {
    if (p.sell_type === "both" && p.sell_price_pack) {
      setShowPackSelect(p);
    } else {
      addToCart(p, p.sell_type === "pack" ? "pack" : "unit");
    }
  }

  function addToCart(product: Product, mode: "unit" | "pack") {
    const isPack = mode === "pack";
    const price = isPack && product.sell_price_pack ? product.sell_price_pack : product.sell_price;
    const label = isPack ? (product.pack_label || "Pack") : (product.unit_label || "Unit");

    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        if (existing.sell_mode !== mode) {
          // Changed mode -> reset qty to 1
          return prev.map((i) =>
            i.product_id === product.id
              ? { ...i, quantity: 1, sell_mode: mode, sell_label: label, unit_price: price, subtotal: price }
              : i
          );
        } else {
          const maxQty = isPack && product.pack_size ? Math.floor(product.quantity / product.pack_size) : product.quantity;
          if (existing.quantity >= maxQty) {
            toast.error(`Cannot add more. Only ${maxQty} ${label} available in stock.`);
            return prev;
          }
          const newQty = Math.min(existing.quantity + 1, maxQty);
          return prev.map((i) =>
            i.product_id === product.id
              ? { ...i, quantity: newQty, subtotal: newQty * i.unit_price }
              : i
          );
        }
      }
      const maxQty = isPack && product.pack_size ? Math.floor(product.quantity / product.pack_size) : product.quantity;
      if (maxQty < 1) {
        toast.error(`Not enough stock. Need at least 1 ${label}.`);
        return prev;
      }
      return [
        ...prev,
        {
          product_id: product.id!,
          product_name: product.name,
          quantity: 1,
          sell_mode: mode,
          sell_label: label,
          unit_price: price,
          subtotal: price,
        },
      ];
    });
    setShowPackSelect(null);
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId) return i;
          const p = products.find((prod) => prod.id === productId);
          if (!p) return i;
          const maxQty = i.sell_mode === "pack" && p.pack_size ? Math.floor(p.quantity / p.pack_size) : p.quantity;
          if (delta > 0 && i.quantity >= maxQty) {
            toast.error(`Cannot add more. Only ${maxQty} ${i.sell_label || 'units'} in stock.`);
            return i;
          }
          const newQty = Math.min(Math.max(i.quantity + delta, 0), maxQty);
          return { ...i, quantity: newQty, subtotal: newQty * i.unit_price };
        })
        .filter((i) => i.quantity > 0)
    );
  }

  function toggleMode(item: SaleItem) {
    const p = products.find((prod) => prod.id === item.product_id);
    if (!p || p.sell_type !== "both") return;
    const newMode = item.sell_mode === "pack" ? "unit" : "pack";
    const isPack = newMode === "pack";
    const price = isPack && p.sell_price_pack ? p.sell_price_pack : p.sell_price;
    const label = isPack ? (p.pack_label || "Pack") : (p.unit_label || "Unit");
    const maxQty = isPack && p.pack_size ? Math.floor(p.quantity / p.pack_size) : p.quantity;
    
    const newQty = Math.min(1, maxQty);
    setCart((prev) => prev.map(i => i.product_id === item.product_id ? {
      ...i, sell_mode: newMode, sell_label: label, unit_price: price, quantity: newQty, subtotal: newQty * price
    } : i));
  }

  const total = cart.reduce((s, i) => s + i.subtotal, 0);

  async function handleSubmit() {
    if (cart.length === 0) return;
    if (paymentType === "Credit" && !selectedCustomer) return;

    setSubmitting(true);
    try {
      if (!business) throw new Error("No business context");
      const now = new Date().toISOString();
      const saleId = uuidv4();

      const newSale: Sale = {
        id: saleId,
        business_id: business.id,
        items: cart,
        total,
        payment_type: paymentType,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name,
        created_at: now,
      };

      await db.sales.add(newSale);
      await queueLocalMutation('sales', 'insert', saleId, newSale);

      // Deduct stock
      const alertedProducts: string[] = [];

      for (const item of cart) {
        const p = await db.products.get(item.product_id);
        if (p) {
          const deduction = item.sell_mode === "pack" && p.pack_size ? item.quantity * p.pack_size : item.quantity;
          const newQty = Math.max((p.quantity || 0) - deduction, 0);
          const threshold = business.low_stock_threshold || 5;

          await db.products.update(item.product_id, { quantity: newQty });
          
          // Queue the product update
          await queueLocalMutation('products', 'update', item.product_id, {
            ...p,
            quantity: newQty,
            updated_at: now
          });

          // Trigger local push notification and keep track for react-toast if stock dropped
          if (newQty <= threshold && (p.quantity || 0) > threshold) {
             alertedProducts.push(p.name);
             sendLocalNotification(
              "Low Stock Alert",
              `${p.name} is running low (${newQty} left). Tap to view inventory.`,
              "/dashboard/inventory?filter=low-stock"
             );
          }
        }
      }

      if (alertedProducts.length > 0) {
        const msg = alertedProducts.length === 1 
           ? `⚠ Low stock: ${alertedProducts[0]} is running out.` 
           : `⚠ ${alertedProducts.length} items are now low on stock.`;
        
        toast((t) => (
           <div className="flex flex-col gap-1">
             <span className="text-sm font-medium text-amber-900">{msg}</span>
             <Link 
               href="/dashboard/inventory?filter=low-stock" 
               className="text-xs font-bold text-amber-700 underline"
               onClick={() => toast.dismiss(t.id)}
             >
               View inventory &rarr;
             </Link>
           </div>
        ), { duration: 6000, style: { background: '#fffbeb', border: '1px solid #fcd34d' }});
      }

      // Credit transaction
      if (paymentType === "Credit" && selectedCustomer?.id) {
        const creditId = uuidv4();
        const newCredit: CreditTransaction = {
          id: creditId,
          business_id: business.id,
          customer_id: selectedCustomer.id,
          amount: total,
          type: "debit",
          sale_id: saleId,
          created_at: now,
        };

        await db.credit_transactions.add(newCredit);
        await queueLocalMutation('credit_transactions', 'insert', creditId, newCredit);
      }

      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 animate-scale-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-xl font-bold text-gray-900">Sale Recorded!</p>
        <p className="text-sm text-gray-500">{formatCurrency(total)} · {paymentType}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Topbar title="Record Sale" />
      <div className="px-4 lg:px-6 py-5 max-w-2xl mx-auto space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Product Search */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Select Products</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-10"
              placeholder="Search available products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {filtered.slice(0, 8).map((p) => {
              const uLabel = p.unit_label || "Unit";
              const pLabel = p.pack_label || "Pack";
              const packs = p.pack_size && p.pack_size > 0 ? Math.floor(p.quantity / p.pack_size) : null;
              
              return (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-green-50 transition-colors group"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                      {p.sell_type === 'pack' && packs !== null ? `${packs} ${pLabel}` :
                       p.sell_type === 'both' && packs !== null ? `${p.quantity} ${uLabel} (${packs} ${pLabel})` :
                       `${p.quantity} ${uLabel}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {(p.sell_type === 'unit' || p.sell_type === 'both') && (
                        <span className="text-sm font-bold text-gray-900 block">{formatCurrency(p.sell_price)} <span className="text-[10px] text-gray-400 font-normal">/ {uLabel}</span></span>
                      )}
                      {(p.sell_type === 'pack' || p.sell_type === 'both') && p.sell_price_pack && (
                        <span className="text-sm font-bold text-gray-900 block">{formatCurrency(p.sell_price_pack)} <span className="text-[10px] text-gray-400 font-normal">/ {pLabel}</span></span>
                      )}
                    </div>
                    <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3 h-3" />
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">No products available</p>
            )}
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart ({cart.length})
            </h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 flex items-center flex-wrap gap-1">
                      {item.product_name}
                      {(() => {
                        const p = products.find(prod => prod.id === item.product_id);
                        if (!p || p.sell_type === 'unit') return null;
                        return (
                          <button
                            onClick={() => toggleMode(item)}
                            disabled={p.sell_type !== 'both'}
                            className={cn(
                              "px-1.5 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap",
                              p.sell_type === 'both' ? "bg-green-100 text-green-700 hover:bg-green-200" : "text-gray-500 bg-gray-100"
                            )}
                          >
                            ({item.sell_label || (item.sell_mode === "pack" ? "Pack" : "Unit")})
                          </button>
                        );
                      })()}
                    </p>
                    <p className="text-xs text-gray-400">{formatCurrency(item.unit_price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product_id, -1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product_id, 1)} className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => setCart((prev) => prev.filter((i) => i.product_id !== item.product_id))} className="ml-1 w-7 h-7 rounded-full hover:bg-red-50 flex items-center justify-center">
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-20 text-right">{formatCurrency(item.subtotal)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <span className="text-sm font-bold text-gray-700">Total</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method */}
        <div className="card p-4 space-y-3">
          <h3 className="font-semibold text-gray-900">Payment Method</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["Cash", "Transfer", "Credit"] as PaymentType[]).map((type) => (
              <button
                key={type}
                onClick={() => setPaymentType(type)}
                className={cn(
                  "py-3 rounded-xl text-sm font-semibold border-2 transition-all",
                  paymentType === type
                    ? type === "Credit"
                      ? "border-red-500 bg-red-50 text-red-600"
                      : "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Customer (for Credit) */}
        {paymentType === "Credit" && (
          <div className="card p-4 space-y-3 animate-fade-in">
            <h3 className="font-semibold text-gray-900">Select Customer</h3>
            <input
              className="input"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {filteredCustomers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomer(c)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left",
                    selectedCustomer?.id === c.id ? "bg-green-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  {selectedCustomer?.id === c.id && <Check className="w-4 h-4 text-green-600 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={cart.length === 0 || submitting || (paymentType === "Credit" && !selectedCustomer)}
          className="w-full btn-primary py-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Processing..." : `Record Sale · ${formatCurrency(total)}`}
        </button>
      </div>

      {/* Select Pack/Unit Modal */}
      {showPackSelect && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm"
          onClick={() => setShowPackSelect(null)}
        >
          <div 
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="font-bold text-gray-900 truncate pr-4">{showPackSelect.name}</h3>
              <button 
                onClick={() => setShowPackSelect(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4 font-medium text-center">How are you selling this?</p>
            
            <div className="grid grid-cols-2 gap-3 mb-2">
              <button 
                onClick={() => addToCart(showPackSelect, "unit")}
                className="py-6 rounded-2xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-colors flex flex-col items-center gap-1 group"
              >
                 <span className="font-bold text-gray-900 group-hover:text-green-700">{showPackSelect.unit_label || "Unit"}</span>
                 <span className="text-sm text-gray-500 group-hover:text-green-600">{formatCurrency(showPackSelect.sell_price)} each</span>
              </button>

              <button 
                onClick={() => addToCart(showPackSelect, "pack")}
                className="py-6 rounded-2xl border-2 border-gray-100 hover:border-green-500 hover:bg-green-50 transition-colors flex flex-col items-center gap-1 group"
              >
                 <span className="font-bold text-gray-900 group-hover:text-green-700">{showPackSelect.pack_label || "Pack"}</span>
                 <span className="text-sm text-gray-500 group-hover:text-green-600">{formatCurrency(showPackSelect.sell_price_pack || 0)} each</span>
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
