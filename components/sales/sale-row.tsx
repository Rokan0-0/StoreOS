"use client";

import { useState } from "react";
import { formatCurrency, cn, shareViaWhatsApp } from "@/lib/utils";
import type { Sale } from "@/types";
import { ChevronRight, Share2, Ban, X } from "lucide-react";
import { db } from "@/lib/db";
import { queueLocalMutation } from "@/lib/sync";

interface Props {
  sale: Sale;
  onRefresh: () => void;
}

export default function SaleRow({ sale, onRefresh }: Props) {
  const [showReceipt, setShowReceipt] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  const isVoided = sale.voided;

  async function handleVoid() {
    if (!confirm("Void this sale? Inventory will be restored and any credit will be reversed.")) return;
    
    setIsVoiding(true);
    try {
      // 1. Mark sale as voided
      const updatedSale = { ...sale, voided: true };
      await db.sales.update(sale.id, updatedSale);
      await queueLocalMutation("sales", "update", sale.id, updatedSale);

      // 2. Restore inventory quantities
      for (const item of sale.items) {
        const p = await db.products.get(item.product_id);
        if (p) {
          const restoredQty = (p.quantity || 0) + item.quantity;
          await db.products.update(p.id, { quantity: restoredQty });
          await queueLocalMutation("products", "update", p.id, { ...p, quantity: restoredQty });
        }
      }

      // 3. Reverse credit transaction if it was a credit sale
      if (sale.payment_type === "Credit" && sale.customer_id) {
         // Create a reversing credit transaction (payment)
         const creditTxId = crypto.randomUUID();
         const reversalLog = {
            id: creditTxId,
            business_id: sale.business_id,
            customer_id: sale.customer_id,
            amount: sale.total,
            type: "credit" as "credit",
            sale_id: sale.id, // linked to the original sale
            created_at: new Date().toISOString(),
         };
         await db.credit_transactions.add(reversalLog);
         await queueLocalMutation("credit_transactions", "insert", creditTxId, reversalLog);
      }

      setShowReceipt(false);
      onRefresh();
    } catch (err) {
      console.error("Void Error:", err);
      alert("Failed to void sale");
    } finally {
      setIsVoiding(false);
    }
  }

  async function handleShare() {
    const text = `
*Receipt #${sale.id.slice(0, 5).toUpperCase()}*
${new Date(sale.created_at ?? "").toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}

*Items Sold*
${sale.items.map(i => `${i.product_name} x${i.quantity} ${i.sell_label || ''} = ${formatCurrency(i.subtotal)}`).join("\n")}

*Total:* ${formatCurrency(sale.total)}
Payment: ${sale.payment_type}
${sale.customer_name ? `Customer: ${sale.customer_name}` : ""}

Thank you for your patronage!
    `.trim();

    await shareViaWhatsApp(text);
  }

  return (
    <>
      {/* Row */}
      <div 
        onClick={() => setShowReceipt(true)}
        className={cn(
          "card p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors",
          isVoided && "opacity-60"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
          isVoided ? "bg-gray-100 text-gray-500" :
          sale.payment_type === "Cash" ? "bg-green-50 text-green-700" :
          sale.payment_type === "Transfer" ? "bg-blue-50 text-blue-700" :
          "bg-amber-50 text-amber-700"
        )}>
          {sale.payment_type.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-semibold truncate", isVoided ? "text-gray-500 line-through" : "text-gray-900")}>
            {sale.items.length === 1 ? sale.items[0].product_name : `${sale.items.length} items`}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span>{new Date(sale.created_at ?? "").toLocaleString("en-NG", { hour: "numeric", minute: "2-digit" })}</span>
            {sale.customer_name && <span>· {sale.customer_name}</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-2">
            <p className={cn("text-sm font-bold", isVoided ? "text-gray-500 line-through" : "text-gray-900")}>
               {formatCurrency(sale.total)}
            </p>
            {isVoided && <span className="text-[10px] font-bold tracking-wide uppercase bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-sm">Voided</span>}
          </div>
          <p className="text-xs font-medium text-gray-400 mt-0.5">{sale.payment_type}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      </div>

      {/* Modal Backdrop & Content */}
      {showReceipt && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm"
          onClick={() => setShowReceipt(false)}
        >
          <div 
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col animate-slide-up shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 className="font-bold text-gray-900">Receipt Details</h3>
              <button 
                onClick={() => setShowReceipt(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="p-6 overflow-y-auto space-y-6">
               <div className="text-center space-y-1">
                 <p className="text-xs text-gray-500 font-mono tracking-wider">RECEIPT #{sale.id.slice(0, 5).toUpperCase()}</p>
                 <p className="text-[10px] text-gray-400 font-mono uppercase">
                   {new Date(sale.created_at ?? "").toLocaleString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                 </p>
               </div>

               <div className="border-t border-b border-gray-100 py-4 font-mono text-sm space-y-3">
                 <span className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1">Items Sold</span>
                 {sale.items.map((item, idx) => (
                   <div key={idx} className="flex items-start justify-between">
                     <div className="flex-1 pr-4">
                       <span className="font-semibold text-gray-900">{item.product_name}</span>
                       <span className="text-gray-500 block text-xs mt-0.5">x{item.quantity} {item.sell_label || ''} @ {formatCurrency(item.unit_price)}</span>
                     </div>
                     <span className="font-medium text-gray-900">{formatCurrency(item.subtotal)}</span>
                   </div>
                 ))}
               </div>

               <div className="space-y-2">
                 <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                   <span className="font-bold text-gray-700">Total</span>
                   <span className="text-xl font-bold text-gray-900">{formatCurrency(sale.total)}</span>
                 </div>
                 
                 <div className="bg-gray-50/50 p-3 rounded-xl space-y-2 text-sm">
                   <div className="flex justify-between">
                     <span className="text-gray-500">Payment Method</span>
                     <span className="font-semibold text-gray-900">{sale.payment_type}</span>
                   </div>
                   {sale.customer_name && (
                     <div className="flex justify-between">
                       <span className="text-gray-500">Customer</span>
                       <span className="font-semibold text-gray-900">{sale.customer_name}</span>
                     </div>
                   )}
                 </div>
               </div>
            </div>

            {/* Modal Sticky Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 pb-safe sm:rounded-b-2xl">
               <button 
                 onClick={handleShare}
                 className="flex-1 btn-primary py-3 text-sm flex items-center justify-center gap-2"
               >
                 <Share2 className="w-4 h-4" /> Share via WhatsApp
               </button>
               {!isVoided && (
                 <button 
                   onClick={handleVoid}
                   disabled={isVoiding}
                   className="btn-secondary px-6 py-3 text-sm flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-100"
                   title="Voiding a sale restores inventory and reverses credit"
                 >
                   <Ban className="w-4 h-4" /> {isVoiding ? "..." : "Void"}
                 </button>
               )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
