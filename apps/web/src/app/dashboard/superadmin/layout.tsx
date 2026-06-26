'use client';

/**
 * SUPER ADMIN PANEL — LAYOUT (sidebar shell)
 * Domain: superadmin.mozopost.in   ·   API: api.mozopost.in
 * Each nav item opens its own page (no tabs).
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

const NAV_GROUPS = [
  {
    label: 'Security',
    items: [
      { href: '/dashboard/superadmin/risk-dashboard', label: 'Risk Dashboard',       icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { href: '/dashboard/superadmin/risk-scores',    label: 'Merchant Risk Scores',  icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
      { href: '/dashboard/superadmin/blacklist',      label: 'Blacklist',             icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
      { href: '/dashboard/superadmin/security-logs',  label: 'Security Logs',         icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
      { href: '/dashboard/superadmin/security-rules', label: 'Security Rules',        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    ],
  },
  {
    label: 'Access Control',
    items: [
      { href: '/dashboard/superadmin/roles',          label: 'Roles & Permissions',   icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
    ],
  },
  {
    label: 'Platform Config',
    items: [
      { href: '/dashboard/superadmin/rate-cards',     label: 'Rate Cards',            icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { href: '/dashboard/superadmin/couriers',       label: 'Courier Status',        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { href: '/dashboard/superadmin/global-settings',label: 'Global Settings',       icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
      { href: '/dashboard/superadmin/api',            label: 'API & Keys',            icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
    ],
  },
];

function NavIcon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={`M${seg}`} />)}
    </svg>
  );
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { fetchMe(); }, [fetchMe]);
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (!loading && user && user.role !== 'super_admin') router.replace('/dashboard/admin');
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'super_admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F6F9]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl font-black text-lg text-white"
            style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>M</div>
          <div className="animate-pulse text-sm font-medium text-[#94A3B8]">Authorizing Super Admin…</div>
        </div>
      </div>
    );
  }

  const W = collapsed ? '68px' : '252px';

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={{ width: W, minWidth: W, transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)' }}
        className="sticky top-0 z-30 flex h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-[#E5E8EF] bg-white">
        {/* Logo */}
        <div className="flex items-center justify-between border-b border-[#E5E8EF] px-4 py-4" style={{ minHeight: 60 }}>
          {!collapsed ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-sm text-white"
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>M</div>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight text-[#0F172A]">Mozopost</div>
                <div className="text-[10px] font-medium uppercase tracking-widest text-[#7C3AED]">Super Admin</div>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg font-black text-sm text-white"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>M</div>
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)}
              className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#94A3B8] transition-colors hover:bg-[#F4F6F9] hover:text-[#475569]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {collapsed && (
            <button onClick={() => setCollapsed(false)}
              className="absolute right-0 top-4 flex h-8 w-5 translate-x-full items-center justify-center rounded-r-md border border-l-0 border-[#E5E8EF] bg-white text-[#94A3B8] shadow-sm transition-colors hover:text-[#475569]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-1">
              {!collapsed
                ? <div className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">{group.label}</div>
                : <div className="mx-1 mt-1 border-t border-[#F1F3F7] pb-1" />}
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-150 group ${collapsed ? 'justify-center' : ''} ${
                      active ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'text-[#64748B] hover:bg-[#F4F6F9] hover:text-[#0F172A]'}`}>
                    <span className={`shrink-0 transition-colors ${active ? 'text-[#4F46E5]' : 'text-[#94A3B8] group-hover:text-[#64748B]'}`}>
                      <NavIcon d={item.icon} />
                    </span>
                    {!collapsed && (
                      <span className={`truncate text-sm font-medium leading-none ${active ? 'font-semibold text-[#4F46E5]' : ''}`}>{item.label}</span>
                    )}
                    {active && !collapsed && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F46E5]" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <button onClick={logout} title={collapsed ? 'Logout' : undefined}
          className={`flex items-center gap-3 border-t border-[#E5E8EF] px-4 py-3 text-[#94A3B8] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444] ${collapsed ? 'justify-center' : ''}`}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[#E5E8EF] bg-white px-6 py-3 shadow-sm">
          <div>
            <div className="text-sm font-semibold text-[#0F172A]">Super Admin Panel</div>
            <div className="text-xs text-[#94A3B8]">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-2 border-l border-[#E5E8EF] pl-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
              {(user.firstName?.[0] || 'S').toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-semibold text-[#0F172A]">{user.firstName} {user.lastName}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-[#7C3AED]">Super Admin</div>
            </div>
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
