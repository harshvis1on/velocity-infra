'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { Plus, Activity, Server, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ServerlessPage() {
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchEndpoints();
  }, []);

  async function fetchEndpoints() {
    try {
      const response = await fetch('/api/serverless/endpoints');
      if (response.ok) {
        const data = await response.json();
        setEndpoints(data);
      }
    } catch (error) {
      console.error('Failed to fetch endpoints:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateEndpoint(e: React.FormEvent) {
    e.preventDefault();
    if (!newEndpointName.trim()) return;

    setIsCreating(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/serverless/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newEndpointName }),
      });

      if (response.ok) {
        const newEndpoint = await response.json();
        router.push(`/console/serverless/${newEndpoint.id}`);
      } else {
        const error = await response.json();
        setErrorMsg(error.error || 'Failed to create endpoint');
      }
    } catch (error) {
      console.error('Error creating endpoint:', error);
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setIsCreating(false);
      setNewEndpointName('');
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Serverless Endpoints</h1>
          <p className="text-[#94A3B8]">Deploy auto-scaling APIs for your AI models.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-1 md:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/[0.06]">
            <h3 className="text-xl font-semibold text-white">Your Endpoints</h3>
            <p className="text-sm text-[#94A3B8] mt-1">Manage your active serverless deployments</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded"></div>
                  <div className="h-4 bg-white/10 rounded w-5/6"></div>
                </div>
              </div>
            ) : endpoints.length === 0 ? (
              <div className="text-center py-8 text-[#94A3B8]">
                <Server className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium text-white">No endpoints yet</p>
                <p className="text-sm mt-2">Create your first endpoint to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {endpoints.map((endpoint) => (
                  <Link href={`/console/serverless/${endpoint.id}`} key={endpoint.id}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-white/[0.06] hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer group">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${endpoint.status === 'active' ? 'bg-primary/[0.15] text-primary' : 'bg-white/10 text-[#94A3B8]'}`}>
                          <Activity className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{endpoint.name}</h3>
                          <p className="text-sm text-[#94A3B8]">
                            {endpoint.status.charAt(0).toUpperCase() + endpoint.status.slice(1)} · Max {endpoint.max_workers} workers
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[#64748B] group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/[0.06]">
            <h3 className="text-xl font-semibold text-white">Create Endpoint</h3>
            <p className="text-sm text-[#94A3B8] mt-1">Set up a new auto-scaling API</p>
          </div>
          <div className="p-6">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleCreateEndpoint} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#E2E8F0]">Endpoint Name</label>
                <input 
                  type="text"
                  placeholder="e.g., prod-llama-3-8b" 
                  value={newEndpointName}
                  onChange={(e) => setNewEndpointName(e.target.value)}
                  className="flex h-10 w-full rounded-xl border px-3 py-2 text-sm placeholder:text-[#475569] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white/[0.03] border-white/[0.08] text-white"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors h-10 px-4 py-2 w-full bg-gradient-to-r from-primary-dark to-primary text-white disabled:opacity-50"
                disabled={isCreating || !newEndpointName.trim()}
              >
                {isCreating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" /> Create Endpoint
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
