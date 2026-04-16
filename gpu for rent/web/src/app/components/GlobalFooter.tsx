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

  const cols = [
    {
      title: 'Product',
      links: [
        { href: '/console', label: 'GPU Marketplace' },
        { href: '/pricing', label: 'Pricing' },
        { href: '/host', label: 'Earn with GPUs' },
        { href: '/docs/serverless', label: 'Serverless' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { href: '/docs', label: 'Documentation' },
        { href: '/docs/quickstart', label: 'Quickstart' },
        { href: '/docs/api-reference', label: 'API Reference' },
        { href: '/docs/status', label: 'Status' },
      ],
    },
    {
      title: 'Company',
      links: [
        { href: '/terms', label: 'Terms of Service' },
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/docs/security', label: 'Security' },
        { href: '/invite', label: 'Referral Program' },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/[0.04] bg-[#080D16]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-14">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center font-bold text-white text-xs shadow-glow-sm">V</div>
              <span className="font-heading font-bold text-lg tracking-tight text-white">Velocity</span>
            </Link>
            <p className="text-sm text-[#475569] leading-relaxed max-w-[200px]">
              The cheapest GPUs for AI. Deploy in seconds, pay by the minute.
            </p>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#475569] font-semibold mb-4">{col.title}</div>
              <div className="space-y-2.5">
                {col.links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-[#64748B] hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#334155]">&copy; {new Date().getFullYear()} Velocity. All rights reserved.</p>
          <div className="flex items-center gap-1.5 text-[10px] text-[#334155]">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
