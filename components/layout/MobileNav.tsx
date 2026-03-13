"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MoreHorizontal,
  FileText,
  Landmark,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { icon: LayoutDashboard, label: "Home",      href: "/dashboard" },
  { icon: Package,         label: "Inventory", href: "/dashboard/inventory" },
  { icon: ShoppingCart,    label: "Sales",     href: "/dashboard/sales" },
  { icon: Users,           label: "Credit",    href: "/dashboard/credit" },
];

const MORE_ITEMS = [
  { icon: FileText,  label: "Statements",   href: "/dashboard/statements" },
  { icon: Landmark,  label: "Finance",      href: "/dashboard/finance" },
  { icon: Settings,  label: "Settings",     href: "/dashboard/settings" },
];

const MORE_ROUTES = MORE_ITEMS.map((i) => i.href);

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the sheet whenever navigation happens
  useEffect(() => { setOpen(false); }, [pathname]);

  // Drag-to-dismiss state
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
  }
  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && sheetRef.current) {
      currentY.current = delta;
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  }
  function onTouchEnd() {
    if (currentY.current > 100) {
      setOpen(false);
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
  }

  const moreActive = MORE_ROUTES.some((r) => pathname.startsWith(r));

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30">
        <div className="flex items-center justify-around px-1 py-1.5 pb-safe">
          {PRIMARY_NAV.map(({ icon: Icon, label, href }) => {
            const active =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-150",
                  active ? "text-green-600" : "text-gray-400"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* More tab */}
          <button
            onClick={() => setOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl transition-all duration-150",
              moreActive || open ? "text-green-600" : "text-gray-400"
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          "lg:hidden fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-[24px] shadow-2xl transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-base">More</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sheet rows */}
        <div className="px-4 py-3 space-y-1 pb-safe pb-8">
          {MORE_ITEMS.map(({ icon: Icon, label, href }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-150 w-full",
                  active
                    ? "bg-green-50 text-green-700"
                    : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                )}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center",
                    active ? "bg-green-100" : "bg-gray-100"
                  )}
                >
                  <Icon className={cn("w-4.5 h-4.5", active ? "text-green-600" : "text-gray-500")} />
                </div>
                <span className="font-medium text-sm flex-1">{label}</span>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
