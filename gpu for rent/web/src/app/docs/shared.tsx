import type { ReactNode } from 'react';

export type BadgeKind = 'live' | 'partial' | 'planned';

export function StatusBadge({ kind }: { kind: BadgeKind }) {
  const map: Record<BadgeKind, { label: string; className: string }> = {
    live: {
      label: '✅ Live',
      className: 'border-primary/40 bg-primary/10 text-primary',
    },
    partial: {
      label: '🔧 Partial',
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    },
    planned: {
      label: '📋 Planned',
      className: 'border-white/20 bg-white/5 text-gray-400',
    },
  };
  const { label, className } = map[kind];
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-4 font-mono text-sm text-gray-200">
      <code>{children}</code>
    </pre>
  );
}

export function WarningBox({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div
      role="note"
      className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm leading-relaxed text-amber-100/95 md:px-5 md:py-5"
    >
      {title ? (
        <p className="font-medium text-amber-200">{title}</p>
      ) : null}
      <div className={title ? 'mt-2 space-y-2 text-amber-100/90' : 'space-y-2 text-amber-100/90'}>
        {children}
      </div>
    </div>
  );
}

export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-4 text-sm leading-relaxed text-gray-200 md:px-5 md:py-5"
    >
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function DocTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/10">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.03]">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-gray-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
