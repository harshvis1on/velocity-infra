'use client';

import { useState } from 'react';

export default function SyncProxyButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch('/api/proxy/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setResult(`Synced ${data.synced ?? 0} GPUs from providers`);
      } else {
        setResult(data.error || 'Sync failed');
      }
    } catch {
      setResult('Network error');
    } finally {
      setSyncing(false);
      setTimeout(() => setResult(null), 4000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="text-xs bg-white/[0.04] hover:bg-white/[0.06] border border-white/[0.08] text-[#94A3B8] hover:text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50 font-medium"
      >
        {syncing ? 'Syncing...' : 'Sync Proxy GPUs'}
      </button>
      {result && (
        <span className="text-xs text-primary">{result}</span>
      )}
    </div>
  );
}
