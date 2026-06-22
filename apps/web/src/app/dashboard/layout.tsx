'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/dashboard/orders', label: 'Orders', icon: '📦' },
  { href: '/dashboard/tracking', label: 'Tracking', icon: '🔍' },
  { href: '/dashboard/wallet', label: 'Wallet', icon: '💰' },
  { href: '/dashboard/disputes', label: 'Weight Disputes', icon: '⚖' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && user.role !== 'seller') router.replace('/dashboard/admin');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0]">
        <div className="font-mono-nb text-sm font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] bg-[#fffaf0]">
      <aside className="sticky top-0 flex h-screen flex-col bg-black text-white">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] p-4">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-c3 font-bold text-black shadow-nb-sm">
            M
          </div>
          <div>
            <div className="text-sm font-bold">Mozopost</div>
            <div className="font-mono-nb text-[8px] text-c3">SELLER PANEL</div>
          </div>
        </div>

        <nav className="flex-1 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 border-l-[3px] px-4 py-2 text-xs ${
                  active ? 'border-c3 bg-[#0d0d0d] text-c3 font-bold' : 'border-transparent text-[#888] hover:bg-[#111] hover:text-white'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="m-2.5 border-2 border-black bg-c3 p-3 text-black shadow-nb">
          <div className="font-mono-nb text-[8px] font-bold uppercase">Wallet</div>
          <div className="font-mono-nb text-lg font-bold">
            ₹{user.walletBalance?.toLocaleString('en-IN') ?? '—'}
          </div>
          <Link
            href="/dashboard/wallet"
            className="mt-1.5 block border-2 border-black bg-black py-1 text-center text-[10px] font-bold text-c3"
          >
            Recharge
          </Link>
        </div>

        <button
          onClick={logout}
          className="border-t border-[#1a1a1a] px-4 py-3 text-left text-xs text-[#888] hover:text-white"
        >
          ↩ Logout
        </button>
      </aside>

      <main className="overflow-x-hidden p-5">
        <div className="mb-5 flex items-center justify-between border-2 border-black bg-black px-4 py-2.5 text-white shadow-nb-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Seller Panel</span>
            <Badge color="bg-c3 text-black">{user.businessName || user.email}</Badge>
          </div>
          <Badge color="bg-c1 text-black">{user.role.replace('_', ' ').toUpperCase()}</Badge>
        </div>
        {children}
      </main>
    </div>
  );
}
