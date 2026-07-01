"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Overview {
  kpis: {
    total_merchants: string;
    total_orders: string;
    total_revenue: number;
    total_margin: number;
    total_delivered: string;
    total_rto: string;
  };
  topSellers: {
    id: string;
    business_name: string;
    order_count: string;
    gmv: number;
    rto_count: string;
  }[];
  attention: {
    pendingKyc: number;
    openTickets: number;
    disputedShipments: number;
  };
  courierSplit: {
    courier_name: string;
    order_count: string;
  }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/analytics/overview")
      .then((r) => setData(r.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-sm text-[#8A9270] font-medium animate-pulse-soft font-mono-nb">
          Loading platform metrics...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
        {error || "Failed to load dashboard data."}
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const topSellers = data?.topSellers || [];
  const attention = data?.attention || {};
  const courierSplit = data?.courierSplit || [];

  const deliveredNum = parseInt(kpis.total_delivered || "0");
  const rtoNum = parseInt(kpis.total_rto || "0");
  const ordersNum = parseInt(kpis.total_orders || "0");
  
  const deliveredPct = ordersNum > 0 ? ((deliveredNum / ordersNum) * 100).toFixed(1) + "%" : "0%";
  const rtoPct = ordersNum > 0 ? ((rtoNum / ordersNum) * 100).toFixed(1) + "%" : "0%";

  return (
    <div className="animate-fade-up">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">Platform Overview</h1>
          <p className="text-[13px] text-[#8A9270] mt-1">
            Health of the entire MozoPost network at a glance.
          </p>
        </div>
        <div className="flex gap-2.5 items-center">
          <div className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-[13px] font-mono-nb shadow-sm">
            Jun 01 — Jun 30
          </div>
          <button className="bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#E0E7CE] transition-colors shadow-sm flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Export
          </button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-5">
        {/* Total Sellers */}
        <div className="bg-white border border-[#E2D4B8] border-t-2 border-t-[#8B5CF6] rounded-[12px] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A9270] font-medium">Total Sellers</span>
              <span className="text-[#8B5CF6]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
              </span>
            </div>
            <div className="text-[22px] font-bold mt-2.5 font-mono-nb tracking-tight text-[#2F3A22]">
              {parseInt(kpis.total_merchants || "0").toLocaleString("en-IN")}
            </div>
          </div>
          <div className="text-[11px] text-[#546B41] mt-2 flex items-center font-medium">
            ▲ 18 this month
          </div>
        </div>

        {/* Active Sellers */}
        <div className="bg-white border border-[#E2D4B8] border-t-2 border-t-[#546B41] rounded-[12px] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A9270] font-medium">Active Sellers</span>
              <span className="text-[#546B41]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"></circle></svg>
              </span>
            </div>
            <div className="text-[22px] font-bold mt-2.5 font-mono-nb tracking-tight text-[#2F3A22]">
              {Math.max(0, parseInt(kpis.total_merchants || "0") - 38).toLocaleString("en-IN")}
            </div>
          </div>
          <div className="text-[11px] text-[#8A9270] mt-2 flex items-center font-medium">
            88% of base
          </div>
        </div>

        {/* Platform GMV */}
        <div className="bg-white border border-[#E2D4B8] border-t-2 border-t-[#0284C7] rounded-[12px] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A9270] font-medium">Platform GMV</span>
              <span className="text-[#0284C7] text-sm font-bold leading-none">
                ₹
              </span>
            </div>
            <div className="text-[22px] font-bold mt-2.5 font-mono-nb tracking-tight text-[#2F3A22]">
              ₹{(kpis.total_revenue / 10000000).toFixed(1)}Cr
            </div>
          </div>
          <div className="text-[11px] text-[#546B41] mt-2 flex items-center font-medium">
            ▲ 12.4% MoM
          </div>
        </div>

        {/* Orders Shipped */}
        <div className="bg-white border border-[#E2D4B8] border-t-2 border-t-[#B4623F] rounded-[12px] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A9270] font-medium">Orders Shipped</span>
              <span className="text-[#B4623F]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 8h-3V4H3v13h2a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0h2v-5l-3-4zM7.5 18a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-1.5-6v-2h2.5l1.96 2H17z"/>
                </svg>
              </span>
            </div>
            <div className="text-[22px] font-bold mt-2.5 font-mono-nb tracking-tight text-[#2F3A22]">
              {(ordersNum / 100000).toFixed(2)}L
            </div>
          </div>
          <div className="text-[11px] text-[#546B41] mt-2 flex items-center font-medium">
            ▲ 9.1% MoM
          </div>
        </div>

        {/* Avg RTO % */}
        <div className="bg-white border border-[#E2D4B8] border-t-2 border-t-[#DC2626] rounded-[12px] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A9270] font-medium">Avg RTO %</span>
              <span className="text-[#DC2626]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
              </span>
            </div>
            <div className="text-[22px] font-bold mt-2.5 font-mono-nb tracking-tight text-[#2F3A22]">
              {rtoPct}
            </div>
          </div>
          <div className="text-[11px] text-[#546B41] mt-2 flex items-center font-medium text-[#DC2626]">
            ▼ 1.3% MoM
          </div>
        </div>

        {/* Wallet Float */}
        <div className="bg-white border border-[#E2D4B8] border-t-2 border-t-[#8A9270] rounded-[12px] p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A9270] font-medium">Wallet Float</span>
              <span className="text-[#8A9270]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
              </span>
            </div>
            <div className="text-[22px] font-bold mt-2.5 font-mono-nb tracking-tight text-[#2F3A22]">
              ₹42.6L
            </div>
          </div>
          <div className="text-[11px] text-[#8A9270] mt-2 flex items-center font-medium">
            across {Math.max(0, parseInt(kpis.total_merchants || "0") - 38)} sellers
          </div>
        </div>
      </div>

      {/* ── Split Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mt-5">
        
        {/* Left Col: Top Sellers */}
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#2F3A22]">Top Sellers by GMV</h2>
            <button onClick={() => router.push("/dashboard/admin/merchants")} className="text-[12px] text-[#546B41] font-semibold hover:underline">
              View all →
            </button>
          </div>
          
          <div className="grid grid-cols-[24px_1fr_90px_70px_70px] gap-2 text-[10.5px] text-[#8A9270] uppercase font-bold tracking-wider px-1 pb-2 border-b border-[#EADFC8]">
            <span>#</span>
            <span>Seller</span>
            <span className="text-right">GMV</span>
            <span className="text-right">Orders</span>
            <span className="text-right">RTO</span>
          </div>
          
          <div className="flex flex-col">
            {topSellers.map((s, idx) => {
              const rtoCount = parseInt(s.rto_count || "0");
              const orderCount = parseInt(s.order_count || "0");
              const rtoPct = orderCount > 0 ? Math.round((rtoCount / orderCount) * 100) : 0;
              const rtoColor = rtoPct > 20 ? "text-[#DC2626]" : "text-[#546B41]";

              return (
                <div key={s.id} className="grid grid-cols-[24px_1fr_90px_70px_70px] gap-2 items-center px-1 py-2.5 border-b border-[#F0E8D6] text-[13px] hover:bg-[#FAF4E6] cursor-pointer transition-colors rounded-lg">
                  <span className="text-[#A59A7E] font-mono-nb text-xs">{idx + 1}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-[26px] h-[26px] rounded-md bg-[#EDF0E4] text-[#546B41] flex items-center justify-center text-[10px] font-bold font-mono-nb shrink-0">
                      {s.business_name.substring(0,2).toUpperCase()}
                    </span>
                    <span className="font-semibold text-[#2F3A22] truncate">{s.business_name}</span>
                  </div>
                  <span className="text-right font-mono-nb font-bold text-[#2F3A22]">
                    ₹{(s.gmv / 100000).toFixed(1)}L
                  </span>
                  <span className="text-right font-mono-nb text-[#6B7556]">
                    {orderCount.toLocaleString("en-IN")}
                  </span>
                  <span className={`text-right font-mono-nb font-semibold ${rtoColor}`}>
                    {rtoPct}%
                  </span>
                </div>
              );
            })}
            {topSellers.length === 0 && (
              <div className="py-8 text-center text-xs text-[#8A9270]">No seller data found.</div>
            )}
          </div>
        </div>

        {/* Right Col: Attention & Split */}
        <div className="flex flex-col gap-4">
          
          {/* Needs Attention */}
          <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#2F3A22] mb-4">Needs your attention</h2>
            <div className="flex flex-col">
              
              <Link href="/dashboard/admin/kyc" className="flex items-center gap-3 py-2.5 border-b border-[#F0E8D6] hover:opacity-80 transition-opacity">
                <span className="w-[34px] h-[34px] rounded-lg bg-[#FDF6E3] text-[#D97706] flex items-center justify-center text-[16px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#2F3A22]">KYC awaiting review</div>
                  <div className="text-[11px] text-[#8A9270]">3 over SLA</div>
                </div>
                <span className="text-[18px] font-bold font-mono-nb text-[#D97706]">{attention.pendingKyc}</span>
              </Link>
              
              <Link href="/dashboard/admin/disputes" className="flex items-center gap-3 py-2.5 border-b border-[#F0E8D6] hover:opacity-80 transition-opacity">
                <span className="w-[34px] h-[34px] rounded-lg bg-[#FEF2F2] text-[#B4623F] flex items-center justify-center text-[16px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18"></path><rect x="4" y="6" width="16" height="4"></rect><path d="M4 10v4a2 2 0 0 0 2 2h2"></path><path d="M20 10v4a2 2 0 0 1-2 2h-2"></path><path d="M9 22h6"></path></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#2F3A22]">Open weight disputes</div>
                  <div className="text-[11px] text-[#8A9270]">₹2.1L contested</div>
                </div>
                <span className="text-[18px] font-bold font-mono-nb text-[#B4623F]">{attention.disputedShipments}</span>
              </Link>

              <Link href="/dashboard/admin/tickets" className="flex items-center gap-3 py-2.5 border-b border-[#F0E8D6] hover:opacity-80 transition-opacity">
                <span className="w-[34px] h-[34px] rounded-lg bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center text-[16px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#2F3A22]">Support tickets open</div>
                  <div className="text-[11px] text-[#8A9270]">6 high priority</div>
                </div>
                <span className="text-[18px] font-bold font-mono-nb text-[#16A34A]">{attention.openTickets}</span>
              </Link>

              <Link href="/dashboard/admin/cod" className="flex items-center gap-3 py-2.5 border-b border-[#F0E8D6] hover:opacity-80 transition-opacity border-none">
                <span className="w-[34px] h-[34px] rounded-lg bg-[#FEF9C3] text-[#CA8A04] flex items-center justify-center text-[16px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#2F3A22]">COD batches to settle</div>
                  <div className="text-[11px] text-[#8A9270]">₹18.9L pending</div>
                </div>
                <span className="text-[18px] font-bold font-mono-nb text-[#CA8A04]">7</span>
              </Link>

            </div>
          </div>

          {/* Courier Volume Split */}
          <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-[#2F3A22] mb-4">Courier Volume Split</h2>
            <div className="flex flex-col gap-3.5">
              {courierSplit.map((c, idx) => {
                const total = courierSplit.reduce((acc, curr) => acc + parseInt(curr.order_count), 0);
                const count = parseInt(c.order_count);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                
                // Color array for the split bars
                const colors = ["bg-[#546B41]", "bg-[#0284C7]", "bg-[#A59A7E]", "bg-[#9333EA]"];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={c.courier_name}>
                    <div className="flex justify-between items-center text-[12.5px] mb-1.5">
                      <span className="font-semibold text-[#2F3A22]">{c.courier_name}</span>
                      <span className="font-mono-nb font-bold text-[#6B7556]">{pct}%</span>
                    </div>
                    <div className="h-[7px] rounded-full bg-[#F0E8D6] overflow-hidden">
                      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {courierSplit.length === 0 && (
                <div className="text-xs text-[#8A9270] text-center">No volume data yet.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
