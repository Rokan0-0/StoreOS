"use client";

import { Landmark, ExternalLink, CheckCircle } from "lucide-react";
import Topbar from "@/components/layout/Topbar";

const LOANS = [
  {
    name: "CBN MSME Development Fund",
    type: "Government Grant",
    amount: "₦500K – ₦5M",
    rate: "9% per annum",
    duration: "Up to 5 years",
    eligibility: ["Registered business", "Basic financial records", "BVN"],
    color: "bg-green-50 border-green-100",
    badge: "badge-green",
  },
  {
    name: "BOI SME Loan Fund",
    type: "Development Finance",
    amount: "₦1M – ₦50M",
    rate: "5% per annum",
    duration: "Up to 7 years",
    eligibility: ["Business must be 2+ years old", "Financial statements", "CAC registration"],
    color: "bg-blue-50 border-blue-100",
    badge: "badge-blue",
  },
  {
    name: "FairMoney Business Loan",
    type: "Fintech Lender",
    amount: "₦50K – ₦5M",
    rate: "3.5% per month",
    duration: "1 – 12 months",
    eligibility: ["Active mobile account", "Sales history", "BVN"],
    color: "bg-purple-50 border-purple-100",
    badge: "badge-blue",
  },
  {
    name: "Moniepoint Business Loan",
    type: "Fintech Lender",
    amount: "₦100K – ₦10M",
    rate: "3% per month",
    duration: "3 – 18 months",
    eligibility: ["Active Moniepoint account", "3+ months history", "Good repayment record"],
    color: "bg-amber-50 border-amber-100",
    badge: "badge-yellow",
  },
  {
    name: "LAPO Microfinance Loan",
    type: "Microfinance Bank",
    amount: "₦30K – ₦2M",
    rate: "Flat 3.5% per month",
    duration: "3 – 12 months",
    eligibility: ["Group or individual", "Basic documentation", "Guarantor"],
    color: "bg-gray-50 border-gray-100",
    badge: "badge-green",
  },
];

export default function FinancePage() {
  return (
    <div className="animate-fade-in">
      <Topbar title="Financial Portal" />
      <div className="px-4 lg:px-6 py-5 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Financial Assistance</h2>
          <p className="text-sm text-gray-500">Loan and grant opportunities matched to your business</p>
        </div>

        {/* Banner */}
        <div className="bg-linear-to-br from-[#0d1117] to-[#1a2332] rounded-2xl p-5 text-white">
          <Landmark className="w-8 h-8 text-green-400 mb-3" />
          <h3 className="font-bold text-lg">Your financial records are ready</h3>
          <p className="text-sm text-gray-300 mt-1">Use your StoreOS statements to apply for business loans and grants. Your daily records are formal proof of business activity.</p>
          <button className="mt-4 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors active:scale-95">
            View My Statements
          </button>
        </div>

        {/* Loan Cards */}
        <div className="space-y-3">
          {LOANS.map((loan) => (
            <div key={loan.name} className={`card p-4 border ${loan.color} space-y-3`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{loan.name}</h3>
                  <span className={`${loan.badge} mt-1`}>{loan.type}</span>
                </div>
                <button className="text-xs text-green-600 flex items-center gap-1 font-medium hover:underline shrink-0 mt-0.5">
                  Apply <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/70 rounded-xl p-2">
                  <p className="text-xs text-gray-400">Amount</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{loan.amount}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-2">
                  <p className="text-xs text-gray-400">Rate</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{loan.rate}</p>
                </div>
                <div className="bg-white/70 rounded-xl p-2">
                  <p className="text-xs text-gray-400">Duration</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{loan.duration}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-600">Requirements:</p>
                {loan.eligibility.map((e) => (
                  <div key={e} className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                    <span className="text-xs text-gray-600">{e}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
