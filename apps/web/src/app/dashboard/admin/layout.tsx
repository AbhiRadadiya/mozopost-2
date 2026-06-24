'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';

const MASTER_ITEMS = [
  { href:'/dashboard/admin',              label:'Dashboard',        icon:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', accent:'#c8f135' },
  { href:'/dashboard/admin/merchants',    label:'All Merchants',    icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', accent:'#88aaee' },
  { href:'/dashboard/admin/kyc',          label:'KYC Verification', icon:'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2', accent:'#88aaee' },
  { href:'/dashboard/admin/margins',      label:'Margins',          icon:'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', accent:'#88aaee' },
  { href:'/dashboard/admin/ndr-mgmt',     label:'NDR Management',   icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', accent:'#ffa500' },
  { href:'/dashboard/admin/rto-mgmt',     label:'RTO Management',   icon:'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6', accent:'#ffa500' },
  { href:'/dashboard/admin/pickups-mgmt', label:'Pickup Mgmt',      icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', accent:'#ffa500' },
  { href:'/dashboard/admin/wallets',      label:'Wallet Control',   icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', accent:'#c8f135' },
  { href:'/dashboard/admin/credit',       label:'Credit Mgmt',      icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', accent:'#c8f135' },
  { href:'/dashboard/admin/cod',          label:'COD Settlements',  icon:'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', accent:'#c8f135' },
  { href:'/dashboard/admin/utr',          label:'UTR Entry',        icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', accent:'#c8f135' },
  { href:'/dashboard/admin/pnl',          label:'P&L Reports',      icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', accent:'#b4d4ff' },
  { href:'/dashboard/admin/reports',      label:'All Reports',      icon:'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', accent:'#b4d4ff' },
  { href:'/dashboard/admin/disputes',     label:'Weight Disputes',  icon:'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', accent:'#b4d4ff' },
  { href:'/dashboard/admin/referrals',    label:'Referrals',        icon:'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', accent:'#b4d4ff' },
  { href:'/dashboard/admin/smtp',         label:'SMTP & Email',     icon:'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', accent:'#b4d4ff' },
  { href:'/dashboard/admin/translations', label:'Address Translation', icon:'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.782 3 18.128', accent:'#88aaee' },
  { href:'/dashboard/admin/staff',        label:'Staff',            icon:'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', accent:'#ff6b6b' },
];

const SUPER_ITEMS = [
  { href:'/dashboard/admin/security',  label:'Security Dashboard', icon:'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', accent:'#ff6b6b' },
  { href:'/dashboard/admin/risk',      label:'Risk Management',    icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', accent:'#ff6b6b' },
  { href:'/dashboard/admin/roles',     label:'Roles & Permissions',icon:'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', accent:'#ff6b6b' },
  { href:'/dashboard/admin/couriers',  label:'Couriers',           icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', accent:'#ff6b6b' },
  { href:'/dashboard/admin/settings',  label:'Global Settings',    icon:'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', accent:'#ff6b6b' },
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
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
        <div className="font-mono-nb text-sm font-bold animate-pulse">Loading...</div>
      </div>
    );
  }

  const isSuperAdmin = user.role === 'super_admin';
  const items = isSuperAdmin ? [...MASTER_ITEMS, ...SUPER_ITEMS] : MASTER_ITEMS;
  const W = collapsed ? '72px' : '240px';
  const accentTop = isSuperAdmin ? '#ff6b6b' : '#c8f135';

  return (
    <div className="flex min-h-screen bg-[#fffaf0]">
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside
        style={{ width: W, minWidth: W, transition: 'width .2s ease' }}
        className="sticky top-0 h-screen flex flex-col bg-black overflow-y-auto overflow-x-hidden shrink-0 z-30"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b-2 border-[#1a1a1a]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex items-center justify-center font-black text-black text-base shrink-0"
                style={{
                  width: 38, height: 38,
                  background: accentTop,
                  border: '2.5px solid #000',
                  boxShadow: `3px 3px 0 ${accentTop}`,
                  borderRadius: 4,
                  fontSize: 18,
                }}
              >M</div>
              <div className="min-w-0">
                <div className="font-black text-white text-sm leading-tight">Mozopost</div>
                <div
                  className="font-mono-nb text-[8px] tracking-widest"
                  style={{ color: accentTop }}
                >
                  {isSuperAdmin ? 'SUPER ADMIN' : 'MASTER ADMIN'}
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="mx-auto flex items-center justify-center font-black text-black text-base"
              style={{
                width: 38, height: 38,
                background: accentTop,
                border: '2.5px solid #000',
                boxShadow: `3px 3px 0 ${accentTop}`,
                borderRadius: 4,
                fontSize: 18,
              }}
            >M</div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="text-[#444] hover:text-white ml-2 p-1 shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute right-0 top-4 translate-x-full bg-black border-2 border-l-0 border-[#333] p-1 text-[#444] hover:text-white"
              style={{ borderRadius: '0 4px 4px 0' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 overflow-y-auto space-y-1">
          {items.map(item => {
            const active = pathname === item.href
              || (item.href !== '/dashboard/admin' && pathname.startsWith(item.href));
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
                <span className="shrink-0" style={{ color: active ? '#000' : item.accent }}>
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
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-5 py-3"
          style={{
            background: accentTop,
            borderBottom: '2.5px solid #000',
            boxShadow: '0 4px 0 #000',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="font-black text-black text-sm">
              {isSuperAdmin ? 'Super Admin' : 'Master Admin'} Panel
            </span>
            <span
              className="font-mono-nb text-[10px] font-black text-white px-2 py-0.5"
              style={{ background: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000' }}
            >
              {user.firstName} {user.lastName}
            </span>
          </div>
          <span
            className="font-mono-nb text-[10px] font-black text-black px-2 py-0.5 uppercase"
            style={{ background: '#000', border: '2px solid #000', boxShadow: '2px 2px 0 #000', color: accentTop }}
          >
            {user.role.replace('_', ' ')}
          </span>
        </div>
        <div className="p-5">{children}</div>
      </main>
    </div>
  );
}
