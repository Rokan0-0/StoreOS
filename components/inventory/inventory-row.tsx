"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Package, Plus, Edit2, Trash2, Check } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { queueLocalMutation } from "@/lib/sync";
import type { Product } from "@/types";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

interface Props {
  product: Product;
  onUpdate: () => void;
  onDeleteRequest: (id: string) => void;
}

export default function InventoryRow({ product, onUpdate, onDeleteRequest }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [qtyToAdd, setQtyToAdd] = useState("");
  const [supplier, setSupplier] = useState("");
  const [cost, setCost] = useState(product.buy_price.toString());
  const [saving, setSaving] = useState(false);

  const isLow = product.quantity <= product.threshold;
  const isOut = product.quantity === 0;

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseInt(qtyToAdd);
    if (!qty || isNaN(qty)) return;

    setSaving(true);
    try {
      const newTotal = product.quantity + qty;
      const newCost = parseFloat(cost) || product.buy_price;
      
      const payload = { 
        ...product, 
        quantity: newTotal, 
        buy_price: newCost,
        updated_at: new Date().toISOString() 
      };

      await db.products.update(product.id, payload);
      await queueLocalMutation("products", "update", product.id, payload);

      // Log the restock
      const logId = uuidv4();
      const logEntry = {
        id: logId,
        business_id: product.business_id,
        product_id: product.id,
        product_name: product.name,
        quantity_added: qty,
        supplier: supplier || undefined,
        created_at: payload.updated_at,
      };
      await db.restock_logs.add(logEntry);
      
      // We don't urgently sync this offline queue item, it goes up naturally
      await queueLocalMutation("restock_logs", "insert", logId, logEntry);

      setShowRestock(false);
      setQtyToAdd("");
      setSupplier("");
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card overflow-hidden transition-all bg-white border border-gray-100">
      {/* Collapsed Header Area */}
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
      >
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden",
            isOut ? "bg-red-50" : isLow ? "bg-amber-50" : "bg-green-50"
          )}
        >
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
             <Package
              className={cn(
                "w-5 h-5",
                isOut ? "text-red-500" : isLow ? "text-amber-500" : "text-green-600"
              )}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
            {isOut && <span className="badge-red shrink-0">Out of stock</span>}
            {isLow && !isOut && <span className="badge-yellow shrink-0">Low</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                {product.category}
             </span>
             {product.sku && <span className="text-xs text-gray-400">· {product.sku}</span>}
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatCurrency(product.sell_price)}</p>
          <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
            {(() => {
              const uLabel = product.unit_label || 'Units';
              const pLabel = product.pack_label || 'Packs';
              const packs = product.pack_size ? Math.floor(product.quantity / product.pack_size) : null;
              
              if (product.sell_type === 'pack' && packs !== null) {
                return `${packs} ${pLabel}`;
              } else if (product.sell_type === 'both' && packs !== null) {
                return `${product.quantity} ${uLabel} (${packs} ${pLabel})`;
              } else {
                return `${product.quantity} ${uLabel}`;
              }
            })()}
          </p>
        </div>

        <div className="w-6 h-6 flex items-center justify-center text-gray-400 shrink-0">
           {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Details Area */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/30 p-4 animate-fade-in text-sm text-gray-600">
           <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                 <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Pricing</p>
                 <p>Buy: {formatCurrency(product.buy_price)}</p>
                 {(product.sell_type === 'unit' || product.sell_type === 'both') && (
                    <p>Price per {product.unit_label || 'Unit'}: {formatCurrency(product.sell_price)}</p>
                 )}
                 {(product.sell_type === 'pack' || product.sell_type === 'both') && product.sell_price_pack && (
                    <p>Price per {product.pack_label || 'Pack'}: {formatCurrency(product.sell_price_pack)}</p>
                 )}
                 {(product.sell_type === 'pack' || product.sell_type === 'both') && product.pack_size && (
                    <p className="text-xs text-gray-500 mt-1">Pack size: {product.pack_size} {product.unit_label || 'Units'} per {product.pack_label || 'Pack'}</p>
                 )}
              </div>
              <div>
                 <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Stock Value</p>
                 <p className="font-medium text-gray-900">{formatCurrency(product.buy_price * product.quantity)}</p>
                 {product.updated_at && (
                   <p className="text-xs text-gray-400 mt-1">Last seen: {format(new Date(product.updated_at), 'd MMM yyyy')}</p>
                 )}
              </div>
           </div>

           {/* Quick Restock Inline Panel */}
           {showRestock ? (
              <form onSubmit={handleRestock} className="bg-white p-3 rounded-xl border border-green-100 shadow-sm mb-4 animate-fade-in">
                 <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center justify-between">
                    Add Stock
                    <button type="button" onClick={() => setShowRestock(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                 </h4>
                 <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                       <label className="text-xs text-gray-500 mb-1 block">Quantity Added</label>
                       <input autoFocus type="number" required placeholder="0" value={qtyToAdd} onChange={e => setQtyToAdd(e.target.value)} className="input py-2 text-sm" />
                    </div>
                    <div>
                       <label className="text-xs text-gray-500 mb-1 block">New Unit Cost</label>
                       <input type="number" required placeholder="0" value={cost} onChange={e => setCost(e.target.value)} className="input py-2 text-sm" />
                    </div>
                 </div>
                 <div className="mb-3">
                    <label className="text-xs text-gray-500 mb-1 block">Supplier (Optional)</label>
                    <input type="text" placeholder="Who did you buy from?" value={supplier} onChange={e => setSupplier(e.target.value)} className="input py-2 text-sm" />
                 </div>
                 <button disabled={saving} type="submit" className="w-full btn-primary py-2 text-sm flex justify-center text-center">
                    {saving ? "Updating..." : "Confirm Stock"}
                 </button>
              </form>
           ) : (
             <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
               <button onClick={() => setShowRestock(true)} className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 shadow-none border-0">
                 <Plus className="w-3.5 h-3.5" /> Add Stock
               </button>
               {/* Note: I will need to build the dedicated edit page in a second. */}
               <Link href={`/dashboard/inventory/${product.id}/edit`} className="flex-1 btn-secondary py-2 text-xs flex items-center justify-center gap-1.5">
                 <Edit2 className="w-3.5 h-3.5" /> Edit Full Details
               </Link>
               <button onClick={() => onDeleteRequest(product.id)} className="w-10 h-10 border border-red-100 text-red-500 flex items-center justify-center rounded-xl hover:bg-red-50 transition-colors">
                 <Trash2 className="w-4 h-4" />
               </button>
             </div>
           )}
        </div>
      )}
    </div>
  );
}
