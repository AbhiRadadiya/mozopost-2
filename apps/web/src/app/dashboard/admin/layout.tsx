'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Badge } from '@/components/ui';

const MASTER_SECTIONS = [
  { label: 'Overview', items: [
    { href: '/dashboard/admin', label: 'Dashboard', icon: '🏠' },
  ]},
  { label: 'Merchants', items: [
    { href: '/dashboard/admin/merchants', label: 'All Merchants', icon: '👥' },
    { href: '/dashboard/admin/kyc', label: 'KYC Verification', icon: '🪪' },
    { href: '/dashboard/admin/margins', label: 'Margins', icon: '💹' },
  ]},
  { label: 'Operations', items: [
    { href: '/dashboard/admin/ndr-mgmt', label: 'NDR Management', icon: '⚠' },
    { href: '/dashboard/admin/rto-mgmt', label: 'RTO Management', icon: '↩' },
    { href: '/dashboard/admin/pickups-mgmt', label: 'Pickup Mgmt', icon: '🚚' },
  ]},
  { label: 'Finance', items: [
    { href: '/dashboard/admin/wallets', label: 'Wallet Control', icon: '💰' },
    { href: '/dashboard/admin/credit', label: 'Credit Management', icon: '💳' },
    { href: '/dashboard/admin/cod', label: 'COD Settlements', icon: '💵' },
  ]},
  { label: 'Reports', items: [
    { href: '/dashboard/admin/pnl', label: 'P&L Reports', icon: '💸' },
    { href: '/dashboard/admin/reports', label: 'All Reports', icon: '📊' },
    { href: '/dashboard/admin/disputes', label: 'Weight Disputes', icon: '⚖' },
  ]},
  { label: 'System', items: [
    { href: '/dashboard/admin/staff', label: 'Staff Management', icon: '👤' },
  ]},
];

const SUPER_EXTRA_SECTIONS = [
  { label: 'Super Admin', items: [
    { href: '/dashboard/admin/roles', label: 'Roles & Permissions', icon: '🔐' },
    { href: '/dashboard/admin/couriers', label: 'Courier Mgmt', icon: '🚚' },
    { href: '/dashboard/admin/settings', label: 'Global Settings', icon: '⚙' },
  ]},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { fetchMe(); }, [fetchMe]);
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
  const sections = isSuperAdmin ? [...MASTER_SECTIONS, ...SUPER_EXTRA_SECTIONS] : MASTER_SECTIONS;
  const accentColor = isSuperAdmin ? 'bg-c2' : 'bg-c4';
  const sidebarW = collapsed ? '52px' : '210px';

  return (
    <div className="grid min-h-screen bg-[#fffaf0]" style={{ gridTemplateColumns: `${sidebarW} 1fr` }}>
      <aside className="sticky top-0 flex h-screen flex-col bg-black text-white overflow-y-auto overflow-x-hidden transition-all duration-200">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] p-3">
          <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center border-2 border-black font-bold text-black text-xs shadow-nb-sm ${accentColor}`}>M</div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-bold leading-tight">Mozopost</div>
              <div className="font-mono-nb text-[7px] text-c3">{isSuperAdmin ? 'SUPER ADMIN' : 'MASTER ADMIN'}</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="ml-auto flex-shrink-0 text-[#444] hover:text-white text-xs px-1">
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="flex-1 py-1 overflow-y-auto">
          {sections.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div className="px-3 pt-3 pb-1 font-mono-nb text-[7px] uppercase tracking-widest text-[#333]">
                  {section.label}
                </div>
              )}
              {section.items.map(item => {
                const active = pathname === item.href || (item.href !== '/dashboard/admin' && pathname.startsWith(item.href));
                const activeClass = isSuperAdmin ? 'border-c2 text-c2' : 'border-c4 text-c4';
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-2 border-l-[3px] px-3 py-1.5 text-[11px] transition-colors ${
                      active ? `${activeClass} bg-[#0d0d0d] font-bold` : 'border-transparent text-[#777] hover:bg-[#111] hover:text-white'
                    }`}>
                    <span className="flex-shrink-0 text-sm">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <button onClick={logout} className="border-t border-[#1a1a1a] px-3 py-2 text-left text-[10px] text-[#666] hover:text-white">
          {collapsed ? '↩' : '↩ Logout'}
        </button>
      </aside>

      <main className="overflow-x-hidden p-4">
        <div className={`mb-4 flex items-center justify-between border-2 border-black px-4 py-2.5 shadow-nb-lg ${accentColor}`}>
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
