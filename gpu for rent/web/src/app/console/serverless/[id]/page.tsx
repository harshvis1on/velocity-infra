'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Activity, Server, ArrowLeft, Settings, Play, Trash2, Cpu, HardDrive, Network } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function EndpointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [endpoint, setEndpoint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<any[]>([]);
  const [testPayload, setTestPayload] = useState('{"prompt": "Hello, world!"}');
  const [testResult, setTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchEndpointDetails();
    fetchApiKey();
    
    const channel = supabase
      .channel('workers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workers',
        },
        () => {
          fetchEndpointDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.id]);

  async function fetchApiKey() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setApiKey(session.access_token);
    }
  }

  async function fetchEndpointDetails() {
    try {
      const response = await fetch(`/api/serverless/endpoints/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEndpoint(data);
        
        if (data.workergroups && data.workergroups.length > 0) {
          const { data: workersData } = await supabase
            .from('workers')
            .select('*')
            .eq('workergroup_id', data.workergroups[0].id)
            .order('created_at', { ascending: false });
            
          if (workersData) {
            setWorkers(workersData);
          }
        }
      } else {
        router.push('/console/serverless');
      }
    } catch (error) {
      console.error('Failed to fetch endpoint details:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setActionError(null);
    try {
      const response = await fetch(`/api/serverless/endpoints/${params.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/console/serverless');
      } else {
        const error = await response.json();
        setActionError(error.error || 'Failed to delete endpoint');
        setDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting endpoint:', error);
      setActionError('Something went wrong. Please try again.');
      setDeleteConfirm(false);
    }
  }

  async function handleTest() {
    setIsTesting(true);
    setTestResult('Routing request...');
    
    try {
      let payloadObj;
      try {
        payloadObj = JSON.parse(testPayload);
      } catch {
        setTestResult('Invalid JSON payload');
        setIsTesting(false);
        return;
      }

      const routeResponse = await fetch(`/api/serverless/endpoints/${params.id}/route`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (routeResponse.status === 202) {
        setTestResult('Request queued. No workers currently available. The autoscaler will provision one shortly.');
        setIsTesting(false);
        return;
      }
      
      if (!routeResponse.ok) {
        const error = await routeResponse.json();
        setTestResult(`Routing failed: ${error.error || routeResponse.statusText}`);
        setIsTesting(false);
        return;
      }
      
      const routeData = await routeResponse.json();
      setTestResult(`Routed to worker: ${routeData.worker_url}\nSending request...`);
      
      const workerResponse = await fetch(`${routeData.worker_url}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          auth_data: routeData.auth_data,
          payload: payloadObj
        })
      });
      
      if (workerResponse.ok) {
        const result = await workerResponse.json();
        setTestResult(JSON.stringify(result, null, 2));
      } else {
        const errorText = await workerResponse.text();
        setTestResult(`Worker error (${workerResponse.status}): ${errorText}`);
      }
      
    } catch (error: any) {
      setTestResult(`Error: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading endpoint details...</div>;
  }

  if (!endpoint) return null;

  const hasWorkerGroup = endpoint.workergroups && endpoint.workergroups.length > 0;
  const activeWorkers = workers.filter(w => w.state === 'active').length;
  const totalLoad = workers.reduce((sum, w) => sum + (w.current_load || 0), 0);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center text-sm text-gray-400">
        <Link href="/console/serverless" className="hover:text-white flex items-center transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Endpoints
        </Link>
      </div>

      {actionError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {actionError}
        </div>
      )}

      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold">{endpoint.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              endpoint.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
              'bg-white/10 text-gray-400 border border-white/10'
            }`}>
              {endpoint.status.toUpperCase()}
            </span>
          </div>
          <p className="text-gray-400 font-mono text-sm">ID: {endpoint.id}</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors h-10 px-4 py-2 border border-white/10 hover:bg-white/5 text-white">
            <Settings className="h-4 w-4 mr-2" /> Configure
          </button>
          <button
            onClick={handleDelete}
            onBlur={() => setDeleteConfirm(false)}
            className={`inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors h-10 px-4 py-2 ${
              deleteConfirm
                ? 'bg-red-600 hover:bg-red-700 text-white border border-red-600'
                : 'bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800'
            }`}
          >
            <Trash2 className="h-4 w-4 mr-2" /> {deleteConfirm ? 'Click again to confirm' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Active Workers</h3>
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{activeWorkers}</span>
            <span className="text-sm text-gray-500">/ {endpoint.max_workers} max</span>
          </div>
        </div>
        
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Total Load</h3>
            <Activity className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{totalLoad.toFixed(1)}</span>
            <span className="text-sm text-gray-500">reqs/sec</span>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Target Util</h3>
            <Cpu className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{(endpoint.target_util * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Avg Queue Time</h3>
            <Network className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">
              {workers.length > 0 
                ? (workers.reduce((sum, w) => sum + (w.queue_time || 0), 0) / workers.length).toFixed(2) 
                : '0.00'}
            </span>
            <span className="text-sm text-gray-500">sec</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {!hasWorkerGroup ? (
            <div className="bg-[#1A1A1A] border border-white/10 border-dashed rounded-xl p-12 text-center">
              <HardDrive className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No workergroup configured</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                To start serving requests, configure a workergroup that defines which Docker template and GPUs to use.
              </p>
              <button className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors h-10 px-4 py-2 bg-primary hover:bg-primary-dark text-black">
                Configure Workergroup
              </button>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Live Workers</h3>
              </div>
              <div className="p-0">
                {workers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No workers currently provisioned.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-gray-400">
                        <tr>
                          <th className="px-6 py-3 font-medium">Worker ID</th>
                          <th className="px-6 py-3 font-medium">State</th>
                          <th className="px-6 py-3 font-medium">Load</th>
                          <th className="px-6 py-3 font-medium">Queue Time</th>
                          <th className="px-6 py-3 font-medium">Last Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {workers.map((worker) => (
                          <tr key={worker.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs text-gray-300">{worker.id.substring(0, 8)}...</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                worker.state === 'active' ? 'bg-green-500/10 text-green-400' :
                                worker.state === 'recruiting' ? 'bg-primary/10 text-primary' :
                                worker.state === 'releasing' ? 'bg-orange-500/10 text-orange-400' :
                                'bg-white/10 text-gray-400'
                              }`}>
                                {worker.state}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-300">{(worker.current_load || 0).toFixed(2)}</td>
                            <td className="px-6 py-4 text-gray-300">{(worker.queue_time || 0).toFixed(3)}s</td>
                            <td className="px-6 py-4 text-gray-500">
                              {worker.last_metrics_at ? new Date(worker.last_metrics_at).toLocaleTimeString() : 'Never'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Integration Code</h3>
            </div>
            <div className="p-6">
              <div className="bg-black rounded-lg p-4 overflow-x-auto border border-white/10">
                <pre className="text-sm font-mono text-gray-300">
                  <code className="text-pink-400">from</code> velocity <code className="text-pink-400">import</code> VelocityClient{'\n\n'}
                  <code className="text-gray-500"># Initialize the client</code>{'\n'}
                  client = VelocityClient({'\n'}
                  {'    '}api_key=<code className="text-green-400">"YOUR_API_KEY"</code>,{'\n'}
                  {'    '}endpoint_id=<code className="text-green-400">"{endpoint.id}"</code>{'\n'}
                  ){'\n\n'}
                  <code className="text-gray-500"># Send a generation request</code>{'\n'}
                  response = client.generate({'{'}{'\n'}
                  {'    '}<code className="text-green-400">"prompt"</code>: <code className="text-green-400">"Explain quantum computing in simple terms."</code>,{'\n'}
                  {'    '}<code className="text-green-400">"max_tokens"</code>: <code className="text-primary">512</code>{'\n'}
                  {'}'}){'\n\n'}
                  <code className="text-primary">print</code>(response)
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden sticky top-8">
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Play className="h-4 w-4 mr-2 text-primary" /> Test Endpoint
              </h3>
              <p className="text-sm text-gray-400 mt-1">Send a test request to your active workers</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">JSON Payload</label>
                <textarea 
                  className="w-full h-32 bg-black border border-white/10 rounded-lg p-3 text-sm font-mono text-gray-300 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-y"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <button 
                onClick={handleTest} 
                className="inline-flex items-center justify-center rounded-lg text-sm font-bold transition-colors h-10 px-4 py-2 w-full bg-primary hover:bg-primary-dark text-black disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isTesting || !hasWorkerGroup}
              >
                {isTesting ? 'Sending...' : 'Send Request'}
              </button>
              
              {testResult && (
                <div className="pt-4 border-t border-white/10 mt-4">
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Response</label>
                  <div className="bg-black border border-white/10 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs font-mono text-gray-400 whitespace-pre-wrap break-words">
                      {testResult}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
