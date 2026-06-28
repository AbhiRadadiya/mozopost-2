"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";

/* ── Nav Structure ───────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard/admin",
        label: "Dashboard",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
      {
        href: "/dashboard/admin/merchants",
        label: "All Merchants",
        icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/dashboard/admin/kyc",
        label: "KYC Verification",
        icon: "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        href: "/dashboard/admin/ndr-mgmt",
        label: "NDR Management",
        icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      },
      {
        href: "/dashboard/admin/pickups-mgmt",
        label: "Pickup Mgmt",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
      {
        href: "/dashboard/admin/disputes",
        label: "Weight Disputes",
        icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
      },
    ],
  },
  {
    label: "Finance & Pricing",
    items: [
      {
        href: "/dashboard/admin/margins",
        label: "Margins",
        icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      },
      {
        href: "/dashboard/admin/wallets",
        label: "Wallet Control",
        icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
      },
      {
        href: "/dashboard/admin/credit",
        label: "Credit Mgmt",
        icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
      },
      {
        href: "/dashboard/admin/cod",
        label: "COD Settlements",
        icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/dashboard/admin/utr",
        label: "UTR Entry",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        href: "/dashboard/admin/pnl",
        label: "P&L Reports",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      },
      {
        href: "/dashboard/admin/reports",
        label: "All Reports",
        icon: "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
    ],
  },
  {
    label: "System & Configuration",
    items: [
      {
        href: "/dashboard/admin/translations",
        label: "Address Translation",
        icon: "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.782 3 18.128",
      },
      {
        href: "/dashboard/admin/referrals",
        label: "Referrals",
        icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
      },
      {
        href: "/dashboard/admin/smtp",
        label: "SMTP & Email",
        icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      },
      {
        href: "/dashboard/admin/staff",
        label: "Staff Management",
        icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      },
    ],
  },
];

const SUPER_ADMIN_GROUP = {
  label: "Super Admin Tools",
  items: [
    {
      href: "/dashboard/admin/security",
      label: "Security Dashboard",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    },
    {
      href: "/dashboard/admin/risk",
      label: "Risk Management",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    },
    {
      href: "/dashboard/admin/roles",
      label: "Roles & Permissions",
      icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    },
    {
      href: "/dashboard/admin/couriers",
      label: "Couriers",
      icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    },
    {
      href: "/dashboard/admin/settings",
      label: "Global Settings",
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    },
  ],
};

/* ── NavIcon ─────────────────────────────────────────────── */
function NavIcon({
  d,
  size = 18,
  active = false,
}: {
  d: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? "2.5" : "1.75"}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d
        .split("M")
        .filter(Boolean)
        .map((seg, i) => (
          <path key={i} d={`M${seg}`} />
        ))}
    </svg>
  );
}

