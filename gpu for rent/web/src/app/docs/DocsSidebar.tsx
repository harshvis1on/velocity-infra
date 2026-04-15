'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS: {
  title: string;
  links: { href: string; label: string }[];
}[] = [
  {
    title: 'Getting Started',
    links: [
      { href: '/docs', label: 'Welcome' },
      { href: '/docs/quickstart', label: 'Quickstart' },
    ],
  },
  {
    title: 'GPU Cloud',
    links: [
      { href: '/docs/instances', label: 'Instances' },
      { href: '/docs/instances', label: 'Templates' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'For Providers',
    links: [
      { href: '/docs/hosting', label: 'Become a Provider' },
      { href: '/docs/security', label: 'Verification' },
      { href: '/docs/hosting', label: 'Provider Agent' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { href: '/docs/cli', label: 'CLI Reference' },
      { href: '/docs/sdk', label: 'Python SDK' },
      { href: '/docs/api', label: 'API Overview' },
      { href: '/docs/api-reference', label: 'Interactive API' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { href: '/docs/status', label: 'Production Status' },
      { href: '/docs/security', label: 'Security' },
      { href: '/docs/billing', label: 'Billing & GST' },
    ],
  },
];

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path;
}

function isLinkActive(pathname: string, href: string) {
  const p = normalizePath(pathname);
  const h = normalizePath(href);
  if (h === '/docs') return p === '/docs';
  return p === h;
}

export default function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="relative z-40 flex w-full flex-col border-b border-white/[0.06] bg-[#080808] md:fixed md:left-0 md:top-16 md:h-[calc(100vh-4rem)] md:w-[260px] md:overflow-y-auto md:border-b-0 md:border-r md:border-white/[0.06]"
      aria-label="Documentation navigation"
    >
      <div className="border-b border-white/[0.06] px-5 py-5">
        <Link
          href="/docs"
          className="text-sm font-bold tracking-tight text-white hover:text-primary transition-colors"
        >
          Velocity Docs
        </Link>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to site
        </Link>
      </div>

      <nav className="flex-1 space-y-5 px-3 py-4 pb-10">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-gray-600">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.links.map((link) => {
                const active = isLinkActive(pathname, link.href);
                return (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className={[
                        'block rounded-md px-3 py-1.5 text-sm transition-all',
                        active
                          ? 'bg-primary/[0.08] font-medium text-primary border-l-2 border-primary pl-[10px]'
                          : 'text-gray-500 hover:bg-white/[0.04] hover:text-white border-l-2 border-transparent pl-[10px]',
                      ].join(' ')}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
