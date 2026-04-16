'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

type Step = 1 | 2 | 3 | 4 | 5;

interface MachineInfo {
  id: string;
  gpu_model: string;
  gpu_count: number;
  vram_gb: number;
  ram_gb: number;
  status: string;
  machine_tier: string;
  last_heartbeat: string | null;
  self_test_passed: boolean;
  created_at: string;
}

export default function HostSetupPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('host-agent');
  const [creatingKey, setCreatingKey] = useState(false);
  const [machines, setMachines] = useState<MachineInfo[]>([]);
  const [polling, setPolling] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
    });
  }, []);

  const generateApiKey = async () => {
    setCreatingKey(true);
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
        body: JSON.stringify({ name: keyName }),
      });
      if (!res.ok) throw new Error('Failed to generate key');
      const data = await res.json();
      setApiKey(data.key);
      setCurrentStep(3);
    } catch {
      setKeyError('Could not generate API key. Please try again.');
    } finally {
      setCreatingKey(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const pollForMachines = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/host/machines', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMachines(data.machines || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (currentStep < 4 || !polling) return;
    pollForMachines();
    const interval = setInterval(pollForMachines, 5000);
    return () => clearInterval(interval);
  }, [currentStep, polling, pollForMachines]);

  useEffect(() => {
    if (currentStep === 4) setPolling(true);
  }, [currentStep]);

  const recentMachine = machines.find(m => {
    if (!m.last_heartbeat) return false;
    const hbAge = Date.now() - new Date(m.last_heartbeat).getTime();
    return hbAge < 5 * 60 * 1000;
  });

  const [testMode, setTestMode] = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://velocity-infra.vercel.app';
  const testFlag = testMode ? ' VELOCITY_TEST_MODE=true' : '';
  const installCommand = apiKey
    ? `curl -sSL ${baseUrl}/agent/install.sh | sudo VELOCITY_API_KEY="${apiKey}" VELOCITY_API_URL="${baseUrl}"${testFlag} bash`
    : `curl -sSL ${baseUrl}/agent/install.sh | sudo VELOCITY_API_URL="${baseUrl}"${testFlag} bash`;

  const steps: { num: Step; title: string }[] = [
    { num: 1, title: 'Requirements' },
    { num: 2, title: 'API Key' },
    { num: 3, title: 'Install Agent' },
    { num: 4, title: 'Verify' },
    { num: 5, title: 'List Machine' },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#E2E8F0]">
      <header className="border-b border-white/[0.06] bg-[#080D16]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-r from-primary-dark to-primary flex items-center justify-center font-bold text-white text-xs">V</div>
            <span className="font-bold">Velocity</span>
          </Link>
          <div className="text-sm text-[#94A3B8]">Host Setup</div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">Connect your machine</h1>
        <p className="text-[#94A3B8] mb-10">Five quick steps to get your GPU earning on Velocity.</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-12">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-2">
              <button
                onClick={() => s.num <= currentStep ? setCurrentStep(s.num) : undefined}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  s.num === currentStep
                    ? 'bg-gradient-to-r from-primary-dark to-primary text-white'
                    : s.num < currentStep
                      ? 'bg-primary/20 text-primary cursor-pointer'
                      : 'bg-white/[0.04] text-[#64748B]'
                }`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
                  {s.num < currentStep ? '✓' : s.num}
                </span>
                <span className="hidden sm:inline">{s.title}</span>
              </button>
              {i < steps.length - 1 && <div className="w-8 h-px bg-white/[0.06]" />}
            </div>
          ))}
        </div>

        {/* Step 1: Requirements */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Check your setup</h2>
            <p className="text-[#94A3B8] text-sm">Make sure your machine has the following before we install the agent.</p>
            <div className="grid gap-3">
              {[
                { name: 'Ubuntu 18.04+', desc: 'Linux with systemd support' },
                { name: 'Python 3.8+', desc: 'apt install python3 python3-pip' },
                { name: 'Docker Engine', desc: 'With daemon running (docker info)' },
                { name: 'NVIDIA GPU Driver', desc: 'nvidia-smi must work' },
                { name: 'nvidia-container-toolkit', desc: 'For GPU passthrough to Docker' },
                { name: 'cloudflared (optional)', desc: 'For secure Cloudflare Tunnels' },
              ].map(req => (
                <div key={req.name} className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{req.name}</div>
                    <div className="text-xs text-[#64748B]">{req.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              My machine meets these requirements
            </button>
          </div>
        )}

        {/* Step 2: API Key */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Create an API key</h2>
            <p className="text-[#94A3B8] text-sm">This key lets your machine talk to our API. It's only shown once, so save it somewhere safe.</p>

            {isAuthenticated === false && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
                You need to be logged in to generate an API key.
                <Link href="/login?redirect=/host/setup" className="text-primary hover:underline ml-1">Sign in</Link>
              </div>
            )}

            {keyError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {keyError}
              </div>
            )}

            {apiKey ? (
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="text-sm font-bold text-primary mb-2">API Key Generated — save it now!</div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-white/[0.03] px-3 py-1.5 rounded flex-1 break-all text-[#E2E8F0]">{apiKey}</code>
                  <button
                    onClick={() => copyText(apiKey, 'key')}
                    className="text-primary hover:text-white transition-colors shrink-0 px-2 py-1"
                  >
                    {copied === 'key' ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-[#94A3B8] mb-1 block">Key name</label>
                  <input
                    type="text"
                    value={keyName}
                    onChange={e => setKeyName(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 bg-white/[0.03] border border-white/[0.08] text-sm text-[#E2E8F0] focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <button
                  onClick={generateApiKey}
                  disabled={creatingKey || !isAuthenticated}
                  className="bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {creatingKey ? 'Generating...' : 'Generate Key'}
                </button>
              </div>
            )}

            {apiKey && (
              <button
                onClick={() => setCurrentStep(3)}
                className="bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                Continue to Installation
              </button>
            )}
          </div>
        )}

        {/* Step 3: Install */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Install the agent</h2>
            <p className="text-[#94A3B8] text-sm">Paste this into your machine's terminal. It downloads the agent, registers your machine, and starts the background service.</p>

            {/* Test mode toggle */}
            <div className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <button
                onClick={() => setTestMode(!testMode)}
                className={`relative w-10 h-5 rounded-full transition-colors ${testMode ? 'bg-yellow-500' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${testMode ? 'translate-x-5' : ''}`} />
              </button>
              <div>
                <span className="text-sm font-medium">Test Mode</span>
                <span className="text-xs text-[#64748B] ml-2">
                  {testMode ? 'ON — skips GPU/Docker/NVIDIA checks. Works on any machine (Mac, Linux VM, etc.)' : 'OFF — requires Linux with NVIDIA GPU'}
                </span>
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#64748B] font-mono">bash{testMode ? ' (test mode)' : ''}</span>
                <button
                  onClick={() => copyText(installCommand, 'install')}
                  className="text-xs text-primary hover:text-white transition-colors"
                >
                  {copied === 'install' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <code className="text-sm font-mono text-primary break-all leading-relaxed block">
                {installCommand}
              </code>
            </div>

            {testMode && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-400">
                <span className="font-bold">Test Mode:</span> The agent will register with simulated GPU specs (RTX 4090, 24GB VRAM). No Docker or NVIDIA required. Use this on any Linux VM or macOS to validate the full registration and heartbeat flow.
              </div>
            )}

            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-4 text-sm text-yellow-400/80">
              <span className="font-bold">Security note:</span> The install script requires root access to create a systemd service. Review the script source before running.
            </div>

            <div className="text-sm text-[#94A3B8]">
              <div className="font-bold mb-2">The installer will:</div>
              <ol className="list-decimal list-inside space-y-1 text-[#64748B]">
                <li>Check all prerequisites (Python, Docker, NVIDIA, etc.){testMode && <span className="text-yellow-500"> — skipped in test mode</span>}</li>
                <li>Download the agent to <code className="text-[#94A3B8]">/opt/velocity/</code></li>
                <li>Register your machine with the Velocity Infra API</li>
                <li>{testMode ? 'Send test heartbeats (10 seconds)' : 'Create and start a systemd service'}</li>
                <li>{testMode ? 'Done — verify on dashboard' : 'Run an automated self-test'}</li>
              </ol>
            </div>

            <button
              onClick={() => setCurrentStep(4)}
              className="bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              I've run the installer
            </button>
          </div>
        )}

        {/* Step 4: Verify */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Waiting for your machine</h2>
            <p className="text-[#94A3B8] text-sm">We're listening for the first heartbeat from your agent. This usually takes under a minute.</p>

            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
              {recentMachine ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <div className="font-bold text-primary">Machine Connected!</div>
                      <div className="text-xs text-[#94A3B8] font-mono">ID: {recentMachine.id.substring(0, 12)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <div className="text-xs text-[#64748B]">GPU</div>
                      <div className="font-medium">{recentMachine.gpu_count}x {recentMachine.gpu_model}</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <div className="text-xs text-[#64748B]">VRAM</div>
                      <div className="font-medium">{recentMachine.vram_gb} GB</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <div className="text-xs text-[#64748B]">RAM</div>
                      <div className="font-medium">{recentMachine.ram_gb} GB</div>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                      <div className="text-xs text-[#64748B]">Self-Test</div>
                      <div className={`font-medium ${recentMachine.self_test_passed ? 'text-primary' : 'text-yellow-400'}`}>
                        {recentMachine.self_test_passed ? 'Passed' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div>
                    <div className="font-medium text-yellow-400">Waiting for machine...</div>
                    <div className="text-xs text-[#64748B]">Polling every 5 seconds. Make sure the install script completed successfully.</div>
                  </div>
                </div>
              )}
            </div>

            {recentMachine && (
              <button
                onClick={() => setCurrentStep(5)}
                className="bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
              >
                Continue to Pricing
              </button>
            )}
          </div>
        )}

        {/* Step 5: Set pricing */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">You're all set!</h2>
            <p className="text-[#94A3B8] text-sm">Your machine is online. Head to the dashboard to set pricing and start earning.</p>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">✓</div>
                <div>
                  <div className="font-bold text-primary">Setup Complete!</div>
                  <div className="text-sm text-[#94A3B8]">Your machine is online and ready to accept workloads.</div>
                </div>
              </div>

              <div className="text-sm text-[#94A3B8] space-y-2">
                <p>Next steps on the Host Dashboard:</p>
                <ul className="list-disc list-inside space-y-1 text-[#64748B]">
                  <li>Create an <span className="text-[#E2E8F0]">Offer</span> with your per-GPU hourly rate</li>
                  <li>Set GPU slicing options (min GPUs per rental)</li>
                  <li>Configure interruptible/reserved pricing</li>
                  <li>Monitor health, earnings, and rental contracts</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <Link
                href="/host/dashboard"
                className="bg-gradient-to-r from-primary-dark to-primary text-white font-semibold py-2.5 px-6 rounded-lg transition-colors inline-block"
              >
                Go to Host Dashboard
              </Link>
              <Link
                href="/settings"
                className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#94A3B8] hover:text-[#E2E8F0] font-medium py-2.5 px-6 rounded-lg transition-colors inline-block"
              >
                Manage API Keys
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
