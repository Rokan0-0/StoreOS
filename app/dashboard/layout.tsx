import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { AuthProvider } from "@/lib/auth-context";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InstallPrompt from "@/components/install-prompt";
import NotificationWatcher from "@/components/notification-watcher";
import HydrationBootstrap from "@/components/HydrationBootstrap";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch business profile
  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    redirect("/onboarding");
  }

  return (
    <AuthProvider user={user} business={business}>
      <HydrationBootstrap businessId={business.id} />
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="lg:ml-60">
          <main className="min-h-screen pb-20 lg:pb-0">{children}</main>
        </div>
        <MobileNav />
        <InstallPrompt />
        <NotificationWatcher />
      </div>
    </AuthProvider>
  );
}
