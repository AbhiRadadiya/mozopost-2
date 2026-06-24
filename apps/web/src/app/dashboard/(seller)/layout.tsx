'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

const NAV_ITEMS = [
  { href: '/dashboard',            label: 'Dashboard',        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',  accent: '#c8f135' },
  { href: '/dashboard/orders',     label: 'Add Orders',       icon: 'M12 4v16m8-8H4',                                                                                                                                                accent: '#88aaee' },
  { href: '/dashboard/orders/all', label: 'All Orders',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',                         accent: '#88aaee' },
  { href: '/dashboard/shipments',  label: 'Shipments',        icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12l1-12',                                                                                                   accent: '#88aaee' },
  { href: '/dashboard/orders/bulk',label: 'Bulk Upload',      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',                                                                                            accent: '#88aaee' },
  { href: '/dashboard/pickups',    label: 'Pickups',          icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',                                                                   accent: '#88aaee' },
  { href: '/dashboard/tracking',  label: 'Tracking',          icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',                                       accent: '#88aaee' },
  { href: '/dashboard/ndr',        label: 'NDR',              icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',                    accent: '#ffa500' },
  { href: '/dashboard/disputes',  label: 'Weight Disputes',   icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',       accent: '#ffa500' },
  { href: '/dashboard/wallet',    label: 'Wallet',            icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',                                                                  accent: '#c8f135' },
  { href: '/dashboard/cod',       label: 'COD',               icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',    accent: '#c8f135' },
  { href: '/dashboard/reports',   label: 'Reports',           icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', accent: '#b4d4ff' },
  { href: '/dashboard/stores',    label: 'Stores',            icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',                                                                                                                accent: '#b4d4ff' },
  { href: '/dashboard/labels',    label: 'Labels',            icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',                             accent: '#b4d4ff' },
  { href: '/dashboard/translations', label: 'Translations', icon: 'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.782 3 18.128', accent: '#88aaee' },
  { href: '/dashboard/developer', label: 'Developer API',     icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',                                                                                                                     accent: '#ff6b6b' },
  { href: '/dashboard/tickets',   label: 'Support',           icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z', accent: '#ff6b6b' },
  { href: '/dashboard/settings',  label: 'Settings',          icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', accent: '#ff6b6b' },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
    </svg>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
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
        <div className="font-mono-nb text-sm font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  const W = collapsed ? '72px' : '240px';

  return (
    <div className="flex min-h-screen bg-[#fffaf0]">
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        style={{ width: W, minWidth: W, transition: 'width .2s ease' }}
        className="sticky top-0 h-screen flex flex-col bg-black overflow-y-auto overflow-x-hidden shrink-0 z-30"
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-3 py-4 border-b-2 border-[#1a1a1a]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex items-center justify-center font-black text-black text-base shrink-0"
                style={{
                  width: 38, height: 38,
                  background: '#c8f135',
                  border: '2.5px solid #000',
                  boxShadow: '3px 3px 0 #c8f135',
                  borderRadius: 4,
                  fontSize: 18,
                }}
              >M</div>
              <div className="min-w-0">
                <div className="font-black text-white text-sm leading-tight">Mozopost</div>
                <div className="font-mono-nb text-[8px] text-[#c8f135] tracking-widest">SELLER PANEL</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="mx-auto flex items-center justify-center font-black text-black text-base"
              style={{
                width: 38, height: 38,
                background: '#c8f135',
                border: '2.5px solid #000',
                boxShadow: '3px 3px 0 #c8f135',
                borderRadius: 4,
                fontSize: 18,
              }}
            >M</div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-[#444] hover:text-white ml-2 p-1 shrink-0"
              aria-label="Collapse sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute right-0 top-4 translate-x-full bg-black border-2 border-l-0 border-black p-1 text-[#444] hover:text-white"
              style={{ borderRadius: '0 4px 4px 0' }}
              aria-label="Expand sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-1">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href
              || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                style={active ? {
                  background: item.accent,
                  border: '2.5px solid #000',
                  boxShadow: '3px 3px 0 #000',
                  color: '#000',
                  borderRadius: 5,
                } : {
                  background: '#111',
                  border: '2px solid transparent',
                  borderRadius: 5,
                  color: '#888',
                }}
                className={`flex items-center gap-3 px-3 transition-all duration-100 ${
                  collapsed ? 'py-3 justify-center' : 'py-2.5'
                } hover:border-[#333] hover:text-white hover:bg-[#1a1a1a]`}
              >
                <span
                  className="shrink-0"
                  style={{ color: active ? '#000' : item.accent }}
                >
                  <NavIcon d={item.icon} />
                </span>
                {!collapsed && (
                  <span className={`text-sm font-bold leading-none ${active ? 'text-black' : 'text-white'}`}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Wallet strip */}
        {!collapsed && (
          <div
            className="mx-2 mb-2 p-3"
            style={{
              background: '#c8f135',
              border: '2.5px solid #000',
              boxShadow: '3px 3px 0 #000',
              borderRadius: 5,
            }}
          >
            <div className="font-mono-nb text-[8px] font-bold uppercase text-black opacity-60">Wallet Balance</div>
            <div className="font-mono-nb text-xl font-black text-black leading-tight">
              ₹{user.walletBalance?.toLocaleString('en-IN') ?? '—'}
            </div>
            <Link
              href="/dashboard/wallet"
              className="mt-2 block text-center text-[10px] font-black text-[#c8f135] py-1"
              style={{ background: '#000', border: '2px solid #000', borderRadius: 3 }}
            >
              + RECHARGE
            </Link>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 border-t-2 border-[#1a1a1a] text-[#555] hover:text-white hover:bg-[#111] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span className="text-xs font-bold">Logout</span>}
        </button>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {/* Top bar */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
          style={{
            background: '#000',
            border: '0 0 2px 0',
            borderBottom: '2.5px solid #000',
            boxShadow: '0 4px 0 #000',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-black text-white text-sm">Seller Panel</span>
            <span
              className="font-mono-nb text-[10px] font-black text-black px-2 py-0.5"
              style={{ background: '#c8f135', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
            >
              {user.businessName || user.email}
            </span>
          </div>
          <span
            className="font-mono-nb text-[10px] font-black text-black px-2 py-0.5 uppercase"
            style={{ background: '#88aaee', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
          >
            {user.role.replace('_', ' ')}
          </span>
        </div>

        <div className="p-5">
          {children}
        </div>
      </main>
    </div>
  );
}
