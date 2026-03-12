"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Download, Plus, Calendar, Share2 } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { formatCurrency, todayISO } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { queueLocalMutation } from "@/lib/sync";
import { v4 as uuidv4 } from "uuid";
import type { Sale, Product, Statement } from "@/types";
import { generateCSV, downloadCSV } from "@/lib/export-csv";

interface DailyData {
  date: string;
  totalSales: number;
  cashReceived: number;
  creditExtended: number;
  salesCount: number;
}

export default function StatementsPage() {
  const { business } = useAuth();
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (business) {
      loadData(business.id);
    }
  }, [business]);

  async function loadData(businessId: string) {
    const allSales = await db.sales.where("business_id").equals(businessId).toArray();

    const byDay: Record<string, Sale[]> = {};
    allSales.forEach((s) => {
      const d = (s.created_at ?? todayISO()).split("T")[0];
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(s);
    });

    const rows: DailyData[] = Object.keys(byDay)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 30)
      .map((date) => {
        const sales = byDay[date];
        const totalSales = sales.reduce((s, x) => s + x.total, 0);
        const cashReceived = sales.filter((x) => x.payment_type !== "Credit").reduce((s, x) => s + x.total, 0);
        const creditExtended = sales.filter((x) => x.payment_type === "Credit").reduce((s, x) => s + x.total, 0);
        return { date, totalSales, cashReceived, creditExtended, salesCount: sales.length };
      });

    setData(rows);
    setLoading(false);
  }

  async function generateDailyStatement(row: DailyData) {
    if (!business) return;
    try {
      setGenerating(true);
      const start = `${row.date}T00:00:00.000Z`;
      const end = `${row.date}T23:59:59.999Z`;

      const daySales = await db.sales
        .where("business_id").equals(business.id)
        .filter(s => !!s.created_at && s.created_at >= start && s.created_at <= end)
        .toArray();

      const csvRows: string[][] = [
        ["Receipt ID", "Time", "Customer", "Items (Qty x Price)", "Total Amount", "Payment Method", "Status"]
      ];

      daySales.forEach(sale => {
        const time = new Date(sale.created_at ?? "").toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
        const itemsList = sale.items.map(i => `${i.product_name} (${i.quantity}x @ ${i.unit_price})`).join(" | ");
        
        csvRows.push([
           sale.id.slice(0, 8).toUpperCase(),
           time,
           sale.customer_name || "Guest",
           itemsList,
           sale.total.toString(),
           sale.payment_type,
           sale.voided ? "VOID" : "OK"
        ]);
      });

      // Footer Summaries
      csvRows.push([]);
      csvRows.push(["SUMMARY"]);
      csvRows.push(["Total Transactions", row.salesCount.toString()]);
      csvRows.push(["Total Revenue", row.totalSales.toString()]);
      csvRows.push(["Cash/Transfer Received", row.cashReceived.toString()]);
      csvRows.push(["Credit Extended", row.creditExtended.toString()]);

      const csvContent = generateCSV(csvRows);
      downloadCSV(csvContent, `Statement-${business.name.replace(/\s+/g, '-')}-${row.date}.csv`);

      const statementId = uuidv4();
      const statementRecord: Statement = {
        id: statementId,
        business_id: business.id,
        period_start: row.date,
        period_end: row.date,
        type: "daily",
        data_json: row,
        created_at: new Date().toISOString(),
      };
      
      await db.statements.add(statementRecord);
      await queueLocalMutation('statements', 'insert', statementId, statementRecord);

    } catch (e) {
      console.error("Failed to generate statement", e);
    } finally {
      setGenerating(false);
    }
  }

  function shareToWhatsApp(row: DailyData) {
    if (!business) return;
    const text = `*${business.name} - Daily Statement*\nDate: ${new Date(row.date).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}\n\n*SUMMARY*\nTotal Transactions: ${row.salesCount}\nTotal Revenue: ${formatCurrency(row.totalSales)}\nCash/Transfer Received: ${formatCurrency(row.cashReceived)}\nCredit Extended: ${formatCurrency(row.creditExtended)}\n\n_Generated via StoreOS_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  return (
    <div className="animate-fade-in">
      <Topbar title="Statements" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Business Statements</h2>
            <p className="text-sm text-gray-500">Auto-generated daily records</p>
          </div>
        </div>

        {/* Banner */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <FileText className="w-8 h-8 shrink-0 opacity-80" />
            <div>
              <p className="font-bold text-lg">Your Statements Are Ready</p>
              <p className="text-sm text-green-100 mt-1">Download formal, bank-ready daily statements from your recorded sales. No manual work needed.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="card p-4 animate-pulse h-20" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="card p-10 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No statements yet</p>
            <p className="text-sm text-gray-400 mt-1">Statements are generated from your sales records.</p>
            <Link href="/dashboard/sales/new" className="mt-4 inline-block btn-primary text-sm">
              Record a Sale
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((row) => (
              <div key={row.date} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {new Date(row.date).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {row.salesCount} sales · Cash: {formatCurrency(row.cashReceived)} · Credit: {formatCurrency(row.creditExtended)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-700">{formatCurrency(row.totalSales)}</p>
                  <div className="flex flex-col items-end gap-1.5 mt-1.5">
                    <button
                      onClick={() => generateDailyStatement(row)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                      disabled={generating}
                    >
                      <Download className="w-3 h-3" /> {generating ? "Exporting..." : "Download CSV"}
                    </button>
                    <button
                      onClick={() => shareToWhatsApp(row)}
                      className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
                    >
                      <Share2 className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
