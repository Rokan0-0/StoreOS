import { formatCurrency } from "@/lib/utils";
import type { Sale } from "@/types";

interface Props {
  sales: Sale[];
  period: string; // "Daily" | "Weekly" | "Monthly" | "All Time"
}

export default function SummaryCards({ sales, period }: Props) {
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = sales.length;
  const cashAndTransfer = sales
    .filter((s) => s.payment_type === "Cash" || s.payment_type === "Transfer")
    .reduce((sum, s) => sum + s.total, 0);
  const creditExtended = sales
    .filter((s) => s.payment_type === "Credit")
    .reduce((sum, s) => sum + s.total, 0);

  // Simple trend generation based on period.
  // We'll partition the sales into segments (e.g., 30 days for monthly, 7 days for weekly)
  // For simplicity here without a robust date handling library, we just render fake bars
  // or simple proportional bars based on chronological chunks.
  
  // Real implementation of trend bars: group by day, sort chronologically
  const dailyTotals = sales.reduce((acc, sale) => {
     if (!sale.created_at) return acc;
     const day = sale.created_at.split("T")[0];
     acc[day] = (acc[day] || 0) + sale.total;
     return acc;
  }, {} as Record<string, number>);

  const sortedDays = Object.keys(dailyTotals).sort();
  // Take last N days based on period to represent trend, or all if few
  let trendData = sortedDays.map(d => dailyTotals[d]);
  if (period === "Weekly") trendData = trendData.slice(-7);
  else if (period === "Monthly") trendData = trendData.slice(-30);

  const maxVal = Math.max(...trendData, 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Total Revenue</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Transactions</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{totalTransactions}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Cash + Transfer</p>
          <p className="text-lg font-bold text-green-600 mt-1">{formatCurrency(cashAndTransfer)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Credit</p>
          <p className="text-lg font-bold text-blue-600 mt-1">{formatCurrency(creditExtended)}</p>
        </div>
      </div>

      {trendData.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 font-medium mb-3">Revenue Trend</p>
          <div className="flex items-end justify-between h-16 gap-1">
            {trendData.map((val, i) => {
              const heightPct = (val / maxVal) * 100;
              return (
                <div 
                  key={i} 
                  className="bg-green-100 hover:bg-green-500 transition-colors w-full rounded-t-sm" 
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                  title={formatCurrency(val)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
