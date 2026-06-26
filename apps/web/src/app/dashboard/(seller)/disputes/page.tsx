"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

interface DisputeSummary {
  open: string;
  under_review: string;
  approved: string;
  rejected: string;
  refund_pending: string;
  refund_processed: string;
  total_disputed: number;
  total_approved: number;
  auto_flagged_count: string;
}

interface Dispute {
  id: string;
  order_id: string;
  mozopost_order_id: string;
  awb_number: string | null;
  courier_name: string | null;
  seller_weight_gm: number;
  volumetric_weight_gm: number | null;
  courier_weight_gm: number;
  difference_gm: number;
  difference_pct: string;
  disputed_amount: string;
  approved_refund_amount: string | null;
  status: string;
  auto_flagged: boolean;
  escalated: boolean;
  created_at: string;
  proof_video_url?: string | null;
}

const STATUS_BADGE: Record<string, { classes: string; label: string }> = {
  open: { classes: "bg-[#FEF3C7] text-[#92400E]", label: "Open" },
  under_review: {
    classes: "bg-[#E0E7FF] text-[#3730A3]",
    label: "Under Review",
  },
  approved: { classes: "bg-[#D1FAE5] text-[#065F46]", label: "Approved" },
  rejected: { classes: "bg-[#F1F5F9] text-[#64748B]", label: "Rejected" },
  refund_pending: {
    classes: "bg-[#DBEAFE] text-[#1E40AF]",
    label: "Refund Pending",
  },
  refund_processed: {
    classes: "bg-[#D1FAE5] text-[#065F46]",
    label: "Refund Processed",
  },
};

const raiseForm = {
  orderId: "",
  courierWeightGm: "",
  reason: "wrong_weight",
  sellerRemarks: "",
};

