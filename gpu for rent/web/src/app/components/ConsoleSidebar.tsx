'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import AddFundsButton from '../console/AddFundsButton';
import { Settings, CreditCard, LayoutDashboard, HardDrive, Gift } from 'lucide-react';

interface ConsoleSidebarProps {
  role: string;
  walletBalance: number;
  userEmail?: string;
  userPhone?: string;
  currentSpendRate?: number;
}

export default function ConsoleSidebar({ 
  role, 
  walletBalance, 
  userEmail, 
  userPhone,
  currentSpendRate = 0
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
    <aside className="w-64 border-r border-white/10 bg-[#0a0a0a] flex flex-col h-screen sticky top-0 shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center font-bold text-black text-xs">V</div>
          <span className="font-bold tracking-tight">Velocity</span>
        </Link>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 mt-2">GPUs</div>
        <nav className="space-y-1 mb-8">
          {isRenter && (
            <>
              <Link 
                href="/console" 
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                  isActive('/console') ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <HardDrive className="w-4 h-4" />
                GPU Instances
              </Link>
            </>
          )}
          {isHost && (
            <Link 
              href="/host/dashboard" 
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                isActive('/host/dashboard') ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Host Dashboard
            </Link>
          )}
        </nav>

        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Account</div>
        <nav className="space-y-1">
          <Link 
            href="/billing" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              isActive('/billing') ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Billing
          </Link>
          <Link 
            href="/settings" 
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              isActive('/settings') ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
        </nav>
      </div>

      <div className="px-4 pt-4 pb-2">
        <Link
          href="/invite"
          className="block bg-gradient-to-r from-primary/[0.06] to-yellow-400/[0.04] border border-primary/20 rounded-lg p-3 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-white">Invite & Earn</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Share your link — both get free GPU hours
          </p>
        </Link>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex justify-between items-start mb-1">
            <div className="text-xs text-gray-400">{isHost ? 'Unpaid Earnings' : 'Wallet Balance'}</div>
            {currentSpendRate > 0 && (
              <div className="text-[10px] text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded flex items-center gap-1" title="Current spend rate for active instances">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                ₹{currentSpendRate.toFixed(2)}/hr
              </div>
            )}
          </div>
          <div className={`text-lg font-mono font-bold mb-2 ${isHost ? 'text-primary' : 'text-white'}`}>₹{walletBalance.toFixed(2)}</div>
          {isHost ? (
            <button
              onClick={() => router.push('/billing')}
              className="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 rounded transition-colors"
            >
              Request Payout (UPI)
            </button>
          ) : (
            <AddFundsButton userEmail={userEmail} userPhone={userPhone} />
          )}
        </div>
      </div>
    </aside>
  );
}