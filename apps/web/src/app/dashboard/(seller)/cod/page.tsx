"use client";

import { useState, useEffect } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const STATUS_COLOR: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  settled: {
    bg: "bg-[#EDF0E4]",
    text: "text-[#546B41]",
    border: "border-[#CBD7B5]",
  },
  pending: {
    bg: "bg-[#FFFBEB]",
    text: "text-[#D97706]",
    border: "border-[#FDE68A]",
  },
  processing: {
    bg: "bg-[#FFFBEB]",
    text: "text-[#D97706]",
    border: "border-[#FDE68A]",
  },
};

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
      year: "numeric",
    });
  }

  const cards = [
    {
      label: "Total Collected",
      sub: "All time COD volume",
      value: loading
        ? "..."
        : `₹${(stats?.totalCollected || 0).toLocaleString("en-IN")}`,
      color: "#2F3A22",
      iconBg: "#F6EEDB",
      icon: "💰",
    },
    {
      label: "Pending Release",
      sub: "Awaiting settlement",
      value: loading
        ? "..."
        : `₹${(stats?.pendingRelease || 0).toLocaleString("en-IN")}`,
      color: "#D97706",
      iconBg: "#FFFBEB",
      icon: "⏳",
    },
    {
      label: "Next Settlement",
      sub: "Scheduled payout date",
      value: loading ? "..." : formatDateShort(stats?.nextSettlement),
      color: "#546B41",
      iconBg: "#EDF0E4",
      icon: "📅",
      isDate: true,
    },
    {
      label: "D+2 Cycle Pending",
      sub: "In process cycle",
      value: loading
        ? "..."
        : `₹${(stats?.d2Cycle || 0).toLocaleString("en-IN")}`,
      color: "#546B41",
      iconBg: "#EDF0E4",
      icon: "🔄",
    },
  ];

  return (
    <div className="animate-fade-up mx-auto  pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">
            COD Reports
          </h1>
          <p className="text-xs text-[#8A9270] mt-1 font-medium">
            Track Cash-on-Delivery remittances and settlement cycles.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-bold text-[#A84A3B]">
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((c, i) => (
          <div
            key={i}
            className="bg-white border border-[#EADFC8] rounded-xl p-5 flex items-start justify-between shadow-sm"
          >
            <div>
              <div className="text-[11px] text-[#8A9270] uppercase tracking-widest font-bold">
                {c.label}
              </div>
              <div className="text-xs text-[#8A9270] mt-1.5">{c.sub}</div>
              <div
                className={`text-2xl font-bold mt-3.5 ${c.isDate ? "" : "font-mono"}`}
                style={{ color: c.color }}
              >
                {c.value}
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
              style={{ backgroundColor: c.iconBg, color: c.color }}
            >
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EADFC8] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EADFC8] bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[#2F3A22]">
            ▤ Remittance History
          </div>
          <button className="px-4 py-2 bg-white border border-[#EADFC8] text-[#6B7556] text-xs font-bold rounded-lg hover:bg-[#F8F9F7] hover:text-[#2F3A22] transition-colors flex items-center gap-2 shadow-sm">
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
            <thead className="bg-[#F8F9F7] border-b border-[#EADFC8]">
              <tr>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Cycle
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADFC8]">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[#8A9270] text-sm font-medium"
                  >
                    Loading remittances...
                  </td>
                </tr>
              ) : remittances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#EDF0E4] flex items-center justify-center mx-auto mb-3 border border-[#CBD7B5]">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#546B41"
                        strokeWidth="2"
                      >
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"></path>
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-[#2F3A22]">
                      No COD remittances found.
                    </p>
                  </td>
                </tr>
              ) : (
                remittances.map((r) => {
                  const statusStyle =
                    STATUS_COLOR[r.status] || STATUS_COLOR.pending;

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-[#F8F9F7] transition-colors"
                    >
                      <td className="px-5 py-4 text-[#6B7556] font-medium text-xs">
                        {formatDateShort(r.created_at)}
                      </td>
                      <td className="px-5 py-4 text-[#6B7556] font-medium text-xs">
                        {formatDateShort(r.due_date)}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-[#2F3A22]">
                        {r.total_orders}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm font-bold text-[#2F3A22]">
                        ₹{parseFloat(r.net_amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-[#2F3A22] font-semibold text-xs">
                        {r.payment_cycle}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
