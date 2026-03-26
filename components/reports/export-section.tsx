"use client";

import { useState } from "react";
import { Download, Share2, Calendar } from "lucide-react";
import type { Sale } from "@/types";
import { formatCurrency, shareViaWhatsApp } from "@/lib/utils";

interface Props {
  sales: Sale[];
}

export default function ExportSection({ sales }: Props) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleExportCSV = () => {
     if (!startDate || !endDate) {
       alert("Please select a valid date range.");
       return;
     }
     const start = new Date(startDate);
     start.setHours(0,0,0,0);
     const end = new Date(endDate);
     end.setHours(23,59,59,999);

     const rangeSales = sales.filter(s => {
       if (!s.created_at) return false;
       const d = new Date(s.created_at);
       return d >= start && d <= end;
     });

     if (rangeSales.length === 0) {
       alert("No sales found for this period.");
       return;
     }

     const header = "Receipt ID,Date,Time,Total,Payment Type,Customer,Voided\n";
     const rows = rangeSales.map(s => {
       const dateObj = new Date(s.created_at ?? "");
       const dateStr = dateObj.toLocaleDateString("en-GB");
       const timeStr = dateObj.toLocaleTimeString("en-GB");
       return `${s.id},${dateStr},${timeStr},${s.total},${s.payment_type},${s.customer_name || ""},${s.voided ? 'Yes' : 'No'}`;
     });

     const csvContent = "data:text/csv;charset=utf-8," + header + rows.join("\n");
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `storeos_sales_${startDate}_to_${endDate}.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  const handleShareSummary = async () => {
    const totalRev = sales.reduce((sum, s) => sum + s.total, 0);
    const text = `
*Financial Summary*
Transactions: ${sales.length}
Total Revenue: ${formatCurrency(totalRev)}

Generated from StoreOS
    `.trim();
    await shareViaWhatsApp(text);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      
      <button 
        onClick={() => {
          // Export this month's CSV immediately
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          setStartDate(firstDay.toISOString().split("T")[0]);
          setEndDate(now.toISOString().split("T")[0]);
          // Require manual click again, or trigger programmatically. 
          // (Simulating click for brevity)
          setTimeout(handleExportCSV, 100);
        }}
        className="w-full btn-secondary text-sm flex items-center justify-center gap-2 py-3"
      >
        <Download className="w-4 h-4" /> Download this month's CSV
      </button>

      <div className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Custom Date Range</p>
        <div className="flex items-center gap-2">
           <input 
             type="date" 
             value={startDate}
             onChange={(e) => setStartDate(e.target.value)}
             className="flex-1 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-green-500"
           />
           <span className="text-gray-400">to</span>
           <input 
             type="date" 
             value={endDate}
             onChange={(e) => setEndDate(e.target.value)}
             className="flex-1 border border-gray-200 rounded-lg p-2 text-sm outline-none focus:border-green-500"
           />
        </div>
        <button 
          onClick={handleExportCSV}
          className="w-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-lg py-2 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <button 
        onClick={handleShareSummary}
        className="w-full bg-green-50 text-green-700 text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-100 transition-colors"
      >
        <Share2 className="w-4 h-4" /> Share summary via WhatsApp
      </button>

    </div>
  );
}
