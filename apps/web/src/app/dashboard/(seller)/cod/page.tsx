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
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [selectedTxns, setSelectedTxns] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, [search, date]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams();
      if (search) qs.append("search", search);
      if (date) qs.append("date", date);
      
      const { data } = await api.get(`/cod?${qs.toString()}`);
      setStats(data.stats);
      setRemittances(data.remittances);
      setSelectedTxns(new Set());
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

  function handleExport() {
    if (selectedTxns.size === 0) return;
    const toDownload = remittances.filter((r: any) => selectedTxns.has(r.id));
    
    const header = "Created Date,Due Date,Orders,Amount,Cycle,Status\n";
    const rows = toDownload.map((r: any) => {
      const cDate = formatDateShort(r.created_at).replace(/,/g, '');
      const dDate = formatDateShort(r.due_date).replace(/,/g, '');
      return `${cDate},${dDate},${r.total_orders},${r.net_amount},${r.payment_cycle},${r.status}`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cod_remittances.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSelectedTxns(new Set());
  }

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
        <div className="px-5 py-4 border-b border-[#EADFC8] bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[#2F3A22]">
            ▤ Remittance History
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cycle/ID..."
                className="bg-white border border-[#EADFC8] rounded-lg pl-8 pr-4 py-1.5 text-xs font-medium text-[#2F3A22] outline-none focus:border-[#546B41] shadow-sm w-40"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#8A9270]" />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white border border-[#EADFC8] rounded-lg px-4 py-1.5 text-xs text-[#6B7556] outline-none focus:border-[#546B41] font-medium shadow-sm"
            />
            <button 
              onClick={() => {
                setSearch("");
                setDate("");
              }}
              className="px-4 py-1.5 bg-white border border-[#EADFC8] text-[#6B7556] text-xs font-bold rounded-lg hover:bg-[#FFF8EC] transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <polyline points="3 3 3 8 8 8" />
              </svg>
              Reset
            </button>
            <button 
              onClick={handleExport}
              disabled={selectedTxns.size === 0}
              className={`px-4 py-1.5 border border-[#EADFC8] text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm ${
                selectedTxns.size > 0 
                  ? 'bg-white text-[#6B7556] hover:bg-[#F8F9F7] hover:text-[#2F3A22]'
                  : 'bg-[#F4F6F0] text-[#A3A898] cursor-not-allowed opacity-70'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              Export {selectedTxns.size > 0 && `(${selectedTxns.size})`}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9F7] border-b border-[#EADFC8]">
              <tr>
                <th className="px-5 py-3.5 w-10 text-left">
                  <input 
                    type="checkbox" 
                    className="rounded border-[#CBD7B5] text-[#546B41] focus:ring-[#546B41] w-4 h-4"
                    checked={remittances.length > 0 && selectedTxns.size === remittances.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTxns(new Set(remittances.map(r => r.id)));
                      else setSelectedTxns(new Set());
                    }}
                  />
                </th>
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
                    colSpan={7}
                    className="px-5 py-12 text-center text-[#8A9270] text-sm font-medium"
                  >
                    Loading remittances...
                  </td>
                </tr>
              ) : remittances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
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
                      <td className="px-5 py-4 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#CBD7B5] text-[#546B41] focus:ring-[#546B41] w-4 h-4"
                          checked={selectedTxns.has(r.id)}
                          onChange={(e) => {
                            const next = new Set(selectedTxns);
                            if (e.target.checked) next.add(r.id);
                            else next.delete(r.id);
                            setSelectedTxns(next);
                          }}
                        />
                      </td>
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
