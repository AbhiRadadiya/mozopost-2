"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

interface Settlement {
  id: string;
  business_name: string;
  total_orders: number;
  net_amount: string;
  status: string;
  due_date: string | null;
  utr_number: string | null;
  payment_mode: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#FEF9C3] text-[#854D0E]",
  processing: "bg-[#DBEAFE] text-[#1E40AF]",
  settled: "bg-[#D1FAE5] text-[#065F46]",
  on_hold: "bg-[#FEE2E2] text-[#991B1B]",
  disputed: "bg-[#FEE2E2] text-[#991B1B]",
};

export default function CodSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [utrModal, setUtrModal] = useState<Settlement | null>(null);
  const [utrForm, setUtrForm] = useState({
    utrNumber: "",
    paymentMode: "neft",
    bankReference: "",
  });
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/cod");
      setSettlements(data.remittances || data.settlements || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function releaseWithUtr(e: React.FormEvent) {
    e.preventDefault();
    if (!utrModal || !utrForm.utrNumber.trim()) return;
    setReleasing(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/admin/cod/${utrModal.id}/status`, {
        status: "settled",
        utrNumber: utrForm.utrNumber,
        paymentMode: utrForm.paymentMode,
        bankReference: utrForm.bankReference || undefined,
      });
      setSuccess(
        `Settlement released for ${utrModal.business_name}. UTR: ${utrForm.utrNumber}`,
      );
      setUtrModal(null);
      setUtrForm({ utrNumber: "", paymentMode: "neft", bankReference: "" });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setReleasing(false);
    }
  }

  const pending = settlements.filter((s) => s.status === "pending");
  const total = settlements.reduce(
    (sum, s) => sum + parseFloat(s.net_amount || "0"),
    0,
  );
  const pendingTotal = pending.reduce(
    (sum, s) => sum + parseFloat(s.net_amount || "0"),
    0,
  );

  const inp =
    "w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10";

  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">COD Settlements</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Process cash-on-delivery remittances. <strong>UTR required</strong>{" "}
            before releasing any settlement.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Total Settlements
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">
            {settlements.length}
          </div>
        </div>
        <div className="bg-[#FFFBEB] p-5 rounded-2xl border border-[#FEF08A] shadow-sm">
          <div className="text-[10px] font-bold text-[#854D0E] uppercase tracking-widest mb-2">
            Pending Release
          </div>
          <div className="text-2xl font-bold text-[#CA8A04] font-mono">
            {pending.length}
          </div>
          <div className="text-xs text-[#CA8A04] mt-1 font-medium">
            ₹
            {pendingTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}{" "}
            due
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Total Payable
          </div>
          <div className="text-2xl font-bold text-[#16A34A] font-mono">
            ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* UTR Required Banner */}
      <div className="p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-sm font-semibold text-[#4F46E5] flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        UTR number is mandatory before releasing any COD settlement. This
        ensures full payment audit trail.
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">
          ✓ {success}
        </div>
      )}

      {/* UTR Modal */}
      {utrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md border border-[#E5E8EF]">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Release Settlement
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Enter UTR to confirm payment to seller
                </p>
              </div>
              <button
                onClick={() => {
                  setUtrModal(null);
                  setError("");
                }}
                className="w-7 h-7 rounded-lg bg-[#F4F6F9] flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] transition-colors"
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

            {/* Seller summary */}
            <div className="p-4 rounded-xl bg-[#F8F9FB] border border-[#E5E8EF] mb-5">
              <div className="font-semibold text-sm text-[#0F172A]">
                {utrModal.business_name}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-[#64748B]">
                <span>
                  Orders:{" "}
                  <strong className="text-[#0F172A]">
                    {utrModal.total_orders}
                  </strong>
                </span>
                <span>
                  Amount:{" "}
                  <strong className="text-[#16A34A] font-mono">
                    ₹{parseFloat(utrModal.net_amount).toFixed(2)}
                  </strong>
                </span>
                {utrModal.due_date && (
                  <span>
                    Due:{" "}
                    {new Date(utrModal.due_date).toLocaleDateString("en-IN")}
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={releaseWithUtr} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#991B1B] mb-1.5 uppercase tracking-wide">
                  UTR Number <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  required
                  value={utrForm.utrNumber}
                  onChange={(e) =>
                    setUtrForm((p) => ({ ...p, utrNumber: e.target.value }))
                  }
                  placeholder="e.g. HDFC000123456789"
                  className={`${inp} ${!utrForm.utrNumber.trim() ? "border-[#FCA5A5]" : "border-[#E5E8EF]"}`}
                />
                {!utrForm.utrNumber.trim() && (
                  <p className="text-xs text-[#DC2626] mt-1">
                    UTR number is required to release.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Payment Mode
                </label>
                <select
                  value={utrForm.paymentMode}
                  onChange={(e) =>
                    setUtrForm((p) => ({ ...p, paymentMode: e.target.value }))
                  }
                  className={inp}
                >
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="imps">IMPS</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Bank Reference (Optional)
                </label>
                <input
                  value={utrForm.bankReference}
                  onChange={(e) =>
                    setUtrForm((p) => ({ ...p, bankReference: e.target.value }))
                  }
                  className={inp}
                />
              </div>
              <div className="flex gap-3 pt-2 border-t border-[#F1F5F9]">
                <button
                  type="submit"
                  disabled={releasing || !utrForm.utrNumber.trim()}
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
                >
                  {releasing ? "Releasing..." : "✓ Confirm & Release"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUtrModal(null);
                    setError("");
                  }}
                  className="px-4 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settlements Table */}
      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">
            Loading settlements...
          </div>
        ) : settlements.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">💵</div>
            <div className="text-sm font-semibold text-[#0F172A]">
              No COD settlements yet
            </div>
            <div className="text-xs text-[#94A3B8] mt-1">
              Settlements are created automatically as COD orders are delivered.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    UTR
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {settlements.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[#F8F9FB] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-sm text-[#0F172A]">
                      {s.business_name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0F172A] font-mono">
                      {s.total_orders}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-[#16A34A] font-mono">
                      ₹{parseFloat(s.net_amount).toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.utr_number ? (
                        <div>
                          <div className="text-xs font-mono font-semibold text-[#4F46E5]">
                            {s.utr_number}
                          </div>
                          {s.payment_mode && (
                            <div className="text-[10px] text-[#94A3B8] uppercase">
                              {s.payment_mode}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-[#FCA5A5] font-semibold">
                          No UTR yet
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#64748B]">
                      {s.due_date
                        ? new Date(s.due_date).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[s.status] || "bg-[#F1F5F9] text-[#475569]"}`}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.status !== "settled" && (
                        <button
                          onClick={() => {
                            setUtrModal(s);
                            setUtrForm({
                              utrNumber: "",
                              paymentMode: "neft",
                              bankReference: "",
                            });
                            setError("");
                            setSuccess("");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition-colors"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                          Release with UTR
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
