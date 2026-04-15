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
    <footer className="border-t border-white/[0.04] bg-[#060606]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8 mb-14">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center font-bold text-black text-xs">V</div>
              <span className="font-bold text-lg tracking-tight text-white">Velocity</span>
            </Link>
            <p className="text-sm text-gray-600 leading-relaxed max-w-[200px]">
              The cheapest GPUs for AI. Deploy in seconds, pay by the minute.
            </p>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <div className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-medium mb-4">{col.title}</div>
              <div className="space-y-2.5">
                {col.links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block text-sm text-gray-600 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/[0.04] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-700">&copy; {new Date().getFullYear()} Velocity. All rights reserved.</p>
          <div className="flex items-center gap-1 text-[10px] text-gray-700">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
