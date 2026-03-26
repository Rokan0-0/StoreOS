import { useState } from "react";
import { formatCurrency, cn, shareViaWhatsApp } from "@/lib/utils";
import type { Sale } from "@/types";
import { ChevronRight, ChevronDown, Download, Share2 } from "lucide-react";
import SaleRow from "@/components/sales/sale-row";

interface Props {
  sales: Sale[];
  period: "Daily" | "Weekly" | "Monthly" | "All Time";
  onRefresh: () => void;
}

export default function PeriodBreakdown({ sales, period, onRefresh }: Props) {
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // A very simplified grouping logic to demonstrate the UX required in the PRD.
  // In reality, this requires heavy date-math (e.g. date-fns) to chunk weeks properly.
  
  const groupedByDay = sales.reduce((acc, sale) => {
    if (!sale.created_at) return acc;
    const day = sale.created_at.split("T")[0];
    if (!acc[day]) acc[day] = { date: day, total: 0, sales: [] };
    acc[day].total += sale.total;
    acc[day].sales.push(sale);
    return acc;
  }, {} as Record<string, { date: string; total: number; sales: Sale[] }>);

  const days = Object.values(groupedByDay).sort((a, b) => b.date.localeCompare(a.date));

  function exportDayCSV(day: string, daySales: Sale[]) {
    const header = "Receipt ID,Date,Time,Total,Payment Type,Customer,Voided\n";
    const rows = daySales.map(s => {
      const time = new Date(s.created_at ?? "").toLocaleTimeString("en-GB");
      return `${s.id},${day},${time},${s.total},${s.payment_type},${s.customer_name || ""},${s.voided ? 'Yes' : 'No'}`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + header + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `storeos_sales_${day}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-3">
      {period !== "Daily" && (
         <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-sm mb-4 border border-blue-100">
           Note: Showing daily breakdown view for simplicity. Grouping heavily relies on date context.
         </div>
      )}

      {days.map(dayGroup => (
        <div key={dayGroup.date} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
           <button 
             onClick={() => setSelectedDay(selectedDay === dayGroup.date ? null : dayGroup.date)}
             className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
           >
             <div className="text-left">
               <p className="font-semibold text-gray-900">
                 {new Date(dayGroup.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
               </p>
               <p className="text-xs text-gray-500 mt-0.5">{dayGroup.sales.length} transactions</p>
             </div>
             <div className="flex items-center gap-3">
               <span className="font-bold text-gray-900">{formatCurrency(dayGroup.total)}</span>
               {selectedDay === dayGroup.date ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
             </div>
           </button>

           {selectedDay === dayGroup.date && (
             <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-4">
                <div className="flex gap-2">
                  <button 
                    onClick={() => exportDayCSV(dayGroup.date, dayGroup.sales)}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button 
                    onClick={() => {
                      const text = `Sales Summary for ${dayGroup.date}:\nTotal: ${formatCurrency(dayGroup.total)}\nTransactions: ${dayGroup.sales.length}`;
                      shareViaWhatsApp(text);
                    }}
                    className="flex-1 bg-green-50 text-green-700 py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-green-100"
                  >
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
                
                <div className="space-y-2">
                  {dayGroup.sales.map(sale => (
                    <SaleRow key={sale.id} sale={sale} onRefresh={onRefresh} />
                  ))}
                </div>
             </div>
           )}
        </div>
      ))}
    </div>
  );
}
