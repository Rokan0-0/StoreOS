import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoreOS — Business Management for SME Supermarkets",
  description:
    "StoreOS is the operating system for every informal retail business. Track sales, inventory, credit, and generate formal statements to build your financial identity.",
  keywords: ["supermarket", "inventory", "sales", "SME", "Nigeria", "business management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
