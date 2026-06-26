"use client";

import { useState, useEffect } from "react";
import { api, apiErrorMessage } from "@/lib/api";

export default function CodReportsPage() {
  const [stats, setStats] = useState<any>(null);
  const [remittances, setRemittances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/cod");
      setStats(data.stats);
      setRemittances(data.remittances);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function formatDateShort(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  return (
    <div className="animate-fade-up mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">COD Reports</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Track Cash-on-Delivery remittances and settlement cycles.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            Total Collected
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">
            {loading
              ? "..."
              : `₹${(stats?.totalCollected || 0).toLocaleString("en-IN")}`}
          </div>
        </div>
        <div className="bg-[#FFFBEB] border-[#FEF08A] p-5 rounded-2xl shadow-sm border">
          <div className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest mb-1.5">
            Pending Release
          </div>
          <div className="text-2xl font-bold text-[#92400E] font-mono">
            {loading
              ? "..."
              : `₹${(stats?.pendingRelease || 0).toLocaleString("en-IN")}`}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            Next Settlement
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {loading ? "..." : formatDateShort(stats?.nextSettlement)}
          </div>
        </div>
        <div className="bg-[#F0FDF4] border-[#BBF7D0] p-5 rounded-2xl shadow-sm border">
          <div className="text-[10px] font-bold text-[#166534] uppercase tracking-widest mb-1.5">
            D+2 Cycle Pending
          </div>
          <div className="text-2xl font-bold text-[#16A34A] font-mono">
            {loading
              ? "..."
              : `₹${(stats?.d2Cycle || 0).toLocaleString("en-IN")}`}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E8EF] bg-white flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F172A]">
            Remittance History
          </h2>
          <button className="px-4 py-2 bg-white border border-[#E5E8EF] text-[#475569] text-xs font-semibold rounded-lg hover:bg-[#F8F9FB] hover:text-[#0F172A] transition-colors flex items-center gap-2 shadow-sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9FB] border-b border-[#E5E8EF]">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Created Date
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Due Date
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Orders
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Cycle
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[#94A3B8]"
                  >
                    Loading remittances...
                  </td>
                </tr>
              ) : remittances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F4F6F9] flex items-center justify-center mx-auto mb-3">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94A3B8"
                        strokeWidth="2"
                      >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-[#64748B]">
                      No COD remittances found.
                    </p>
                  </td>
                </tr>
              ) : (
                remittances.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#F1F3F7] hover:bg-[#F8F9FB] transition-colors"
                  >
                    <td className="px-5 py-4 text-[#475569] font-medium text-xs">
                      {formatDateShort(r.created_at)}
                    </td>
                    <td className="px-5 py-4 text-[#475569] font-medium text-xs">
                      {formatDateShort(r.due_date)}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs font-medium text-[#475569]">
                      {r.total_orders}
                    </td>
                    <td className="px-5 py-4 font-mono text-sm font-bold text-[#0F172A]">
                      ₹{parseFloat(r.net_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-[#0F172A] font-medium text-xs">
                      {r.payment_cycle}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "settled"
                            ? "bg-[#D1FAE5] text-[#065F46]"
                            : "bg-[#FEF3C7] text-[#92400E]"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