/* ── Layout ──────────────────────────────────────────────── */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role === "seller")
      router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || !user || user.role === "seller") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EC]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#FFF8EC] font-black text-lg"
            style={{ background: "#546B41" }}
          >
            MA
          </div>
          <div className="text-sm text-[#8A9270] font-medium animate-pulse-soft">
            Loading Admin Panel...
          </div>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user.role === "super_admin";
  const navGroups = isSuperAdmin
    ? [...NAV_GROUPS, SUPER_ADMIN_GROUP]
    : NAV_GROUPS;
  const W = collapsed ? "68px" : "240px";

  return (
    <div className="flex min-h-screen bg-[#FFF8EC]">
      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside
        style={{
          width: W,
          minWidth: W,
          background: "linear-gradient(180deg, #5C7347, #4A5F37)",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
        className="sticky top-0 h-screen flex flex-col text-white border-r border-[rgba(255,255,255,0.15)] overflow-y-auto overflow-x-hidden shrink-0 z-30"
      >
        {/* ── Logo & Toggle Header ── */}
        <div
          className={`flex items-center px-3.5 pb-3 pt-3 border-b border-[rgba(255,255,255,0.2)] shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}
          style={{ minHeight: 54 }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#546B41] font-bold text-sm shrink-0 bg-[#FFF8EC]">
                MP
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-base leading-tight">
                  MozoPost
                </div>
                <div className="text-[10px] text-[rgba(255,255,255,0.75)] font-medium uppercase">
                  {isSuperAdmin ? "SUPER ADMIN" : "MASTER ADMIN"}
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#546B41] font-bold text-sm shrink-0 bg-[#FFF8EC] shadow-sm cursor-pointer"
            >
              MP
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 flex items-center justify-center text-[rgba(255,255,255,0.65)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              {collapsed ? (
                <path d="M9 18l6-6-6-6" />
              ) : (
                <path d="M15 18l-6-6 6-6" />
              )}
            </svg>
          </button>
        </div>

        {/* ── Nav List (Scrollable Area) ── */}
        <nav className="flex-1 py-2 px-2.5 overflow-y-auto min-h-0 space-y-0.5">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              {/* {!collapsed && (
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-[rgba(255,255,255,0.65)] uppercase">
                  {group.label}
                </div>
              )} */}
              {collapsed && (
                <div className="pb-1 border-t border-[rgba(255,255,255,0.15)] mx-1 mt-1" />
              )}
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard/admin" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-[9px] transition-all duration-150 group text-[13px]
                      ${collapsed ? "justify-center" : ""}
                      ${
                        active
                          ? "bg-[rgba(255,255,255,0.22)] text-white font-bold"
                          : "text-[rgba(255,255,255,0.85)] hover:bg-[rgba(255,255,255,0.14)] hover:text-white font-normal"
                      }
                    `}
                  >
                    <span
                      className={`shrink-0 w-5 text-center transition-colors ${active ? "text-white" : "text-[rgba(255,255,255,0.75)] group-hover:text-white"}`}
                    >
                      <NavIcon d={item.icon} active={active} />
                    </span>
                    {!collapsed && (
                      <span
                        className={`leading-none truncate ${active ? "font-bold text-white" : ""}`}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Bottom Section (Always Visible) ── */}
        <div className="shrink-0 pt-2 border-t border-[rgba(255,255,255,0.2)] px-2.5 space-y-1 bg-transparent">
          {!collapsed && (
            <Link
              href="/dashboard/tickets"
              className="flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-white hover:bg-[rgba(255,255,255,0.18)] active:bg-[rgba(255,255,255,0.25)] transition-all text-xs cursor-pointer font-semibold bg-transparent"
            >
              <span className="w-4.5 h-4.5 rounded-full border border-white/80 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                ?
              </span>
              <span className="text-white font-semibold tracking-wide">
                Need help?
              </span>
            </Link>
          )}

          <button
            onClick={logout}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] bg-transparent
              text-white hover:bg-[rgba(255,255,255,0.18)] active:bg-[rgba(255,255,255,0.25)] transition-all text-xs cursor-pointer font-semibold
              ${collapsed ? "justify-center" : ""}
            `}
            title={collapsed ? "Logout" : undefined}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="shrink-0 text-white"
            >
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && (
              <span className="font-bold text-white tracking-wide">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-hidden flex flex-col bg-[#FFF8EC]">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-[#FFF8EC] border-b border-[#EADFC8]">
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-bold text-[#2F3A22]">
                {isSuperAdmin ? "Super Admin Panel" : "Master Admin Panel"}
              </div>
              <div className="text-xs text-[#8A9270] font-mono-nb">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* User chip */}
            <div className="flex items-center gap-2 pl-3 border-l border-[#EADFC8]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
                style={{
                  background:
                    "linear-gradient(135deg, #546B41 0%, #3C4E2D 100%)",
                }}
              >
                {(user.firstName || user.email || "A")[0].toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-[#2F3A22] leading-tight">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[10px] text-[#8A9270] capitalize font-medium">
                  {user.role.replace("_", " ")}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
