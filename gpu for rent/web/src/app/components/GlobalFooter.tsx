'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalFooter() {
  const pathname = usePathname();
  const isAppRoute = pathname.startsWith('/console') || 
                     pathname.startsWith('/host/dashboard') || 
                     pathname.startsWith('/host/datacenter-apply') || 
                     pathname.startsWith('/settings') || 
                     pathname.startsWith('/billing') || 
                     pathname.startsWith('/onboarding');

  if (isAppRoute) return null;

  return (
    <footer className="border-t border-white/10 bg-[#050505] py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center font-bold text-black text-xs">V</div>
          <span className="font-bold text-lg tracking-tight">Velocity</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <Link href="/console" className="hover:text-white transition-colors">GPUs</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/host" className="hover:text-white transition-colors">Earn</Link>
          <Link href="/invite" className="hover:text-white transition-colors">Invite</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
        <p className="text-gray-600 text-sm">The cheapest GPUs for AI. Period.</p>
      </div>
    </footer>
  );
}
