"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart,
  Landmark,
  Settings,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
  { icon: ShoppingCart, label: "Sales", href: "/dashboard/sales" },
  { icon: BarChart, label: "Reports", href: "/dashboard/reports" },
  { icon: Users, label: "Credit", href: "/dashboard/credit" },
  { icon: Landmark, label: "Finance", href: "/dashboard/finance" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#0d1117] fixed left-0 top-0 bottom-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-6 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
          <Store className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">
          StoreOS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-green-500/15 text-green-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
              )}
            >
              <Icon
                className={cn(
                  "w-4.5 h-4.5 flex-shrink-0",
                  active ? "text-green-400" : "",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5">
        <p className="text-xs text-gray-600">University Tech Hub</p>
        <p className="text-xs text-gray-700 mt-0.5">StoreOS v1.0</p>
      </div>
    </aside>
  );
}
