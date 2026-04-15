'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/keys', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch keys');
      const data = await res.json();
      setKeys(data.keys || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create key');
      const data = await res.json();
      setShowNewKey(data.key);
      setNewKeyName('');
      await fetchKeys();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to revoke key');
      await fetchKeys();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-xl font-bold">API Keys</h2>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Use these keys to authenticate with the Velocity CLI and Python SDK. Keys are shown once on creation.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {showNewKey && (
        <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="text-sm font-bold text-primary mb-2">New API Key Created — copy it now, it won't be shown again</div>
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-white bg-black/50 px-3 py-1.5 rounded flex-1 break-all">
              {showNewKey}
            </code>
            <button
              onClick={() => copyToClipboard(showNewKey)}
              className="text-primary hover:text-white transition-colors shrink-0"
              title="Copy"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
          </div>
          <button onClick={() => setShowNewKey(null)} className="text-xs text-gray-500 hover:text-gray-300 mt-2">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g. dev-laptop)"
          className="flex-1 rounded-lg px-3 py-2 bg-black/50 border border-white/10 text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all placeholder:text-gray-600"
          onKeyDown={e => e.key === 'Enter' && createKey()}
        />
        <button
          onClick={createKey}
          disabled={creating || !newKeyName.trim()}
          className="bg-primary hover:bg-primary-dark text-black text-xs font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {creating ? 'Creating...' : 'Generate Key'}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 text-center py-8">Loading keys...</div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8 border border-dashed border-white/10 rounded-lg">
          No API keys yet. Create one above.
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(k => (
            <div key={k.id} className="p-4 border border-white/10 rounded-lg bg-black/50 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{k.name}</span>
                  <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                    {k.permissions?.join(', ') || 'full'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="font-mono">{k.key_prefix}...</span>
                  <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                  {k.last_used_at && <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <button
                onClick={() => revokeKey(k.id)}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors shrink-0"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-400">
        <div className="font-bold mb-1">CLI Quickstart</div>
        <div className="font-mono text-xs">
          $ pip install velocity-infra<br/>
          $ velocity login --api-key vi_live_...
        </div>
      </div>
    </div>
  );
}
