"use client";

import { useState, useMemo, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { startOfDay, endOfDay, todayISO } from "@/lib/utils";
import type { Sale } from "@/types";
import SummaryCards from "@/components/reports/summary-cards";
import PeriodBreakdown from "@/components/reports/period-breakdown";
import ExportSection from "@/components/reports/export-section";
import TopProducts from "@/components/reports/top-products";

type Period = "Daily" | "Weekly" | "Monthly" | "All Time";

export default function ReportsPage() {
  const { business } = useAuth();
  const [period, setPeriod] = useState<Period>("Monthly");
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // For demonstration, let's load all un-voided sales for the business
  // In a real heavy app, we'd query by date range using Dexie
  useEffect(() => {
    async function loadData() {
      if (!business) return;
      setLoading(true);
      const allSales = await db.sales
        .where("business_id")
        .equals(business.id)
        .filter(s => !s.voided)
        .toArray();
      setSales(allSales);
      setLoading(false);
    }
    loadData();
  }, [business]);

  // Aggregate stats based on period.
  // We'll write specific components to handle the complex rendering per PRD.

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 pb-4">
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">Financial overview & statements</p>
          </div>
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value as Period)}
            className="bg-gray-50 border border-gray-200 text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500/20"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="All Time">All Time</option>
          </select>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-green-600 animate-spin" />
          </div>
        ) : sales.length === 0 ? (
          <div className="card p-10 text-center">
             <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
               <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
               </svg>
             </div>
             <p className="text-gray-900 font-bold mb-1">No sales data found</p>
             <p className="text-gray-500 text-sm mb-4">Head to Sales to record transactions</p>
             <a href="/dashboard/sales/new" className="btn-primary text-sm inline-block">Record a Sale →</a>
          </div>
        ) : (
          <>
            {/* Section 1: Summary Cards */}
            <div id="summary-cards">
               <SummaryCards sales={sales} period={period} />
            </div>

            {/* Section 2: Period Breakdown */}
            <div id="period-breakdown">
               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 mt-8">Breakdown</p>
               <PeriodBreakdown sales={sales} period={period} onRefresh={() => {
                 // The hook will auto-reload when needed if we added a load trigger, 
                 // but for now relying on user navigating or simple full refresh
                 if (business) {
                   db.sales.where("business_id").equals(business.id).filter(s => !s.voided).toArray().then(setSales);
                 }
               }} />
            </div>

            {/* Section 3: Export & Statements */}
            <div id="export-statements">
               <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 mt-8">Export & Statements</p>
               <ExportSection sales={sales} />
            </div>

            {/* Section 4: Top Products (Monthly only) */}
            {period === "Monthly" && (
              <div id="top-products">
                 <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 mt-8">Top Products</p>
                 <TopProducts sales={sales} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
