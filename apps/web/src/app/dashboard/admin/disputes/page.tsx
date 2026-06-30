"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

interface Dispute {
  id: string;
  business_name: string;
  mozopost_order_id: string;
  awb_number: string | null;
  courier_name: string | null;
  seller_weight_gm: number;
  courier_weight_gm: number;
  difference_gm: number;
  difference_pct: string;
  disputed_amount: string;
  approved_refund_amount: string | null;
  status: string;
  auto_flagged: boolean;
  escalated: boolean;
  reason: string;
  seller_remarks: string | null;
  admin_remarks: string | null;
  proof_video_url: string | null;
  created_at: string;
}
interface Stats {
  open: string;
  under_review: string;
  refund_pending: string;
  refund_processed: string;
  auto_flagged: string;
  total_disputed: number;
  refund_pending_amt: number;
  refund_done_amt: number;
}
interface CourierReport {
  courier_name: string;
  courier_code: string;
  total_disputes: string;
  open: string;
  approved: string;
  rejected: string;
  total_disputed_amt: number;
  total_refunded_amt: number;
  avg_diff_pct: string;
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-[#FEF9C3] text-[#854D0E]",
  under_review: "bg-[#EADFC8] text-[#546B41]",
  approved: "bg-[#D1FAE5] text-[#065F46]",
  rejected: "bg-[#FAF4E6] text-[#6B7556]",
  refund_pending: "bg-[#FEF9C3] text-[#854D0E]",
  refund_processed: "bg-[#D1FAE5] text-[#065F46]",
};

export default function AdminDisputesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [report, setReport] = useState<CourierReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveDispute, setResolveDispute] = useState<Dispute | null>(null);
  const [resolveAction, setResolveAction] = useState<
    "approve" | "reject" | "on_hold"
  >("approve");
  const [approveAmt, setApproveAmt] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [resolving, setResolving] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "courier">("all");

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 15000); // 15s realtime polling
    return () => clearInterval(interval);
  }, []);

  async function load(isPolling = false) {
    if (!isPolling) setLoading(true);
    try {
      const [statsRes, listRes, reportRes] = await Promise.all([
        api.get("/admin/weight-disputes/stats"),
        api.get("/admin/weight-disputes"),
        api.get("/admin/weight-disputes/courier-report"),
      ]);
      setStats(statsRes.data.stats);
      setDisputes(listRes.data.disputes);
      setReport(reportRes.data.report);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function resolve() {
    if (!resolveId) return;
    if (resolveAction === "reject" && !declineReason.trim()) {
      setError("Please enter a decline reason before rejecting the dispute.");
      return;
    }
    setResolving(true);
    try {
      await api.patch(`/admin/weight-disputes/${resolveId}/resolve`, {
        action: resolveAction,
        approvedAmount:
          resolveAction === "approve" ? parseFloat(approveAmt) : undefined,
        adminRemarks: adminRemarks || undefined,
        declineReason: resolveAction === "reject" ? declineReason : undefined,
      });
      setResolveId(null);
      setResolveDispute(null);
      setApproveAmt("");
      setAdminRemarks("");
      setDeclineReason("");
      setError("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setResolving(false);
    }
  }

  async function processRefund(id: string) {
    setRefunding(id);
    try {
      await api.post(`/admin/weight-disputes/${id}/refund`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setRefunding(null);
    }
  }

  async function filterByStatus(status: string) {
    setStatusFilter(status);
    const res = await api.get("/admin/weight-disputes", {
      params: status ? { status } : {},
    });
    setDisputes(res.data.disputes);
  }

  return (
    <>
      <div className="animate-fade-up  mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22]">
            Weight Dispute Management
          </h1>
          <p className="text-sm text-[#6B7556] mt-1">
            Review and resolve courier weight discrepancies.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
            <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
              Open
            </div>
            <div className="text-2xl font-bold text-[#CA8A04] font-mono">
              {stats.open}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
            <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
              Under Review
            </div>
            <div className="text-2xl font-bold text-[#546B41] font-mono">
              {stats.under_review}
            </div>
          </div>
          <div className="bg-[#FEF9C3] p-5 rounded-2xl border border-[#FEF08A] shadow-sm">
            <div className="text-[10px] font-bold text-[#854D0E] uppercase tracking-widest mb-2">
              Refund Pending
            </div>
            <div className="text-2xl font-bold text-[#CA8A04] font-mono">
              ₹{stats.refund_pending_amt.toFixed(0)}
            </div>
          </div>
          <div className="bg-[#F0FDF4] p-5 rounded-2xl border border-[#A7F3D0] shadow-sm">
            <div className="text-[10px] font-bold text-[#065F46] uppercase tracking-widest mb-2">
              Refunded
            </div>
            <div className="text-2xl font-bold text-[#16A34A] font-mono">
              ₹{stats.refund_done_amt.toFixed(0)}
            </div>
          </div>
          <div className="bg-[#FEF2F2] p-5 rounded-2xl border border-[#FECACA] shadow-sm">
            <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-2">
              Auto-Flagged
            </div>
            <div className="text-2xl font-bold text-[#DC2626] font-mono">
              {stats.auto_flagged}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
            <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
              Total Disputed
            </div>
            <div className="text-2xl font-bold text-[#2F3A22] font-mono">
              ₹{stats.total_disputed.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#E2D4B8] mb-4">
        <div className="flex">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === "all" ? "border-[#546B41] text-[#546B41]" : "border-transparent text-[#6B7556] hover:text-[#2F3A22]"}`}
          >
            All disputes
          </button>
          <button
            onClick={() => setActiveTab("courier")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === "courier" ? "border-[#546B41] text-[#546B41]" : "border-transparent text-[#6B7556] hover:text-[#2F3A22]"}`}
          >
            Courier-wise Dispute Report
          </button>
        </div>
        {activeTab === "all" && (
          <select
            value={statusFilter}
            onChange={(e) => filterByStatus(e.target.value)}
            className="px-3 py-1.5 mr-2 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41]"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="refund_pending">Refund Pending</option>
            <option value="refund_processed">Refund Processed</option>
            <option value="rejected">Rejected</option>
          </select>
        )}
      </div>

      {/* Disputes Table */}
      {activeTab === "all" && (
        <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#8A9270] animate-pulse">
            Loading disputes...
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">⚖️</div>
            <div className="text-sm font-semibold text-[#2F3A22]">
              No disputes found
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Seller Wt
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Courier Wt
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Diff%
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Disputed ₹
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF4E6]">
                {disputes.map((d) => (
                  <tr
                    key={d.id}
                    className={`hover:bg-[#FAF4E6] transition-colors ${d.auto_flagged ? "bg-[#FFF7F7]" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-[#2F3A22]">
                      {d.business_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#546B41]">
                        {d.mozopost_order_id}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {d.auto_flagged && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEE2E2] text-[#991B1B]">
                            auto-flagged
                          </span>
                        )}
                        {d.escalated && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEE2E2] text-[#991B1B]">
                            escalated
                          </span>
                        )}
                        {d.proof_video_url && (
                          <a
                            href={d.proof_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FAF4E6] text-[#546B41] hover:bg-[#E2D4B8] transition-colors"
                          >
                            🎥 Video
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6B7556]">
                      {d.courier_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-[#2F3A22]">
                      {d.seller_weight_gm}g
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-[#2F3A22]">
                      {d.courier_weight_gm}g
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-[#DC2626]">
                      +{parseFloat(d.difference_pct).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-[#2F3A22]">
                      ₹{parseFloat(d.disputed_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[d.status] || "bg-[#FAF4E6] text-[#6B7556]"}`}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {["open", "under_review"].includes(d.status) && (
                          <button
                            onClick={() => {
                              setResolveId(d.id);
                              setResolveDispute(d);
                              setResolveAction("approve");
                              setApproveAmt(d.disputed_amount);
                              setDeclineReason("");
                              setError("");
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#FAF4E6] text-[#546B41] rounded-lg hover:bg-[#E2D4B8] transition-colors"
                          >
                            Resolve
                          </button>
                        )}
                        {d.status === "refund_pending" && (
                          <button
                            disabled={refunding === d.id}
                            onClick={() => processRefund(d.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#D1FAE5] text-[#065F46] rounded-lg hover:bg-[#A7F3D0] transition-colors disabled:opacity-50"
                          >
                            {refunding === d.id ? "..." : "Process Refund"}
                          </button>
                        )}
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

      {/* Courier-wise Report */}
      {activeTab === "courier" && (
        <div>
          <h2 className="text-base font-bold text-[#2F3A22] mb-4">
            Courier-wise Dispute Report
          </h2>
          <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Courier
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Open
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Rejected
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Avg Diff%
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Disputed ₹
                    </th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#6B7556] uppercase tracking-wider">
                      Refunded ₹
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF4E6]">
                  {report.map((r) => (
                    <tr
                      key={r.courier_code}
                      className="hover:bg-[#FAF4E6] transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-semibold text-[#2F3A22]">
                        {r.courier_name || r.courier_code}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#2F3A22]">
                        {r.total_disputes}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#854D0E]">
                          {r.open}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#D1FAE5] text-[#065F46]">
                          {r.approved}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FAF4E6] text-[#6B7556]">
                          {r.rejected}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#DC2626]">
                        {r.avg_diff_pct}%
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#2F3A22]">
                        ₹{r.total_disputed_amt.toFixed(0)}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#16A34A]">
                        ₹{r.total_refunded_amt.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
      {/* Resolve Modal */}
      {resolveId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-[#E2D4B8]">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-bold text-[#2F3A22]">
                Resolve Dispute
              </h3>
              <button
                onClick={() => {
                  setResolveId(null);
                  setResolveDispute(null);
                  setDeclineReason("");
                  setError("");
                }}
                className="w-7 h-7 rounded-lg bg-[#F4F6F9] flex items-center justify-center text-[#8A9270] hover:text-[#2F3A22] hover:bg-[#E2D4B8] transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 3 Action Tabs */}
            <div className="flex rounded-xl border border-[#E2D4B8] overflow-hidden mb-5">
              <button
                type="button"
                onClick={() => setResolveAction("approve")}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors ${resolveAction === "approve" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-white text-[#8A9270] hover:bg-[#FAF4E6]"}`}
              >
                ✓ Approve
              </button>
              <button
                type="button"
                onClick={() => setResolveAction("on_hold")}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors border-l border-[#E2D4B8] ${resolveAction === "on_hold" ? "bg-[#FEF9C3] text-[#854D0E]" : "bg-white text-[#8A9270] hover:bg-[#FAF4E6]"}`}
              >
                ⏸ On Hold
              </button>
              <button
                type="button"
                onClick={() => setResolveAction("reject")}
                className={`flex-1 py-2.5 text-xs font-bold transition-colors border-l border-[#E2D4B8] ${resolveAction === "reject" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-white text-[#8A9270] hover:bg-[#FAF4E6]"}`}
              >
                ✕ Decline
              </button>
            </div>

            {/* Approve — amount */}
            {resolveAction === "approve" && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
                  Approved Refund Amount (₹)
                </label>
                <input
                  type="number"
                  value={approveAmt}
                  onChange={(e) => setApproveAmt(e.target.value)}
                  placeholder="Leave blank = full disputed amount"
                  className="w-full px-3 py-2.5 text-sm border border-[#E2D4B8] rounded-xl outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 placeholder:text-[#8A9270]"
                />
              </div>
            )}

            {/* On Hold — info banner */}
            {resolveAction === "on_hold" && (
              <div className="mb-4 p-3 rounded-xl bg-[#FFFBEB] border border-[#FEF08A] text-xs font-medium text-[#854D0E]">
                ⏸ Dispute will be marked <strong>Under Review</strong>. Seller
                will be notified to provide additional proof or wait for
                logistics confirmation.
              </div>
            )}

            {/* Decline — mandatory reason */}
            {resolveAction === "reject" && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#991B1B] mb-1.5 uppercase tracking-wide">
                  Decline Reason <span className="text-[#DC2626]">*</span>
                </label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Explain why this dispute is being declined (visible to seller)…"
                  className={`w-full px-3 py-2.5 text-sm border rounded-xl outline-none focus:ring-2 resize-none transition-colors ${
                    declineReason.trim()
                      ? "border-[#E2D4B8] focus:border-[#546B41] focus:ring-[#546B41]/10"
                      : "border-[#FCA5A5] focus:border-[#DC2626] focus:ring-[#DC2626]/10"
                  }`}
                />
                {!declineReason.trim() && (
                  <p className="text-xs text-[#DC2626] mt-1">
                    This field is required before declining.
                  </p>
                )}
              </div>
            )}

            {/* Admin Remarks (always visible) */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
                Admin Remarks (internal)
              </label>
              <textarea
                rows={2}
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Internal notes — not shown to seller"
                className="w-full px-3 py-2.5 text-sm border border-[#E2D4B8] rounded-xl outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 resize-none placeholder:text-[#8A9270]"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                disabled={
                  resolving ||
                  (resolveAction === "reject" && !declineReason.trim())
                }
                onClick={resolve}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                  resolveAction === "approve"
                    ? "bg-[#546B41] text-white hover:bg-[#3F5131]"
                    : resolveAction === "on_hold"
                      ? "bg-[#CA8A04] text-white hover:bg-[#A16207]"
                      : "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                }`}
              >
                {resolving
                  ? "Saving..."
                  : resolveAction === "approve"
                    ? "Confirm Approve"
                    : resolveAction === "on_hold"
                      ? "Put On Hold"
                      : "Confirm Decline"}
              </button>
              <button
                onClick={() => {
                  setResolveId(null);
                  setResolveDispute(null);
                  setDeclineReason("");
                  setError("");
                }}
                className="px-4 py-2.5 bg-white border border-[#E2D4B8] text-[#6B7556] text-sm font-semibold rounded-xl hover:bg-[#FAF4E6] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      
    </>
  );
}
