'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import AddFundsButton from '../console/AddFundsButton';
import { Settings, CreditCard, LayoutDashboard, HardDrive, Gift } from 'lucide-react';
import { formatUSD } from '@/lib/currency';

interface ConsoleSidebarProps {
  role: string;
  walletBalance: number;
  userEmail?: string;
  userPhone?: string;
  currentSpendRate?: number;
  referralCode?: string;
}

export default function ConsoleSidebar({ 
  role, 
  walletBalance, 
  userEmail, 
  userPhone,
  currentSpendRate = 0,
  referralCode,
}: ConsoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [copied, setCopied] = useState(false);
  const isRenter = role !== 'host';
  const isHost = role === 'host';

  const isActive = (path: string) => {
    if (path === '/console' && pathname === '/console') return true;
    if (path !== '/console' && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="w-64 border-r border-white/[0.06] bg-[#080D16] flex flex-col h-screen sticky top-0 shrink-0">
      <div className="h-14 flex items-center px-5 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center font-bold text-white text-[10px] shadow-glow-sm">V</div>
          <span className="font-heading font-bold text-sm tracking-tight text-white">Velocity</span>
        </Link>
      </div>
      
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-[0.15em] mb-3 mt-3 px-3">GPUs</div>
        <nav className="space-y-0.5 mb-6">
          {isRenter && (
            <Link 
              href="/console" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive('/console') ? 'bg-primary/[0.1] text-primary font-medium shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]' : 'text-[#64748B] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              GPU Instances
            </Link>
          )}
          {isHost && (
            <Link 
              href="/host/dashboard" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                isActive('/host/dashboard') ? 'bg-primary/[0.1] text-primary font-medium shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]' : 'text-[#64748B] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Host Dashboard
            </Link>
          )}
        </nav>

        <div className="text-[10px] font-semibold text-[#475569] uppercase tracking-[0.15em] mb-3 px-3">Account</div>
        <nav className="space-y-0.5">
          <Link 
            href="/billing" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive('/billing') ? 'bg-primary/[0.1] text-primary font-medium shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]' : 'text-[#64748B] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Billing
          </Link>
          <Link 
            href="/settings" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive('/settings') ? 'bg-primary/[0.1] text-primary font-medium shadow-[inset_0_0_0_1px_rgba(99,102,241,0.15)]' : 'text-[#64748B] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </nav>
      </div>

      <div className="px-3 pt-3 pb-2">
        <Link
          href="/invite"
          className="block border border-white/[0.06] rounded-xl p-3 hover:border-primary/20 transition-all group bg-white/[0.02]"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-white">Invite & Earn</span>
          </div>
          {referralCode ? (
            <div className="flex items-center gap-1.5 mt-1">
              <code className="text-[10px] text-[#64748B] bg-white/[0.04] px-1.5 py-0.5 rounded font-mono truncate">
                {referralCode}
              </code>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralCode}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-[10px] text-primary hover:text-primary-light shrink-0 transition-colors font-medium"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-[#475569] leading-relaxed">
              Share your link, both get free GPU hours
            </p>
          )}
        </Link>
      </div>

      <div className="p-3 border-t border-white/[0.06]">
        <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
          <div className="flex justify-between items-start mb-1">
            <div className="text-[10px] text-[#475569] uppercase tracking-wider font-medium">{isHost ? 'Unpaid Earnings' : 'Balance'}</div>
            {currentSpendRate > 0 && (
              <div className="text-[9px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" />
                {formatUSD(currentSpendRate, { suffix: '/hr' })}
              </div>
            )}
          </div>
          <div className={`text-lg font-bold mb-2 tabular-nums font-mono ${isHost ? 'text-primary' : 'text-white'}`}>{formatUSD(walletBalance)}</div>
          {isHost ? (
            <button
              onClick={() => router.push('/billing')}
              className="w-full bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-medium py-2 rounded-lg transition-all"
            >
              Request Payout
            </button>
          ) : (
            <AddFundsButton userEmail={userEmail} userPhone={userPhone} />
          )}
        </div>
      </div>
    </aside>
  );
}
