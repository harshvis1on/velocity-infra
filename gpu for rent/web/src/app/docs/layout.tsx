import type { Metadata } from 'next';
import DocsSidebar from './DocsSidebar';

export const metadata: Metadata = {
  title: 'Documentation | Velocity',
  description:
    'Velocity documentation — the cheapest GPUs for AI. Quickstart, instances, templates, CLI, SDK, API, provider setup, and platform guides.',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#050505] text-white">
      <DocsSidebar />
      <div className="md:pl-[260px]">
        <main className="mx-auto w-full max-w-[850px] px-6 py-10 md:px-8 md:py-12 lg:py-14">
          {children}
        </main>
      </div>
    </div>
  );
}
