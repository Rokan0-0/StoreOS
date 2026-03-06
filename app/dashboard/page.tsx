"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Users,
  Plus,
  Package,
  FileText,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { formatCurrency, todayISO, startOfDay, endOfDay } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Sale, Product, Customer } from "@/types";

interface DashboardStats {
  dailyRevenue: number;
  salesCount: number;
  lowStockCount: number;
  totalCredit: number;
  recentSales: Sale[];
  lowStockItems: Product[];
  topDebtors: Array<{ customer: Customer; balance: number }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    dailyRevenue: 0,
    salesCount: 0,
    lowStockCount: 0,
    totalCredit: 0,
    recentSales: [],
    lowStockItems: [],
    topDebtors: [],
  });
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const { business, loading: authLoading } = useAuth();

  useEffect(() => {
    if (business) {
      loadDashboard(business.id);
    }
  }, [selectedDate, business]);

  async function loadDashboard(businessId: string) {
    setLoading(true);
    try {

      // Daily sales
      const dayStart = startOfDay(selectedDate);
      const dayEnd = endOfDay(selectedDate);

      const allSales = await db.sales
        .where("business_id")
        .equals(businessId)
        .toArray();

      const daySales = allSales.filter((s) => {
        const t = new Date(s.created_at ?? "");
        return t >= dayStart && t <= dayEnd;
      });

      const dailyRevenue = daySales
        .filter((s) => s.payment_type !== "Credit")
        .reduce((sum, s) => sum + s.total, 0);

      // Low stock
      const products = await db.products
        .where("business_id")
        .equals(businessId)
        .toArray();
      const lowStockItems = products.filter((p) => p.quantity <= p.threshold);

      // Credit
      const credits = await db.credit_transactions
        .where("business_id")
        .equals(businessId)
        .toArray();
      const customers = await db.customers
        .where("business_id")
        .equals(businessId)
        .toArray();

      let totalCredit = 0;
      const debtorMap: Record<string, number> = {};
      credits.forEach((c) => {
        if (!c.customer_id) return;
        if (c.type === "debit") {
          totalCredit += c.amount;
          debtorMap[c.customer_id] = (debtorMap[c.customer_id] || 0) + c.amount;
        } else {
          debtorMap[c.customer_id] = (debtorMap[c.customer_id] || 0) - c.amount;
          totalCredit -= c.amount;
        }
      });

      const topDebtors = customers
        .filter((c) => (debtorMap[c.id] || 0) > 0)
        .map((c) => ({ customer: c, balance: debtorMap[c.id] || 0 }))
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 3);

      setStats({
        dailyRevenue,
        salesCount: daySales.length,
        lowStockCount: lowStockItems.length,
        totalCredit: Math.max(totalCredit, 0),
        recentSales: daySales.slice(-4).reverse(),
        lowStockItems: lowStockItems.slice(0, 4),
        topDebtors,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const iso = d.toISOString().split("T")[0];
    if (iso <= todayISO()) setSelectedDate(iso);
  }

  const isToday = selectedDate === todayISO();
  const displayDate = isToday
    ? "Today"
    : new Date(selectedDate).toLocaleDateString("en-NG", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

  const statCards = [
    {
      label: "Revenue",
      value: formatCurrency(stats.dailyRevenue),
      icon: TrendingUp,
      color: "text-green-600 bg-green-50",
      sub: `${stats.salesCount} sales`,
    },
    {
      label: "Sales",
      value: stats.salesCount.toString(),
      icon: ShoppingCart,
      color: "text-blue-600 bg-blue-50",
      sub: "transactions",
    },
    {
      label: "Low Stock",
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      color: stats.lowStockCount > 0 ? "text-amber-600 bg-amber-50" : "text-gray-400 bg-gray-50",
      sub: "items need restock",
    },
    {
      label: "Outstanding Credit",
      value: formatCurrency(stats.totalCredit),
      icon: Users,
      color: stats.totalCredit > 0 ? "text-red-600 bg-red-50" : "text-gray-400 bg-gray-50",
      sub: "total owed to you",
    },
  ];

  return (
    <div className="animate-fade-in">
      <Topbar businessName={business?.name} />

      <div className="px-4 lg:px-6 py-5 space-y-6">
        {/* Date Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Business Summary</h2>
            <p className="text-sm text-gray-500 mt-0.5">Your store at a glance</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[80px] text-center">
              {displayDate}
            </span>
            <button
              onClick={() => changeDate(1)}
              disabled={isToday}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-4">
                <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5 leading-tight">
                  {loading || authLoading ? (
                    <span className="block h-6 w-24 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    card.value
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Link href="/dashboard/sales/new" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Record Sale</span>
          </Link>
          <Link href="/dashboard/inventory/add" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Add Stock</span>
          </Link>
          <Link href="/dashboard/statements" className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Statement</span>
          </Link>
        </div>

        {/* Two-column: Recent Sales + Low Stock */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Sales */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Sales</h3>
              <Link href="/dashboard/sales" className="text-xs text-green-600 font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {stats.recentSales.length === 0 ? (
              <div className="text-center py-6">
                <ShoppingCart className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No sales recorded {isToday ? "today" : "on this day"}</p>
                <Link href="/dashboard/sales/new" className="mt-3 inline-block text-xs font-semibold text-green-600 hover:underline">
                  Record your first sale →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.recentSales.map((sale, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {sale.items.map((it) => it.product_name).join(", ")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(sale.created_at ?? "").toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(sale.total)}</p>
                      <span className={`text-xs font-medium ${sale.payment_type === "Credit" ? "text-red-500" : "text-green-600"}`}>
                        {sale.payment_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low Stock */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Low Stock Alerts</h3>
              <Link href="/dashboard/inventory" className="text-xs text-green-600 font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {stats.lowStockItems.length === 0 ? (
              <div className="text-center py-6">
                <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">All stock levels are healthy</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${item.quantity === 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                        {item.quantity} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Debtors */}
        {stats.topDebtors.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Outstanding Credit</h3>
              <Link href="/dashboard/credit" className="text-xs text-green-600 font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {stats.topDebtors.map(({ customer, balance }) => (
                <div key={customer.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                      <span className="text-xs font-bold text-red-600">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{customer.name}</p>
                      <p className="text-xs text-gray-400">{customer.phone}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(balance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