export default function WeightDisputesPage() {
  const [summary, setSummary] = useState<DisputeSummary | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(raiseForm);
  const [raising, setRaising] = useState(false);
  const [raiseError, setRaiseError] = useState("");
  const [raiseSuccess, setRaiseSuccess] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadVideoError, setUploadVideoError] = useState("");
  const [videoUploadKey, setVideoUploadKey] = useState(Date.now());

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        api.get("/weight-disputes/summary"),
        api.get("/weight-disputes", {
          params: filterStatus ? { status: filterStatus } : {},
        }),
      ]);
      setSummary(sumRes.data.summary);
      setDisputes(listRes.data.disputes);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Only fetch list on filter change, avoid refetching summary
    if (!summary) return;
    api
      .get("/weight-disputes", {
        params: filterStatus ? { status: filterStatus } : {},
      })
      .then((res) => setDisputes(res.data.disputes))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [filterStatus]);

  function setField(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setUploadVideoError("Please select a valid video file.");
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadVideoError("Video file size must be less than 50MB.");
      return;
    }

    setUploadingVideo(true);
    setUploadVideoError("");
    setVideoUrl("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const { data } = await api.post("/upload", {
            name: file.name,
            data: base64,
          });
          setVideoUrl(data.url);
        } catch (err) {
          setUploadVideoError("Failed to upload video.");
        } finally {
          setUploadingVideo(false);
        }
      };
      reader.onerror = () => {
        setUploadVideoError("Failed to read video file.");
        setUploadingVideo(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadVideoError("An error occurred during video upload.");
      setUploadingVideo(false);
    }
  }

  async function handleRaise(e: React.FormEvent) {
    e.preventDefault();
    setRaiseError("");
    setRaiseSuccess("");
    if (!form.orderId || !form.courierWeightGm) {
      setRaiseError("Order ID and courier weight are required");
      return;
    }
    setRaising(true);
    try {
      const { data } = await api.post("/weight-disputes", {
        orderId: form.orderId,
        courierWeightGm: parseInt(form.courierWeightGm),
        reason: form.reason,
        sellerRemarks: form.sellerRemarks || undefined,
        proofVideoUrl: videoUrl || undefined,
      });
      setRaiseSuccess(
        `Dispute raised successfully! Difference: ${data.dispute.difference_gm}g (${parseFloat(data.dispute.difference_pct).toFixed(1)}%). Disputed amount: ₹${parseFloat(data.dispute.disputed_amount).toFixed(2)}`,
      );
      setForm(raiseForm);
      setVideoUrl("");
      setVideoUploadKey(Date.now());
      load();
    } catch (err) {
      setRaiseError(apiErrorMessage(err));
    } finally {
      setRaising(false);
    }
  }

  async function acceptCharges(id: string) {
    try {
      await api.patch(`/weight-disputes/${id}/accept`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function escalate(id: string) {
    try {
      await api.patch(`/weight-disputes/${id}/escalate`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="animate-fade-up mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Weight Disputes</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage and resolve weight discrepancies with couriers.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() =>
              setFilterStatus(filterStatus === "open" ? "" : "open")
            }
            className={`p-5 rounded-2xl border text-left transition-all ${filterStatus === "open" ? "bg-[#EEF2FF] border-[#4F46E5] shadow-sm" : "bg-white border-[#E5E8EF] hover:border-[#CBD5E1]"}`}
          >
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
              Open Disputes
            </div>
            <div className="text-3xl font-bold text-[#0F172A] font-mono">
              {summary.open}
            </div>
          </button>
          <button
            onClick={() =>
              setFilterStatus(
                filterStatus === "refund_pending" ? "" : "refund_pending",
              )
            }
            className={`p-5 rounded-2xl border text-left transition-all ${filterStatus === "refund_pending" ? "bg-[#EEF2FF] border-[#4F46E5] shadow-sm" : "bg-white border-[#E5E8EF] hover:border-[#CBD5E1]"}`}
          >
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
              Refund Pending
            </div>
            <div className="text-3xl font-bold text-[#0F172A] font-mono">
              {summary.refund_pending}
            </div>
          </button>
          <button
            onClick={() =>
              setFilterStatus(
                filterStatus === "refund_processed" ? "" : "refund_processed",
              )
            }
            className={`p-5 rounded-2xl border text-left transition-all ${filterStatus === "refund_processed" ? "bg-[#F0FDF4] border-[#16A34A] shadow-sm" : "bg-white border-[#E5E8EF] hover:border-[#CBD5E1]"}`}
          >
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
              Refund Received
            </div>
            <div className="text-3xl font-bold text-[#16A34A] font-mono">
              {summary.refund_processed}
            </div>
          </button>
          <div className="p-5 rounded-2xl border border-[#E5E8EF] bg-white text-left">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
              Total Disputed
            </div>
            <div className="text-3xl font-bold text-[#0F172A] font-mono">
              ₹{summary.total_disputed.toFixed(0)}
            </div>
          </div>
        </div>
      )}

      {summary && parseInt(summary.auto_flagged_count) > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-[#FFFBEB] border border-[#FEF08A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FEF08A] flex items-center justify-center shrink-0">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B45309"
                strokeWidth="2.5"
              >
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#92400E]">
                Auto-Flagged Shipments
              </h4>
              <p className="text-xs font-medium text-[#B45309] mt-0.5">
                {summary.auto_flagged_count} shipment(s) flagged for overcharge
                (&gt;20% weight difference).
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus("open")}
            className="px-4 py-2 bg-[#92400E] text-white text-xs font-semibold rounded-lg hover:bg-[#78350F] transition-colors"
          >
            Review Now
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Raise dispute form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                >
                  <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Raise Weight Dispute
              </h2>
            </div>
            <form onSubmit={handleRaise} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Order ID
                </label>
                <input
                  required
                  value={form.orderId}
                  onChange={(e) => setField("orderId", e.target.value)}
                  placeholder="Paste order ID from shipments list"
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                    Courier weight (grams)
                  </label>
                  <input
                    type="number"
                    required
                    value={form.courierWeightGm}
                    onChange={(e) =>
                      setField("courierWeightGm", e.target.value)
                    }
                    placeholder="e.g. 900"
                    className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                    Reason
                  </label>
                  <select
                    value={form.reason}
                    onChange={(e) => setField("reason", e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                  >
                    <option value="wrong_weight">Wrong weight charged</option>
                    <option value="volumetric_mismatch">
                      Volumetric mismatch
                    </option>
                    <option value="dimensional_error">Dimension error</option>
                    <option value="courier_error">Courier system error</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Your remarks (optional)
                </label>
                <textarea
                  rows={2}
                  value={form.sellerRemarks}
                  onChange={(e) => setField("sellerRemarks", e.target.value)}
                  placeholder="Describe what you packed and how you measured..."
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Proof Video (Optional)
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    key={videoUploadKey}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="block w-full text-sm text-[#475569] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EEF2FF] file:text-[#4F46E5] hover:file:bg-[#E0E7FF] transition-all cursor-pointer"
                  />
                  {uploadingVideo && (
                    <p className="text-xs text-[#4F46E5] animate-pulse">Uploading video...</p>
                  )}
                  {uploadVideoError && (
                    <p className="text-xs text-[#EF4444] font-medium">{uploadVideoError}</p>
                  )}
                  {videoUrl && (
                    <div className="flex items-center gap-2 text-xs text-[#16A34A] font-medium bg-[#F0FDF4] border border-[#BBF7D0] p-2 rounded-xl">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span>Video uploaded successfully!</span>
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="underline text-[#15803D] ml-auto hover:text-[#166534]">
                        Preview
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {raiseError && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
                  {raiseError}
                </div>
              )}
              {raiseSuccess && (
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-sm font-medium text-[#166534]">
                  {raiseSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={raising}
                className="w-full flex items-center justify-center py-2.5 mt-2 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50"
              >
                {raising ? "Raising dispute..." : "Raise Dispute"}
              </button>
            </form>
          </div>
        </div>

        {/* Evidence Guide */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Evidence Guide
              </h2>
            </div>
            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#E5E8EF]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide mb-2">
                  Required Proofs
                </h3>
                <ul className="space-y-2 text-xs font-medium text-[#475569]">
                  <li className="flex gap-2">
                    <span>📸</span> Product images with a scale
                  </li>
                  <li className="flex gap-2">
                    <span>📦</span> Packed box with measuring tape
                  </li>
                  <li className="flex gap-2">
                    <span>🎥</span> Packing video with date/time
                  </li>
                  <li className="flex gap-2">
                    <span>🧾</span> Invoice copy showing items
                  </li>
                </ul>
              </div>
              <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#E5E8EF]">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide mb-2">
                  Process Timeline
                </h3>
                <div className="space-y-2 text-xs font-medium">
                  <div className="flex items-center gap-2 text-[#475569]">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> You
                    raise dispute
                  </div>
                  <div className="flex items-center gap-2 text-[#475569]">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Admin
                    reviews
                  </div>
                  <div className="flex items-center gap-2 text-[#475569]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Admin
                    approves
                  </div>
                  <div className="flex items-center gap-2 text-[#10B981]">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />{" "}
                    Wallet credited ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disputes list */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E8EF] bg-white flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F172A]">
            {filterStatus
              ? `${filterStatus.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())} Disputes`
              : "All Disputes"}
          </h2>
          {filterStatus && (
            <button
              onClick={() => setFilterStatus("")}
              className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FB] border-b border-[#E5E8EF]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Courier
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Your Wt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Courier Wt
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Difference
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Disputed ₹
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-[#94A3B8]"
                  >
                    Loading...
                  </td>
                </tr>
              ) : disputes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#F4F6F9] flex items-center justify-center">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#94A3B8"
                          strokeWidth="2"
                        >
                          <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-[#64748B]">
                        No disputes found.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                disputes.map((d) => {
                  const s = STATUS_BADGE[d.status] || {
                    classes: "bg-[#F1F5F9] text-[#64748B]",
                    label: d.status,
                  };
                  return (
                    <tr
                      key={d.id}
                      className={`border-b border-[#F1F3F7] transition-colors ${d.auto_flagged ? "bg-[#FFFBEB] hover:bg-[#FEF9C3]" : "hover:bg-[#F8F9FB]"}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-[#4F46E5]">
                          #{d.mozopost_order_id}
                        </div>
                        {d.proof_video_url && (
                          <div className="mt-1">
                            <a
                              href={d.proof_video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4F46E5] hover:text-[#3730A3] bg-[#EEF2FF] px-1.5 py-0.5 rounded transition-colors"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7.5v-3l5 1.5-5 1.5z"/>
                              </svg>
                              Video Proof
                            </a>
                          </div>
                        )}
                        {d.auto_flagged && (
                          <div className="text-[10px] font-bold text-[#B45309] mt-1 uppercase tracking-widest">
                            Auto-Flagged
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[#0F172A] font-medium text-xs">
                        {d.courier_name || "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-[#475569]">
                        {d.seller_weight_gm}g
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs font-bold text-[#991B1B]">
                        {d.courier_weight_gm}g
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-[#0F172A]">
                          +{d.difference_gm}g
                        </div>
                        <div className="text-[10px] text-[#EF4444] font-medium">
                          {parseFloat(d.difference_pct).toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-xs font-bold text-[#0F172A]">
                          ₹{parseFloat(d.disputed_amount).toFixed(2)}
                        </div>
                        {d.approved_refund_amount && (
                          <div className="text-[10px] text-[#16A34A] font-bold mt-0.5">
                            Apprv: ₹
                            {parseFloat(d.approved_refund_amount).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.classes}`}
                        >
                          {s.label}
                        </span>
                        {d.escalated && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] text-[9px] font-bold uppercase tracking-widest">
                              Escalated
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex flex-col gap-1.5 items-end">
                          {["open", "under_review"].includes(d.status) &&
                            !d.escalated && (
                              <button
                                onClick={() => escalate(d.id)}
                                className="text-[11px] font-semibold text-[#B45309] hover:text-[#78350F] bg-[#FEF3C7] px-2 py-1 rounded hover:bg-[#FDE68A] transition-colors"
                              >
                                Escalate
                              </button>
                            )}
                          {["open", "under_review"].includes(d.status) && (
                            <button
                              onClick={() => acceptCharges(d.id)}
                              className="text-[11px] font-semibold text-[#475569] hover:text-[#0F172A] bg-[#F1F3F7] px-2 py-1 rounded hover:bg-[#E5E8EF] transition-colors"
                            >
                              Accept Charges
                            </button>
                          )}
                        </div>
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
