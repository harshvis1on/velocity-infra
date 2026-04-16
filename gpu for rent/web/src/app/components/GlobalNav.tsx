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

  const isActive = (path: string) => pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <nav className="border-b border-white/[0.06] bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center font-bold text-white text-xs shadow-glow-sm">V</div>
          <span className="font-heading font-bold text-lg tracking-tight text-white">Velocity</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {[
            { href: '/console', label: 'GPUs' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/host', label: 'Earn' },
            { href: '/docs', label: 'Docs' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'text-white bg-white/[0.06]'
                  : 'text-[#64748B] hover:text-[#E2E8F0]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {userEmail && (
            <Link
              href="/invite"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive('/invite') ? 'text-amber-400 bg-amber-400/[0.06]' : 'text-[#64748B] hover:text-amber-400'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
              Invite
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!userEmail ? (
            <>
              <Link href="/login" className="text-sm font-medium text-[#64748B] hover:text-white transition-colors">Log in</Link>
              <Link href="/signup" className="bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow text-white text-sm font-semibold py-2 px-5 rounded-lg transition-all active:scale-[0.97]">
                Get Started Free
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#475569] hidden sm:block">{userEmail}</span>
              <form action="/auth/signout" method="post">
                <button className="text-sm font-medium text-[#64748B] hover:text-white transition-colors">Sign Out</button>
              </form>
              <Link href="/console" className="bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow text-white text-sm font-semibold py-2 px-5 rounded-lg transition-all active:scale-[0.97]">
                Console
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
