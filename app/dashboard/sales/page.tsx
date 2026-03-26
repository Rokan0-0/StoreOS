"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Filter, Calendar } from "lucide-react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { formatCurrency, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Sale } from "@/types";
import SaleRow from "@/components/sales/sale-row";

export default function SalesPage() {
  const { business } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Cash" | "Transfer" | "Credit">("All");

  useEffect(() => {
    if (business) {
      loadSales(business.id);
    }
  }, [business]);

  async function loadSales(businessId: string) {
    const all = await db.sales.where("business_id").equals(businessId).toArray();
    setSales(all.sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime()));
    setLoading(false);
  }

  const filtered = filter === "All" ? sales : sales.filter((s) => s.payment_type === filter);
  
  const grouped = filtered.reduce((groups, sale) => {
    if (!sale.created_at) return groups;
    const dateStr = sale.created_at.split("T")[0];
    if (!groups[dateStr]) {
      groups[dateStr] = { date: dateStr, sales: [], total: 0 };
    }
    groups[dateStr].sales.push(sale);
    groups[dateStr].total += sale.total;
    return groups;
  }, {} as Record<string, { date: string; sales: Sale[]; total: number }>);

  const sortedGroups = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));

  function getDateLabel(dateStr: string) {
    const today = new Date().toISOString().split("T")[0];
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = yDate.toISOString().split("T")[0];

    const d = new Date(dateStr);
    const formatted = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    
    if (dateStr === today) return `Today, ${formatted}`;
    if (dateStr === yesterday) return `Yesterday, ${formatted}`;
    return formatted;
  }

  const totalToday = sales
    .filter((s) => s.created_at?.startsWith(new Date().toISOString().split("T")[0]))
    .reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="animate-fade-in">
      <Topbar title="Sales Log" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">All Sales</h2>
            <p className="text-sm text-gray-500">Today: <span className="text-green-600 font-semibold">{formatCurrency(totalToday)}</span></p>
          </div>
          <Link href="/dashboard/sales/new" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Sale
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Cash", "Transfer", "Credit"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                filter === f
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="card p-4 animate-pulse h-20" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-gray-400 font-medium">
              {sales.length === 0 
                ? "No sales recorded today. Head to POS to record your first sale." 
                : "No sales recorded yet"}
            </p>
            <Link href="/dashboard/sales/new" className="mt-3 inline-block btn-primary text-sm">Record a sale</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map((group) => (
              <div key={group.date} className="space-y-2">
                <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-md -mx-4 px-4 py-2 border-y border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">{getDateLabel(group.date)}</span>
                  <span className="text-sm font-semibold text-gray-700">{formatCurrency(group.total)}</span>
                </div>
                <div className="space-y-2">
                  {group.sales.map((sale) => (
                    <SaleRow 
                      key={sale.id} 
                      sale={sale} 
                      onRefresh={() => {
                        if (business) loadSales(business.id);
                      }} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
