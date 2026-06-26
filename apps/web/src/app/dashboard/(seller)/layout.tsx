'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

/* ── Nav Structure ───────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
    ],
  },
  {
    label: 'Orders',
    items: [
      { href: '/dashboard/orders',      label: 'Orders',       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { href: '/dashboard/orders/bulk', label: 'Bulk Upload',  icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
      { href: '/dashboard/pickups',     label: 'Pickups',      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ],
  },
  {
    label: 'Issues',
    items: [
      { href: '/dashboard/ndr',      label: 'NDR',             icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
      { href: '/dashboard/disputes', label: 'Weight Disputes', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/dashboard/wallet',  label: 'Wallet',    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { href: '/dashboard/cod',     label: 'COD',       icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
      { href: '/dashboard/reports', label: 'Reports',   icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/dashboard/stores',       label: 'Stores',        icon: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
      { href: '/dashboard/labels',       label: 'Labels',        icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
    ],
  },
  {
    label: 'Support',
    items: [
      { href: '/dashboard/tickets',  label: 'Support',   icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
      { href: '/dashboard/settings', label: 'Settings',  icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ],
  },
];

/* ── NavIcon ─────────────────────────────────────────────── */
function NavIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d.split('M').filter(Boolean).map((seg, i) => (
        <path key={i} d={`M${seg}`} />
      ))}
    </svg>
  );
}

/* ── Layout ──────────────────────────────────────────────── */
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
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F9]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
            style={{ background: '#4F46E5' }}
          >
            M
          </div>
          <div className="text-sm text-[#94A3B8] font-medium animate-pulse-soft">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const W = collapsed ? '68px' : '248px';

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside
        style={{ width: W, minWidth: W, transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)' }}
        className="sticky top-0 h-screen flex flex-col bg-white border-r border-[#E5E8EF] overflow-y-auto overflow-x-hidden shrink-0 z-30"
      >
        {/* ── Logo ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#E5E8EF]" style={{ minHeight: 60 }}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
              >
                M
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[#0F172A] text-sm leading-tight">Mozopost</div>
                <div className="text-[10px] text-[#94A3B8] font-medium tracking-widest uppercase">Seller Panel</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
            >
              M
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-[#94A3B8] hover:text-[#475569] hover:bg-[#F4F6F9] w-7 h-7 rounded-md flex items-center justify-center transition-colors shrink-0 ml-1"
              aria-label="Collapse sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute right-0 top-4 translate-x-full bg-white border border-[#E5E8EF] border-l-0 w-5 h-8 flex items-center justify-center text-[#94A3B8] hover:text-[#475569] rounded-r-md shadow-sm transition-colors"
              aria-label="Expand sidebar"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-widest">
                  {group.label}
                </div>
              )}
              {collapsed && <div className="pb-1 border-t border-[#F1F3F7] mx-1 mt-1" />}
              {group.items.map(item => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group
                      ${collapsed ? 'justify-center' : ''}
                      ${active
                        ? 'bg-[#EEF2FF] text-[#4F46E5]'
                        : 'text-[#64748B] hover:bg-[#F4F6F9] hover:text-[#0F172A]'
                      }
                    `}
                  >
                    <span className={`shrink-0 transition-colors ${active ? 'text-[#4F46E5]' : 'text-[#94A3B8] group-hover:text-[#64748B]'}`}>
                      <NavIcon d={item.icon} />
                    </span>
                    {!collapsed && (
                      <span className={`text-sm font-medium leading-none truncate ${active ? 'font-semibold text-[#4F46E5]' : ''}`}>
                        {item.label}
                      </span>
                    )}
                    {active && !collapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4F46E5] shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Wallet strip ── */}
        {!collapsed && (
          <div className="mx-3 mb-3 p-4 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED]">
            <div className="text-[10px] font-semibold text-indigo-200 uppercase tracking-widest mb-1">
              Wallet Balance
            </div>
            <div className="text-xl font-bold text-white font-mono-nb leading-tight">
              ₹{user.walletBalance?.toLocaleString('en-IN') ?? '—'}
            </div>
            <Link
              href="/dashboard/wallet"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#4F46E5] bg-white rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Recharge
            </Link>
          </div>
        )}

        {/* ── Logout ── */}
        <button
          onClick={logout}
          className={`
            flex items-center gap-3 px-4 py-3 border-t border-[#E5E8EF]
            text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? 'Logout' : undefined}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col">

        {/* ── Top bar ── */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white border-b border-[#E5E8EF] shadow-sm">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-semibold text-[#0F172A]">
                {user.businessName || 'Seller Panel'}
              </div>
              <div className="text-xs text-[#94A3B8]">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:bg-[#F4F6F9] hover:text-[#475569] transition-colors relative">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {/* User chip */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#E5E8EF]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
              >
                {(user.businessName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-semibold text-[#0F172A] leading-tight">{user.businessName || user.email}</div>
                <div className="text-[10px] text-[#94A3B8] capitalize">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
