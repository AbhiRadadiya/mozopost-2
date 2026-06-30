"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

export default function NdrMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [insights, setInsights] = useState<any>(null);
  const [ndrs, setNdrs] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: insightsData }, { data: listData }] = await Promise.all([
        api.get("/admin/ndr/insights"),
        api.get("/admin/ndr/list?limit=50"),
      ]);
      setInsights(insightsData);
      setNdrs(listData.ndrs);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkAction(action: string, orderId: string) {
    if (!confirm(`Are you sure you want to mark this NDR as ${action}?`)) return;
    try {
      await api.post("/admin/ndr/bulk-action", {
        orderIds: [orderId],
        action,
      });
      load(); // Reload to refresh list and insights
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  // Helper for progress bar colors
  const getProgressColor = (index: number) => {
    const colors = ["bg-[#546B41]", "bg-[#8A9270]", "bg-[#E2D4B8]", "bg-[#8A9270]", "bg-[#991B1B]"];
    return colors[index % colors.length];
  };

  return (
    <div className="animate-fade-up pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold tracking-tight text-[#2F3A22]">
              NDR Oversight
            </h1>
            <span className="text-[14px] font-mono text-[#8A9270] bg-[#FAF4E6] px-2 py-0.5 rounded-md">
              platform-wide
            </span>
          </div>
          <p className="text-[13px] text-[#8A9270] mt-1">
            Non-delivery reports across the network — spot patterns by reason, courier and seller.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] mb-6">
          {error}
        </div>
      )}

      {loading && !insights ? (
        <div className="py-16 text-center text-sm text-[#8A9270] animate-pulse">
          Loading insights...
        </div>
      ) : (
        insights && (
          <div className="space-y-6">
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-[#E2D4B8] rounded-[12px] p-5 shadow-sm">
                <div className="text-[12px] text-[#8A9270] mb-2 font-medium">Open NDRs</div>
                <div className="text-[28px] font-bold text-[#2F3A22] leading-none mb-2">
                  {insights.metrics.openNdrs.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#8A9270]">platform-wide</div>
              </div>
              <div className="bg-white border border-[#E2D4B8] rounded-[12px] p-5 shadow-sm">
                <div className="text-[12px] text-[#8A9270] mb-2 font-medium">Avg resolution</div>
                <div className="text-[28px] font-bold text-[#546B41] leading-none mb-2">
                  {insights.metrics.avgResolutionHours}h
                </div>
                <div className="text-[11px] text-[#6B7556]">platform-wide</div>
              </div>
              <div className="bg-white border border-[#E2D4B8] rounded-[12px] p-5 shadow-sm">
                <div className="text-[12px] text-[#8A9270] mb-2 font-medium">NDR → Delivered</div>
                <div className="text-[28px] font-bold text-[#546B41] leading-none mb-2">
                  {insights.metrics.pctDelivered}%
                </div>
                <div className="text-[11px] text-[#8A9270]">after re-attempt</div>
              </div>
              <div className="bg-white border border-[#E2D4B8] rounded-[12px] p-5 shadow-sm">
                <div className="text-[12px] text-[#8A9270] mb-2 font-medium">NDR → RTO</div>
                <div className="text-[28px] font-bold text-[#991B1B] leading-none mb-2">
                  {insights.metrics.pctRto}%
                </div>
                <div className="text-[11px] text-[#8A9270]">escalated to return</div>
              </div>
            </div>

            {/* ── Insights Grid ── */}
            <div className="grid grid-cols-2 gap-6">
              {/* NDR by reason */}
              <div className="bg-white border border-[#E2D4B8] rounded-[12px] p-6 shadow-sm">
                <h3 className="text-[15px] font-bold text-[#2F3A22] mb-6">NDR by reason</h3>
                <div className="space-y-5">
                  {insights.reasons.length === 0 && <div className="text-[13px] text-[#8A9270]">No data available.</div>}
                  {insights.reasons.map((r: any, idx: number) => (
                    <div key={r.reason}>
                      <div className="flex justify-between items-end mb-1.5">
                        <span className="text-[13px] font-medium text-[#2F3A22] capitalize">
                          {r.reason.replace(/_/g, " ")}
                        </span>
                        <span className="text-[12px] text-[#8A9270] font-mono">{r.percentage}%</span>
                      </div>
                      <div className="w-full bg-[#FAF4E6] h-[6px] rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressColor(idx)} rounded-full`}
                          style={{ width: `${r.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sellers with highest NDR */}
              <div className="bg-white border border-[#E2D4B8] rounded-[12px] p-6 shadow-sm">
                <h3 className="text-[15px] font-bold text-[#2F3A22] mb-4">Sellers with highest NDR</h3>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2D4B8]">
                      <th className="pb-3 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">Seller</th>
                      <th className="pb-3 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider text-right">NDR</th>
                      <th className="pb-3 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider text-right">Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.sellers.length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-[13px] text-[#8A9270] text-center">No sellers found.</td></tr>
                    )}
                    {insights.sellers.map((s: any, idx: number) => (
                      <tr key={idx} className="border-b border-[#FAF4E6] last:border-0">
                        <td className="py-3 text-[13px] font-medium text-[#2F3A22]">{s.seller}</td>
                        <td className="py-3 text-[13px] font-bold text-[#991B1B] text-right">{s.ndrCount}</td>
                        <td className="py-3 text-[13px] text-[#6B7556] text-right">{s.resolvedPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Data List ── */}
            <div className="mt-8">
              <h3 className="text-[16px] font-bold text-[#2F3A22] mb-4">Live NDR Queue</h3>
              <div className="bg-white border border-[#E2D4B8] rounded-[12px] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#FAF4E6] border-b border-[#E2D4B8]">
                        <th className="py-3 px-4 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider whitespace-nowrap">Order ID / AWB</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider whitespace-nowrap">Seller</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">Courier</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">Consignee</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">Reason</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">Attempt</th>
                        <th className="py-3 px-4 text-[11px] font-bold text-[#8A9270] uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ndrs.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-[#8A9270] text-[13px]">No open NDRs.</td></tr>
                      )}
                      {ndrs.map((n) => (
                        <tr key={n.id} className="border-b border-[#E2D4B8] last:border-0 hover:bg-[#FAF4E6]/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="text-[13px] font-bold text-[#2F3A22] font-mono">{n.mozopost_order_id}</div>
                            <div className="text-[11px] text-[#8A9270] font-mono">{n.awb_number}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[13px] font-medium text-[#2F3A22] whitespace-nowrap">{n.business_name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[13px] text-[#6B7556]">{n.courier_name}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[13px] font-medium text-[#2F3A22]">{n.consignee_name}</div>
                            <div className="text-[11px] text-[#8A9270]">{n.consignee_phone}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF9C3] text-[#854D0E] whitespace-nowrap">
                              {n.ndr_reason.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[13px] font-mono text-[#6B7556]">
                            {n.attempt_number}/3
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {n.attempt_number < 3 && (
                                <button 
                                  onClick={() => handleBulkAction("reattempt", n.order_id)}
                                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#FAF4E6] border border-[#E2D4B8] text-[#546B41] rounded-[6px] hover:bg-[#EADFC8] transition-colors"
                                >
                                  Re-attempt
                                </button>
                              )}
                              <button 
                                onClick={() => handleBulkAction("rto", n.order_id)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] rounded-[6px] hover:bg-[#FEE2E2] transition-colors"
                              >
                                RTO
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
