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

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.quantity), subtotal: (i.quantity + 1) * i.unit_price }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id!,
          product_name: product.name,
          quantity: 1,
          unit_price: product.sell_price,
          subtotal: product.sell_price,
        },
      ];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === productId
            ? { ...i, quantity: i.quantity + delta, subtotal: (i.quantity + delta) * i.unit_price }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
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
          const newQty = Math.max((p.quantity || 0) - item.quantity, 0);
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
            {filtered.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-green-50 transition-colors group"
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.quantity} in stock</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(p.sell_price)}</span>
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-3 h-3" />
                  </div>
                </div>
              </button>
            ))}
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
                    <p className="text-sm font-medium text-gray-800">{item.product_name}</p>
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
    </div>
  );
}
