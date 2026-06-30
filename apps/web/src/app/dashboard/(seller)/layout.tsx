"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { AddMoneyModal } from "@/components/AddMoneyModal";

/* ── Nav Structure ───────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
      },
    ],
  },
  {
    label: "Orders",
    items: [
      {
        href: "/dashboard/orders",
        label: "Orders",
        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      },
      {
        href: "/dashboard/pickups",
        label: "Pickups",
        icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
      },
    ],
  },
  {
    label: "Issues",
    items: [
      {
        href: "/dashboard/ndr",
        label: "NDR",
        icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      },
      {
        href: "/dashboard/disputes",
        label: "Weight Disputes",
        icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "/dashboard/wallet",
        label: "Wallet",
        icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
      },
      {
        href: "/dashboard/cod",
        label: "COD",
        icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
      },
      {
        href: "/dashboard/reports",
        label: "Reports",
        icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
      },
    ],
  },
  {
    label: "Tools",
    items: [
      {
        href: "/dashboard/stores",
        label: "Stores",
        icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
      },
      {
        href: "/dashboard/labels",
        label: "Labels",
        icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        href: "/dashboard/tickets",
        label: "Support",
        icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
      },
      {
        href: "/dashboard/profile",
        label: "Profile",
        icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      },
    ],
  },
];

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
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, fetchMe, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "seller")
      router.replace("/dashboard/admin");
  }, [loading, user, router]);

  useEffect(() => {
    const handleOpen = () => setWalletModalOpen(true);
    window.addEventListener("openWalletModal", handleOpen);
    return () => window.removeEventListener("openWalletModal", handleOpen);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EC]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#FFF8EC] font-black text-lg shadow-sm"
            style={{ background: "#546B41" }}
          >
            MP
          </div>
          <div className="text-sm text-[#8A9270] font-medium animate-pulse-soft font-mono-nb">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const W = collapsed ? "68px" : "226px";

  // Determine the single most specific active nav item
  const allNavItems = NAV_GROUPS.flatMap((g) => g.items);
  const activeNavItem = allNavItems
    .filter(
      (i) =>
        pathname === i.href ||
        (i.href !== "/dashboard" && pathname.startsWith(i.href)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

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
        className="sticky top-0 h-screen max-h-screen flex flex-col text-white overflow-hidden shrink-0 z-30 py-3"
      >
        {/* ── Logo & Toggle Header ── */}
        <div
          className={`flex items-center px-3.5 pb-3 border-b border-[rgba(255,255,255,0.2)] shrink-0 ${collapsed ? "justify-center" : "justify-between"}`}
          style={{ minHeight: 54 }}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <img src="/logo-cream.png" alt="MozoPost Logo" className="h-[28.8px] w-auto object-contain drop-shadow-sm" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[rgba(255,255,255,0.8)] hover:text-white hover:bg-[rgba(255,255,255,0.15)] w-8 h-8 rounded-md flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="black"
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
          {NAV_GROUPS.map((group) => (
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
                const active = activeNavItem?.href === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-[9px] transition-all duration-150 group text-[15px]
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
                        className={`leading-none text-[13.5px] truncate ${active ? "font-bold text-white" : ""}`}
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
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-[#FFF8EC] border-b border-[#EADFC8]"
          style={{ height: 60 }}
        >
          <div className="flex items-center gap-3"></div>
          <div className="flex items-center gap-3.5">
            {/* Wallet Quick Pill */}
            <button
              onClick={() => setWalletModalOpen(true)}
              className="flex items-center gap-3 bg-[#F1E3D9] border border-[#D4A895] rounded-[8px] pl-4 pr-1.5 py-1.5 hover:bg-[#E8D4C8] transition-colors cursor-pointer"
            >
              <span className="font-mono-nb font-medium text-sm text-[#AE5A3E] tracking-tight">
                ₹ {user.walletBalance! < 0 ? "-" : ""}
                {Math.abs(user.walletBalance ?? 0).toLocaleString("en-IN")}
              </span>
              <span className="w-7 h-7 rounded-[6px] bg-[#AE5A3E] text-white flex items-center justify-center text-lg font-medium leading-none pb-0.5">
                +
              </span>
            </button>

            {/* Notification bell */}
            <button className="w-7 h-7 rounded-full flex items-center justify-center text-[#6B7556] bg-[#FFF8EC] border border-[#E2D4B8] hover:border-[#D8CBAE] transition-colors relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* User chip / Profile redirect */}
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 pl-5 border-l border-[#EADFC8] group cursor-pointer"
              title="View Profile"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 shadow-sm transition-transform group-hover:scale-105"
                style={{
                  background:
                    "linear-gradient(135deg, #546B41 0%, #3C4E2D 100%)",
                }}
              >
                {(user.businessName || user.email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <div className="text-[15px] font-bold text-[#2F3A22] leading-tight group-hover:text-[#546B41] transition-colors">
                  {user.businessName || user.email}
                </div>
                <div className="text-[13px] text-[#8A9270] capitalize font-medium mt-0.5">
                  {user.role.replace("_", " ")}
                </div>
              </div>
            </Link>
          </div>
        </header>

        {/* ── Page content ── */}
        <div className="flex-1 p-6">{children}</div>
      </main>

      {/* ── Modals ── */}
      <AddMoneyModal
        open={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />
    </div>
  );
}
