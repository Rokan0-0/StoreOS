import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import PwaUpdater from "@/components/layout/PwaUpdater";

export const metadata: Metadata = {
  title: "StoreOS — Business Management for SME Supermarkets",
  description:
    "StoreOS is the operating system for every informal retail business. Track sales, inventory, credit, and generate formal statements to build your financial identity.",
  keywords: ["supermarket", "inventory", "sales", "SME", "Nigeria", "business management"],
  manifest: "/manifest.json",
  themeColor: "#166534",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StoreOS",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster />
        <PwaUpdater />
      </body>
    </html>
  );
}
