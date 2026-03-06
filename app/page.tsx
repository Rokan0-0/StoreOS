import Link from "next/link";
import {
  TrendingUp,
  Package,
  CreditCard,
  FileText,
  Landmark,
  ArrowRight,
  CheckCircle,
  Store,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Live Sales Dashboard",
    desc: "See your daily revenue, sales count, and business pulse in real time.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    desc: "Track every product, get low-stock alerts, and never run out unexpectedly.",
  },
  {
    icon: CreditCard,
    title: "Credit Tracker",
    desc: "Know exactly who owes you what. Send WhatsApp reminders in one tap.",
  },
  {
    icon: FileText,
    title: "Auto Statements",
    desc: "Formal daily and monthly statements generated automatically from your records.",
  },
  {
    icon: Landmark,
    title: "Financial Portal",
    desc: "Use your statements to apply for loans and grants — we handle the paperwork.",
  },
  {
    icon: Zap,
    title: "Works Offline",
    desc: "No internet? No problem. StoreOS works fully offline and syncs when connected.",
  },
];

const steps = [
  "Sign up — it takes under 2 minutes",
  "Set up your business profile",
  "Add your products",
  "Record your first sale — and watch the magic happen",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">StoreOS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
            Demo
          </Link>
          <Link
            href="/dashboard"
            className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 text-xs font-semibold px-4 py-2 rounded-full border border-green-500/20 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Built for Nigerian SME retailers
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
          Stop using a notebook.
          <br />
          <span className="text-green-400">Run your store smarter.</span>
        </h1>
        <p className="text-gray-400 text-lg mt-6 max-w-2xl mx-auto leading-relaxed">
          StoreOS replaces the biro-and-book with a clean, fast, and intelligent platform for managing sales, inventory, credit, and finances — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-2xl text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            Start for Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
          >
            View Demo
          </Link>
        </div>
      </section>

      {/* Dashboard Preview Card */}
      <section className="px-6 max-w-5xl mx-auto mb-24">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border border-white/5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Today's Revenue", value: "₦142,500", delta: "+12%", color: "text-green-400" },
              { label: "Sales Today", value: "38", delta: "transactions", color: "text-blue-400" },
              { label: "Low Stock", value: "3", delta: "items", color: "text-amber-400" },
              { label: "Credit Owed", value: "₦25,000", delta: "3 debtors", color: "text-red-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-2xl p-4">
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{stat.delta}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 text-center">Your live business dashboard</p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 max-w-6xl mx-auto mb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold">Everything you need. Nothing you don&apos;t.</h2>
          <p className="text-gray-400 mt-3">Six powerful modules built for how Nigerian supermarkets actually operate.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white/3 hover:bg-white/5 rounded-2xl p-5 border border-white/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="font-bold text-white text-sm mb-1">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 max-w-2xl mx-auto mb-24 text-center">
        <h2 className="text-3xl font-extrabold mb-10">Up and running in under 5 minutes</h2>
        <div className="space-y-4 text-left">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center flex-shrink-0 text-green-400 text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-gray-300 text-sm">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 max-w-2xl mx-auto mb-24 text-center">
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-10">
          <h2 className="text-2xl font-extrabold mb-3">Your store deserves better than a notebook.</h2>
          <p className="text-green-100 text-sm mb-6">Join store owners already using StoreOS to run cleaner, smarter businesses.</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-8 py-4 rounded-2xl text-sm transition-all hover:bg-green-50 active:scale-95"
          >
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center">
            <Store className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm">StoreOS</span>
        </div>
        <p className="text-xs text-gray-600">Built by University Tech Hub · StoreOS v1.0</p>
      </footer>
    </div>
  );
}
