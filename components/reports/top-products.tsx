import { useState } from "react";
import type { Sale } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  sales: Sale[];
}

export default function TopProducts({ sales }: Props) {
  // Aggregate sales
  const productStats = sales.reduce((acc, sale) => {
    if (sale.voided) return acc;
    sale.items.forEach(item => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = { name: item.product_name, qty: 0, revenue: 0 };
      }
      acc[item.product_id].qty += item.quantity;
      acc[item.product_id].revenue += item.subtotal;
    });
    return acc;
  }, {} as Record<string, { name: string; qty: number; revenue: number }>);

  const sortedProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  if (sortedProducts.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Top Products</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {sortedProducts.map((p, idx) => (
          <div key={idx} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center text-sm font-bold text-gray-400">{idx + 1}</span>
              <div>
                 <p className="font-semibold text-gray-900">{p.name}</p>
                 <p className="text-xs text-gray-500 mt-0.5">{p.qty} sold</p>
              </div>
            </div>
            <span className="font-bold text-gray-900">{formatCurrency(p.revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
