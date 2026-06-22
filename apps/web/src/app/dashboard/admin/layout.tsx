'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui';

const MASTER_ADMIN_NAV = [
  { href: '/dashboard/admin', label: 'Dashboard', icon: '🏠' },
  { href: '/dashboard/admin/merchants', label: 'Merchants', icon: '👥' },
  { href: '/dashboard/admin/margins', label: 'Margins', icon: '💹' },
  { href: '/dashboard/admin/wallets', label: 'Wallet Control', icon: '💰' },
  { href: '/dashboard/admin/credit', label: 'Credit Management', icon: '💳' },
  { href: '/dashboard/admin/cod', label: 'COD Settlements', icon: '💵' },
  { href: '/dashboard/admin/disputes', label: 'Weight Disputes', icon: '⚖' },
];

const SUPER_ADMIN_ONLY_NAV = [
  { href: '/dashboard/admin/couriers', label: 'Courier Integrations', icon: '🚚' },
  { href: '/dashboard/admin/settings', label: 'Global Settings', icon: '⚙' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && user.role === 'seller') router.replace('/dashboard');
  }, [loading, user, router]);

  if (loading || !user || user.role === 'seller') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fffaf0]">
        <div className="font-mono-nb text-sm font-bold">Loading...</div>
      </div>
    );
  }

  const isSuperAdmin = user.role === 'super_admin';
  const nav = isSuperAdmin ? [...MASTER_ADMIN_NAV, ...SUPER_ADMIN_ONLY_NAV] : MASTER_ADMIN_NAV;
  const headerBg = isSuperAdmin ? 'bg-c2' : 'bg-c4';

  return (
    <div className="grid min-h-screen grid-cols-[220px_1fr] bg-[#fffaf0]">
      <aside className="sticky top-0 flex h-screen flex-col bg-black text-white">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] p-4">
          <div className={`flex h-8 w-8 items-center justify-center border-2 border-black font-bold text-black shadow-nb-sm ${isSuperAdmin ? 'bg-c2' : 'bg-c4'}`}>
            M
          </div>
          <div>
            <div className="text-sm font-bold">Mozopost</div>
            <div className="font-mono-nb text-[8px] text-c3">
              {isSuperAdmin ? 'SUPER ADMIN' : 'MASTER ADMIN'}
            </div>
          </div>
        </div>

        <nav className="flex-1 py-2">
          {nav.map((item) => {
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

        <button
          onClick={logout}
          className="border-t border-[#1a1a1a] px-4 py-3 text-left text-xs text-[#888] hover:text-white"
        >
          ↩ Logout
        </button>
      </aside>

      <main className="overflow-x-hidden p-5">
        <div className={`mb-5 flex items-center justify-between border-2 border-black px-4 py-2.5 text-black shadow-nb-lg ${headerBg}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">{isSuperAdmin ? 'Super Admin' : 'Master Admin'} Panel</span>
            <Badge color="bg-black text-white">{user.firstName} {user.lastName}</Badge>
          </div>
          <Badge color="bg-black text-white">{user.role.replace('_', ' ').toUpperCase()}</Badge>
        </div>
        {children}
      </main>
    </div>
  );
}
