"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const marginColor = (pct: number) =>
  pct >= 15
    ? "text-[#546B41]"
    : pct >= 5
      ? "text-[#CA8A04]"
      : "text-[#991B1B] font-bold";

export default function UnifiedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"pnl" | "performance">("pnl");
  const [pnlSubTab, setPnlSubTab] = useState<"merchants" | "couriers">("merchants");

  // Data states
  const [pnlData, setPnlData] = useState<any>(null);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  async function loadData(isPolling = false) {
    if (!isPolling) setLoading(true);
    try {
      const [pnlRes, cRes, gRes] = await Promise.all([
        api.get("/reports/admin/pnl"),
        api.get("/reports/admin/courier-performance"),
        api.get("/reports/admin/merchant-growth"),
      ]);
      setPnlData(pnlRes.data);
      setCouriers(cRes.data.couriers || []);
      setGrowth(gRes.data || null);
    } catch (err) {
      if (!isPolling) setError(apiErrorMessage(err));
    } finally {
      if (!isPolling) setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#E2D4B8] border-t-[#546B41] rounded-full animate-spin"></div>
          <div className="text-sm text-[#8A9270] animate-pulse">
            Loading analytics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
        ⚠ {error}
      </div>
    );
  }

  const p = pnlData?.platform;
  const netProfit = (p?.total_margin ?? 0) - (p?.rto_loss ?? 0) - (p?.weight_refunded ?? 0);
  const marginPct = p?.total_revenue > 0 ? (netProfit / p.total_revenue) * 100 : 0;

  return (
    <div className="animate-fade-up mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22]">
            Analytics & P&L Dashboard
          </h1>
          <p className="text-sm text-[#8A9270] mt-1">
            Real-time Profit & Loss analytics and platform performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 text-sm border border-[#E2D4B8] rounded-xl bg-white outline-none focus:border-[#546B41] text-[#2F3A22]">
            <option>All Time</option>
            <option>This Month</option>
            <option>Last 30 Days</option>
          </select>
          <button className="px-5 py-2.5 bg-white border border-[#E2D4B8] text-[#546B41] text-sm font-semibold rounded-xl hover:bg-[#FAF4E6] transition-colors shadow-sm">
            ⬇ Export
          </button>
        </div>
      </div>

      {/* Unified Tabs */}
      <div className="flex border-b border-[#E2D4B8] mb-4">
        <button
          onClick={() => setActiveTab("pnl")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "pnl"
              ? "border-[#546B41] text-[#546B41]"
              : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
          }`}
        >
          Financial P&L
        </button>
        <button
          onClick={() => setActiveTab("performance")}
          className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "performance"
              ? "border-[#546B41] text-[#546B41]"
              : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
          }`}
        >
          Platform Performance
        </button>
      </div>

      {/* Financial P&L Tab */}
      {activeTab === "pnl" && (
        <div className="space-y-6 animate-fade-in">
          {/* Platform Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                Total Revenue
              </div>
              <div className="text-2xl font-bold text-[#2F3A22] font-mono">
                ₹{(p?.total_revenue || 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                Courier Cost
              </div>
              <div className="text-2xl font-bold text-[#DC2626] font-mono">
                ₹{(p?.courier_cost_approx || 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                Gross Margin
              </div>
              <div className="text-2xl font-bold text-[#546B41] font-mono">
                ₹{(p?.total_margin || 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                Net Profit
              </div>
              <div
                className={`text-2xl font-bold font-mono ${netProfit >= 0 ? "text-[#546B41]" : "text-[#DC2626]"}`}
              >
                ₹{netProfit.toFixed(0)}
              </div>
              <div
                className={`text-xs mt-1 font-semibold ${netProfit >= 0 ? "text-[#546B41]" : "text-[#DC2626]"}`}
              >
                {marginPct.toFixed(1)}% margin
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                RTO Loss
              </div>
              <div className="text-2xl font-bold text-[#CA8A04] font-mono">
                ₹{(p?.rto_loss || 0).toFixed(0)}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                Total Orders
              </div>
              <div className="text-2xl font-bold text-[#2F3A22] font-mono">
                {p?.total_orders || 0}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                Active Merchants
              </div>
              <div className="text-2xl font-bold text-[#546B41] font-mono">
                {p?.active_merchants || 0}
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                Weight Disputes
              </div>
              <div className="text-2xl font-bold text-[#DC2626] font-mono">
                ₹{(p?.weight_dispute_amt || 0).toFixed(0)}
              </div>
            </div>
          </div>

          {/* P&L Formula */}
          <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#E2D4B8]">
            <div className="font-bold text-sm text-[#546B41] mb-2">
              💡 P&L Formula
            </div>
            <div className="text-xs text-[#6B7556] space-y-1 font-mono">
              <div>
                Seller Charged − Courier Cost ={" "}
                <span className="font-bold">Gross Profit</span>
              </div>
              <div>
                Gross Profit − COD Charges − RTO Loss − Weight Disputes ={" "}
                <span className="font-bold text-[#546B41]">Net Profit</span>
              </div>
            </div>
          </div>

          {/* PNL Sub Tabs */}
          <div className="flex gap-0 border-b border-[#E2D4B8]">
            {(["merchants", "couriers"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setPnlSubTab(t)}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  pnlSubTab === t
                    ? "border-[#546B41] text-[#546B41]"
                    : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
                }`}
              >
                {t === "merchants" ? "👥 Merchant P&L" : "🚚 Courier P&L"}
              </button>
            ))}
          </div>

          {/* Merchant P&L */}
          {pnlSubTab === "merchants" && (
            <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Merchant
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Courier Cost
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Gross Margin
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Net Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF4E6]">
                    {(pnlData?.merchants || []).map((m: any) => {
                      const net = (m.total_margin || 0) - (m.rto_loss || 0);
                      const mPct =
                        m.total_revenue > 0 ? (net / m.total_revenue) * 100 : 0;
                      return (
                        <tr key={m.seller_id} className="hover:bg-[#FAF4E6] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="text-sm font-bold text-[#2F3A22]">
                              {m.business_name || "Unknown"}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#2F3A22]">
                            {m.total_orders}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono font-medium text-[#2F3A22]">
                            ₹{(m.total_revenue || 0).toFixed(0)}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#DC2626]">
                            ₹{(m.courier_cost_approx || 0).toFixed(0)}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono font-bold text-[#546B41]">
                            ₹{(m.total_margin || 0).toFixed(0)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div
                              className={`text-sm font-bold font-mono ${net >= 0 ? "text-[#546B41]" : "text-[#DC2626]"}`}
                            >
                              ₹{net.toFixed(0)}
                            </div>
                            <div className={`text-xs mt-0.5 ${marginColor(mPct)}`}>
                              {mPct.toFixed(1)}% margin
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Courier P&L */}
          {pnlSubTab === "couriers" && (
            <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden animate-fade-in">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Courier
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Gross Margin
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Health
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF4E6]">
                    {(pnlData?.couriers || []).map((c: any) => {
                      const mPct =
                        c.total_revenue > 0
                          ? (c.total_margin / c.total_revenue) * 100
                          : 0;
                      let health = "good";
                      if (mPct > 15) health = "excellent";
                      if (mPct < 5) health = "risk";
                      if (mPct < 0) health = "loss_making";

                      return (
                        <tr key={c.courier_code} className="hover:bg-[#FAF4E6] transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="text-sm font-bold text-[#2F3A22]">
                              {c.courier_name}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#2F3A22]">
                            {c.total_orders}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono font-medium text-[#2F3A22]">
                            ₹{(c.total_revenue || 0).toFixed(0)}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#DC2626]">
                            ₹{(c.courier_cost_approx || 0).toFixed(0)}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-sm font-bold font-mono text-[#546B41]">
                              ₹{(c.total_margin || 0).toFixed(0)}
                            </div>
                            <div className={`text-xs mt-0.5 ${marginColor(mPct)}`}>
                              {mPct.toFixed(1)}% margin
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#FAF4E6] text-[#546B41]">
                              {health.replace("_", " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platform Performance Tab */}
      {activeTab === "performance" && (
        <div className="space-y-8 animate-fade-in">
          {/* Courier Performance */}
          <div>
            <h2 className="text-base font-bold text-[#2F3A22] mb-4">
              Courier Performance
            </h2>
            <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Courier
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Total Orders
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Delivered
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        NDR
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        RTO
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Delivery Rate
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Avg Transit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF4E6]">
                    {couriers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-10 text-center text-sm text-[#8A9270]"
                        >
                          No courier data yet. Orders will appear here once placed.
                        </td>
                      </tr>
                    ) : (
                      couriers.map((c: any) => (
                        <tr
                          key={c.code}
                          className="hover:bg-[#FAF4E6] transition-colors"
                        >
                          <td className="px-5 py-3.5 text-sm font-semibold text-[#2F3A22]">
                            {c.name}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#2F3A22]">
                            {c.total_orders}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#546B41]">
                            {c.delivered}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#CA8A04]">
                            {c.ndr}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#DC2626]">
                            {c.rto}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-[#E2D4B8] rounded-full h-1.5 w-20">
                                <div
                                  className={`h-1.5 rounded-full ${(c.delivery_rate || 0) >= 85 ? "bg-[#546B41]" : (c.delivery_rate || 0) >= 75 ? "bg-[#CA8A04]" : "bg-[#DC2626]"}`}
                                  style={{ width: `${c.delivery_rate || 0}%` }}
                                />
                              </div>
                              <span
                                className={`text-xs font-bold ${(c.delivery_rate || 0) >= 85 ? "text-[#546B41]" : (c.delivery_rate || 0) >= 75 ? "text-[#CA8A04]" : "text-[#DC2626]"}`}
                              >
                                {c.delivery_rate || "—"}%
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#6B7556]">
                            {c.avg_transit_days ? `${c.avg_transit_days}d` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Top Merchants */}
          <div>
            <h2 className="text-base font-bold text-[#2F3A22] mb-4">
              Top Merchants by Revenue
            </h2>
            <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Merchant
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF4E6]">
                    {(growth?.topMerchants || []).length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-sm text-[#8A9270]"
                        >
                          No merchant data yet.
                        </td>
                      </tr>
                    ) : (
                      (growth?.topMerchants || []).map((m: any, i: number) => (
                        <tr
                          key={m.business_name}
                          className="hover:bg-[#FAF4E6] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <span
                              className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-[#FEF9C3] text-[#854D0E]" : i === 1 ? "bg-[#E2D4B8] text-[#2F3A22]" : "bg-[#FEF3C7] text-[#B45309]"}`}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-[#2F3A22]">
                            {m.business_name}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-[#2F3A22]">
                            {m.orders}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#546B41]">
                            ₹{m.revenue?.toFixed(0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
