import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60">
        <main className="min-h-screen pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
