import Link from "next/link";
import { ProfitLeakCalculator } from "@/components/profit-leak-calculator";

export const metadata = {
  title: "Renovation Profit Leak Calculator - Free Tool for Contractors",
  description:
    "Find out exactly how much your renovation business is losing to unbilled scope creep, report writing time, invoice follow-up, and missed referrals. Free, 3 minutes, no signup required to see your results.",
  openGraph: {
    title: "How Much Is Your Renovation Business Leaking This Year?",
    description: "8 questions. See your exact dollar leak from scope creep, unbilled extras, missed referrals, and invoice drag. Free tool for renovation contractors.",
    url: "https://www.renotrack360.com/profit-leak",
    siteName: "RenoTrack360",
  },
};

export default function ProfitLeakPage() {
  return (
    <div className="min-h-screen bg-[#183d29]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Nav */}
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-base font-black tracking-tight text-white" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            RenoTrack<span className="text-green-400">360</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-white/50 hover:text-white transition">
            Back to site
          </Link>
        </div>
      </header>

      {/* Calculator */}
      <main className="px-4 py-12 md:py-20">
        <ProfitLeakCalculator />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-6 text-center">
        <p className="text-xs text-white/20">
          RenoTrack360 renovation contractor software. Results are estimates based on industry averages.
          Actual numbers vary by business. This tool does not store your answers unless you submit your email.
        </p>
      </footer>
    </div>
  );
}
