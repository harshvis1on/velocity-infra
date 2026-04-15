'use client'
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalNav({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const isAppRoute = pathname.startsWith('/console') || 
                     pathname.startsWith('/host/dashboard') || 
                     pathname.startsWith('/host/datacenter-apply') || 
                     pathname.startsWith('/settings') || 
                     pathname.startsWith('/billing') || 
                     pathname.startsWith('/onboarding');

  if (isAppRoute) return null;

  return (
    <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-black">V</div>
          <span className="font-bold text-xl tracking-tight">Velocity</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link href="/console" className="hover:text-primary transition-colors">GPUs</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/host" className="hover:text-white transition-colors">Earn</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          {userEmail && (
            <Link href="/invite" className="hover:text-yellow-400 transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
              Invite
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!userEmail ? (
            <>
              <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log in</Link>
              <Link href="/signup" className="bg-primary hover:bg-primary-dark text-black text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                Get Started Free
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden sm:block">{userEmail}</span>
              <form action="/auth/signout" method="post">
                <button className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Sign Out</button>
              </form>
              <Link href="/console" className="bg-primary hover:bg-primary-dark text-black text-sm font-bold py-2 px-4 rounded-lg transition-colors">
                Console
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
