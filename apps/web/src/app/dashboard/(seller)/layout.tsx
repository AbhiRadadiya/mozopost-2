'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: '🏠' }],
  },
  {
    label: 'Orders',
    items: [
      { href: '/dashboard/orders', label: 'Create Order', icon: '➕' },
      { href: '/dashboard/orders/all', label: 'All Orders', icon: '📋' },
      { href: '/dashboard/orders/bulk', label: 'Bulk Upload', icon: '⬆' },
      { href: '/dashboard/shipments', label: 'Shipments', icon: '📦' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/dashboard/pickups', label: 'Pickups', icon: '🚚' },
      { href: '/dashboard/tracking', label: 'Tracking', icon: '🔍' },
      { href: '/dashboard/labels', label: 'Labels', icon: '🖨' },
    ],
  },
  {
    label: 'Issues',
    items: [
      { href: '/dashboard/ndr', label: 'NDR', icon: '⚠' },
      { href: '/dashboard/disputes', label: 'Weight Disputes', icon: '⚖' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/dashboard/wallet', label: 'Wallet', icon: '💰' },
      { href: '/dashboard/cod', label: 'COD Reports', icon: '💵' },
      { href: '/dashboard/reports', label: 'Reports', icon: '📊' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/tickets', label: 'Support', icon: '🎟' },
      { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { fetchMe(); }, [fetchMe]);
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

  const sidebarW = collapsed ? '52px' : '210px';

  return (
    <div className="grid min-h-screen bg-[#fffaf0]" style={{ gridTemplateColumns: `${sidebarW} 1fr` }}>
      <aside className="sticky top-0 flex h-screen flex-col bg-black text-white overflow-y-auto overflow-x-hidden transition-all duration-200">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] p-3">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-2 border-black bg-c3 font-bold text-black text-xs shadow-nb-sm">M</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight">Mozopost</div>
              <div className="font-mono-nb text-[7px] text-c3">SELLER PANEL</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="ml-auto flex-shrink-0 text-[#444] hover:text-white text-xs px-1">
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="flex-1 py-1 overflow-y-auto">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div className="px-3 pt-3 pb-1 font-mono-nb text-[7px] uppercase tracking-widest text-[#333]">
                  {section.label}
                </div>
              )}
              {section.items.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2 border-l-[3px] px-3 py-1.5 text-[11px] transition-colors ${
                      active ? 'border-c3 bg-[#0d0d0d] text-c3 font-bold' : 'border-transparent text-[#777] hover:bg-[#111] hover:text-white'
                    }`}
                  >
                    <span className="flex-shrink-0 text-sm">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="m-2 border-2 border-black bg-c3 p-2 text-black shadow-nb">
            <div className="font-mono-nb text-[7px] font-bold uppercase">Wallet</div>
            <div className="font-mono-nb text-base font-bold">
              ₹{user.walletBalance?.toLocaleString('en-IN') ?? '—'}
            </div>
            <Link href="/dashboard/wallet" className="mt-1 block border-2 border-black bg-black py-0.5 text-center text-[9px] font-bold text-c3">
              Recharge
            </Link>
          </div>
        )}

        <button onClick={logout} className="border-t border-[#1a1a1a] px-3 py-2 text-left text-[10px] text-[#666] hover:text-white">
          {collapsed ? '↩' : '↩ Logout'}
        </button>
      </aside>

      <main className="overflow-x-hidden p-4">
        <div className="mb-4 flex items-center justify-between border-2 border-black bg-black px-4 py-2.5 text-white shadow-nb-lg">
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
