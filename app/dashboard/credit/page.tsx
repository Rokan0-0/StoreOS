"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, ChevronRight, ArrowLeft } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import type { Customer } from "@/types";

export default function CreditPage() {
  const { business } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (business) {
      loadData(business.id);
    }
  }, [business]);

  async function loadData(businessId: string) {
    const custs = await db.customers.where("business_id").equals(businessId).toArray();
    const credits = await db.credit_transactions.where("business_id").equals(businessId).toArray();

    const balMap: Record<string, number> = {};
    credits.forEach((c) => {
      if (!c.customer_id) return;
      balMap[c.customer_id] = (balMap[c.customer_id] || 0) + (c.type === "debit" ? c.amount : -c.amount);
    });

    setCustomers(custs);
    setBalances(balMap);
    setLoading(false);
  }

  const filtered = customers.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const totalOutstanding = Object.values(balances).reduce((s, b) => s + Math.max(b, 0), 0);

  return (
    <div className="animate-fade-in">
      <Topbar title="Credit Tracker" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Debtors</h2>
            <p className="text-sm text-gray-500">Total owed: <span className="text-red-600 font-semibold">{formatCurrency(totalOutstanding)}</span></p>
          </div>
          <Link href="/dashboard/credit/add-customer" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Customer</span>
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-10" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="card p-4 animate-pulse h-16" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-gray-400 font-medium">No customers found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const balance = Math.max(balances[c.id] || 0, 0);
              return (
                <Link key={c.id} href={`/dashboard/credit/${c.id}`} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-400 to-green-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {balance > 0 ? (
                      <p className="text-sm font-bold text-red-600">{formatCurrency(balance)}</p>
                    ) : (
                      <span className="badge-green text-xs">Cleared</span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
