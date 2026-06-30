"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const HEALTH_STYLE: Record<string, string> = {
  excellent: "bg-[#D1FAE5] text-[#065F46]",
  good: "bg-[#DBEAFE] text-[#1E40AF]",
  risk: "bg-[#FEF9C3] text-[#854D0E]",
  loss_making: "bg-[#FEE2E2] text-[#991B1B]",
};
const HEALTH_LABEL: Record<string, string> = {
  excellent: "🟢 Excellent",
  good: "🔵 Good",
  risk: "🟡 Risk",
  loss_making: "🔴 Loss Making",
};
const marginColor = (pct: number) =>
  pct >= 15
    ? "text-[#16A34A]"
    : pct >= 5
      ? "text-[#CA8A04]"
      : "text-[#DC2626] font-bold";

export default function PnlPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"merchants" | "couriers">(
    "merchants",
  );

  useEffect(() => {
    api
      .get("/reports/admin/pnl")
      .then((r) => setData(r.data))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#E5E8EF] border-t-[#4F46E5] rounded-full animate-spin"></div>
          <div className="text-sm text-[#64748B] animate-pulse">
            Loading P&L data...
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

  const p = data?.platform;
  const netProfit =
    (p?.total_margin ?? 0) - (p?.rto_loss ?? 0) - (p?.weight_refunded ?? 0);
  const marginPct =
    p?.total_revenue > 0 ? (netProfit / p.total_revenue) * 100 : 0;

  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Merchant P&L Report
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Profit & loss analytics across all merchants and couriers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white outline-none focus:border-[#4F46E5]">
            <option>All Time</option>
            <option>This Month</option>
            <option>Last 30 Days</option>
          </select>
          <button className="px-5 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors">
            ⬇ Export
          </button>
        </div>
      </div>

      {/* Platform Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] p-5 rounded-2xl shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Total Revenue
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            ₹{(p?.total_revenue || 0).toFixed(0)}
          </div>
        </div>
        <div className="bg-[#FEF2F2] p-5 rounded-2xl border border-[#FECACA] shadow-sm">
          <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-2">
            Courier Cost
          </div>
          <div className="text-2xl font-bold text-[#DC2626] font-mono">
            ₹{(p?.courier_cost_approx || 0).toFixed(0)}
          </div>
        </div>
        <div className="bg-[#F0FDF4] p-5 rounded-2xl border border-[#A7F3D0] shadow-sm">
          <div className="text-[10px] font-bold text-[#065F46] uppercase tracking-widest mb-2">
            Gross Margin
          </div>
          <div className="text-2xl font-bold text-[#16A34A] font-mono">
            ₹{(p?.total_margin || 0).toFixed(0)}
          </div>
        </div>
        <div
          className={`p-5 rounded-2xl border shadow-sm ${netProfit >= 0 ? "bg-[#F0FDF4] border-[#A7F3D0]" : "bg-[#FEF2F2] border-[#FECACA]"}`}
        >
          <div
            className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${netProfit >= 0 ? "text-[#065F46]" : "text-[#991B1B]"}`}
          >
            Net Profit
          </div>
          <div
            className={`text-2xl font-bold font-mono ${netProfit >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
          >
            ₹{netProfit.toFixed(0)}
          </div>
          <div
            className={`text-xs mt-1 font-semibold ${netProfit >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
          >
            {marginPct.toFixed(1)}% margin
          </div>
        </div>
        <div className="bg-[#FEF9C3] p-5 rounded-2xl border border-[#FEF08A] shadow-sm">
          <div className="text-[10px] font-bold text-[#854D0E] uppercase tracking-widest mb-2">
            RTO Loss
          </div>
          <div className="text-2xl font-bold text-[#CA8A04] font-mono">
            ₹{(p?.rto_loss || 0).toFixed(0)}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Total Orders
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">
            {p?.total_orders || 0}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Active Merchants
          </div>
          <div className="text-2xl font-bold text-[#4F46E5] font-mono">
            {p?.active_merchants || 0}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Weight Disputes
          </div>
          <div className="text-2xl font-bold text-[#DC2626] font-mono">
            ₹{(p?.weight_dispute_amt || 0).toFixed(0)}
          </div>
        </div>
      </div>

      {/* P&L Formula */}
      <div className="p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE]">
        <div className="font-bold text-sm text-[#4338CA] mb-2">
          💡 P&L Formula
        </div>
        <div className="text-xs text-[#4338CA] space-y-1 font-mono">
          <div>
            Seller Charged − Courier Cost ={" "}
            <span className="font-bold">Gross Profit</span>
          </div>
          <div>
            Gross Profit − COD Charges − RTO Loss − Weight Disputes ={" "}
            <span className="font-bold text-[#16A34A]">Net Profit</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E5E8EF]">
        {(["merchants", "couriers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === t ? "border-[#4F46E5] text-[#4F46E5]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
          >
            {t === "merchants" ? "👥 Merchant P&L" : "🚚 Courier P&L"}
          </button>
        ))}
      </div>

      {/* Merchant P&L */}
      {activeTab === "merchants" && (
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          {(data?.merchants || []).length === 0 ? (
            <div className="py-16 text-center text-sm text-[#94A3B8]">
              No merchant data yet. Place orders to see P&L.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                    {[
                      "Merchant",
                      "Orders",
                      "Revenue",
                      "Courier Cost",
                      "Gross Profit",
                      "RTO Loss",
                      "Net Profit",
                      "Margin%",
                      "Del. Rate",
                      "Health",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {(data?.merchants || []).map((m: any) => (
                    <tr
                      key={m.seller_id}
                      className={`hover:bg-[#F8F9FB] transition-colors ${m.healthBand === "loss_making" ? "bg-[#FFF7F7]" : m.healthBand === "risk" ? "bg-[#FFFBEB]" : ""}`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-[#0F172A]">
                        {m.business_name}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#0F172A]">
                        {m.orders}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-[#0F172A]">
                        ₹{m.revenue?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#64748B]">
                        ₹{m.courier_cost?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-[#16A34A]">
                        ₹{m.gross_profit?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#DC2626]">
                        ₹{m.rto_loss?.toFixed(0)}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-bold font-mono ${m.netProfit >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
                      >
                        ₹{m.netProfit?.toFixed(0)}
                      </td>
                      <td
                        className={`px-4 py-3 text-sm font-bold font-mono ${marginColor(m.marginPct)}`}
                      >
                        {m.marginPct?.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${(m.delivery_rate || 0) >= 85 ? "bg-[#D1FAE5] text-[#065F46]" : (m.delivery_rate || 0) >= 75 ? "bg-[#FEF9C3] text-[#854D0E]" : "bg-[#FEE2E2] text-[#991B1B]"}`}
                        >
                          {m.delivery_rate?.toFixed(1) || "—"}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${HEALTH_STYLE[m.healthBand] || "bg-[#F1F5F9] text-[#475569]"}`}
                        >
                          {HEALTH_LABEL[m.healthBand]}
                        </span>
                        <div className="text-[10px] text-[#94A3B8] mt-0.5">
                          {m.healthScore}/100
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Courier P&L */}
      {activeTab === "couriers" && (
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          {(data?.couriers || []).length === 0 ? (
            <div className="py-16 text-center text-sm text-[#94A3B8]">
              No courier data yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                    {[
                      "Courier",
                      "Orders",
                      "Revenue",
                      "Base Cost",
                      "Margin",
                      "RTO Count",
                      "Disputes ₹",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {(data?.couriers || []).map((c: any) => (
                    <tr
                      key={c.code}
                      className="hover:bg-[#F8F9FB] transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-[#0F172A]">
                        {c.courier_name}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#0F172A]">
                        {c.orders}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-[#0F172A]">
                        ₹{c.revenue?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#64748B]">
                        ₹{c.base_cost?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-[#16A34A]">
                        ₹{c.margin?.toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#0F172A]">
                        {c.rto_count}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[#DC2626]">
                        ₹{c.disputes_amt?.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
