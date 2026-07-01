"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

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

interface Merchant {
  id: string;
  business_name: string;
  wallet_balance: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[#FAF4E6] text-[#854D0E]",
  processing: "bg-[#EADFC8] text-[#546B41]",
  settled: "bg-[#D1FAE5] text-[#065F46]",
  on_hold: "bg-[#FAF4E6] text-[#6B7556]",
  disputed: "bg-[#FAF4E6] text-[#991B1B]",
};

export default function CodSettlementsPage() {
  const [activeTab, setActiveTab] = useState<"cod" | "wallet">("cod");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // COD State
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedTxns, setSelectedTxns] = useState<Set<string>>(new Set());

  const [utrModal, setUtrModal] = useState<Settlement | null>(null);
  const [utrForm, setUtrForm] = useState({
    utrNumber: "",
    paymentMode: "neft",
    bankReference: "",
  });
  const [releasing, setReleasing] = useState(false);

  // Wallet State
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [walletModal, setWalletModal] = useState(false);
  const [walletSellerId, setWalletSellerId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletType, setWalletType] = useState<"credit" | "debit">("credit");
  const [walletError, setWalletError] = useState("");
  const [walletMessage, setWalletMessage] = useState("");
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  useEffect(() => {
    load();
    const intervalId = setInterval(() => load(true), 15000);
    return () => clearInterval(intervalId);
  }, [search, date, statusFilter]);

  async function load(isPolling = false) {
    if (!isPolling) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.append("search", search);
      if (date) qs.append("date", date);
      if (statusFilter) qs.append("status", statusFilter);

      const [codRes, merchRes] = await Promise.all([
        api.get(`/admin/cod?${qs.toString()}`),
        api.get("/admin/merchants"),
      ]);

      setSettlements(codRes.data.remittances || codRes.data.settlements || []);
      setMerchants(merchRes.data.merchants || []);
    } catch (err) {
      if (!isPolling) setError(apiErrorMessage(err));
    } finally {
      if (!isPolling) setLoading(false);
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

  async function handleWalletSubmit(e: React.FormEvent) {
    e.preventDefault();
    setWalletError("");
    setWalletMessage("");
    if (!walletSellerId || !walletAmount) return;
    setWalletSubmitting(true);
    try {
      await api.post(`/admin/wallets/${walletSellerId}/adjust`, {
        amount: Number(walletAmount),
        type: walletType,
      });
      setWalletMessage(`Wallet ${walletType}ed by ₹${walletAmount} successfully`);
      setWalletAmount("");
      await load(true);
      setTimeout(() => {
        setWalletModal(false);
        setWalletMessage("");
      }, 1500);
    } catch (err) {
      setWalletError(apiErrorMessage(err));
    } finally {
      setWalletSubmitting(false);
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

  function handleExport() {
    if (selectedTxns.size === 0) return;
    const toDownload = settlements.filter((s) => selectedTxns.has(s.id));

    const header =
      "Merchant,Orders,Net Amount,UTR,Payment Mode,Due Date,Status\n";
    const rows = toDownload
      .map((s) => {
        const dDate = s.due_date
          ? new Date(s.due_date).toLocaleDateString("en-IN").replace(/,/g, "")
          : "—";
        return `"${s.business_name}",${s.total_orders},${s.net_amount},${s.utr_number || ""},${s.payment_mode || ""},${dDate},${s.status}`;
      })
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin_cod_settlements.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSelectedTxns(new Set());
  }

  return (
    <>
      <div className="animate-fade-up mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#2F3A22]">
              Financial Dashboard
            </h1>
            <p className="text-sm text-[#8A9270] mt-1">
              Master Admin control for COD remittances and seller wallet balances.
            </p>
          </div>
          <button
            onClick={() => {
              setWalletError("");
              setWalletMessage("");
              setWalletModal(true);
            }}
            className="bg-[#546B41] hover:bg-[#3F5131] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            + Adjust Wallet
          </button>
        </div>

        {/* Unified Tabs */}
        <div className="flex border-b border-[#E2D4B8] mb-4">
          <button
            onClick={() => setActiveTab("cod")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "cod"
                ? "border-[#546B41] text-[#546B41]"
                : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
            }`}
          >
            COD Settlements
          </button>
          <button
            onClick={() => setActiveTab("wallet")}
            className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "wallet"
                ? "border-[#546B41] text-[#546B41]"
                : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
            }`}
          >
            Wallet Balances
          </button>
        </div>

        {/* COD Settlements Tab */}
        {activeTab === "cod" && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
                <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                  Total Settlements
                </div>
                <div className="text-2xl font-bold text-[#2F3A22] font-mono">
                  {settlements.length}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
                <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                  Pending Release
                </div>
                <div className="text-2xl font-bold text-[#CA8A04] font-mono">
                  {pending.length}
                </div>
                <div className="text-xs text-[#CA8A04] mt-1 font-medium">
                  ₹
                  {pendingTotal.toLocaleString("en-IN", {
                    maximumFractionDigits: 0,
                  })}{" "}
                  due
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-[#E2D4B8] shadow-sm">
                <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2">
                  Total Payable
                </div>
                <div className="text-2xl font-bold text-[#16A34A] font-mono">
                  ₹{total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* UTR Required Banner */}
            <div className="p-4 rounded-xl bg-[#FAF4E6] border border-[#E2D4B8] text-sm font-semibold text-[#546B41] flex items-center gap-2">
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

            <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden">
              {/* Header / Filters */}
              <div className="p-4 border-b border-[#E2D4B8] bg-[#FAF4E6] flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                  <div className="relative flex-1 max-w-sm">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9270] w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search Merchant..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
                    />
                  </div>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="px-3 py-2 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41]"
                  />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41]"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="settled">Settled</option>
                    <option value="on_hold">On Hold</option>
                  </select>
                </div>
                {selectedTxns.size > 0 && (
                  <button
                    onClick={handleExport}
                    className="bg-[#546B41] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#3F5131] transition-colors"
                  >
                    Export {selectedTxns.size} Selected
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="py-20 text-center text-[#8A9270] animate-pulse">
                    Loading settlements...
                  </div>
                ) : settlements.length === 0 ? (
                  <div className="py-20 text-center text-[#8A9270]">
                    No settlements found.
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            className="rounded border-[#E2D4B8] text-[#546B41] focus:ring-[#546B41]"
                            checked={
                              selectedTxns.size === settlements.length &&
                              settlements.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTxns(
                                  new Set(settlements.map((s) => s.id)),
                                );
                              } else {
                                setSelectedTxns(new Set());
                              }
                            }}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                          Merchant
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                          Orders
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                          Net Payable
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                          Date / UTR
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FAF4E6]">
                      {settlements.map((s) => (
                        <tr
                          key={s.id}
                          className={`hover:bg-[#FAF4E6] transition-colors ${selectedTxns.has(s.id) ? "bg-[#FAF4E6]/50" : ""}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded border-[#E2D4B8] text-[#546B41] focus:ring-[#546B41]"
                              checked={selectedTxns.has(s.id)}
                              onChange={(e) => {
                                const next = new Set(selectedTxns);
                                if (e.target.checked) next.add(s.id);
                                else next.delete(s.id);
                                setSelectedTxns(next);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#2F3A22]">
                            {s.business_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#8A9270]">
                            {s.total_orders}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold font-mono text-[#2F3A22]">
                            ₹{parseFloat(s.net_amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-[#2F3A22]">
                              {s.due_date
                                ? new Date(s.due_date).toLocaleDateString(
                                    "en-IN",
                                  )
                                : "—"}
                            </div>
                            {s.utr_number && (
                              <div className="text-xs font-mono text-[#8A9270] mt-0.5">
                                UTR: {s.utr_number}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                                STATUS_STYLE[s.status] ||
                                "bg-[#FAF4E6] text-[#6B7556]"
                              }`}
                            >
                              {s.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {s.status === "pending" && (
                              <button
                                onClick={() => {
                                  setUtrModal(s);
                                  setUtrForm({
                                    ...utrForm,
                                    utrNumber: s.utr_number || "",
                                  });
                                }}
                                className="px-3 py-1.5 text-xs font-semibold bg-[#546B41] text-white rounded-lg hover:bg-[#3F5131] transition-colors shadow-sm"
                              >
                                Enter UTR
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wallet Balances Tab */}
        {activeTab === "wallet" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2D4B8] bg-[#FAF4E6]">
                <h2 className="text-sm font-bold text-[#2F3A22]">
                  All Merchant Wallets
                </h2>
              </div>
              <div className="max-h-[600px] overflow-y-auto divide-y divide-[#FAF4E6]">
                {merchants.length === 0 ? (
                  <div className="py-20 text-center text-[#8A9270]">
                    No merchants found.
                  </div>
                ) : (
                  merchants.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-[#FAF4E6] transition-colors"
                    >
                      <div className="text-sm font-medium text-[#2F3A22]">
                        {m.business_name}
                      </div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          parseFloat(m.wallet_balance || "0") >= 0
                            ? "text-[#16A34A]"
                            : "text-[#DC2626]"
                        }`}
                      >
                        ₹{parseFloat(m.wallet_balance || "0").toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UTR Modal */}
      <Modal
        isOpen={!!utrModal}
        onClose={() => setUtrModal(null)}
        width="460px"
        title="Release Settlement"
        subtitle={`Releasing ₹${parseFloat(utrModal?.net_amount || "0").toFixed(2)} to ${utrModal?.business_name}`}
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="submit"
              form="utr-form"
              disabled={releasing || !utrForm.utrNumber.trim()}
              className="flex-1 py-2.5 bg-[#546B41] text-white text-sm font-semibold rounded-xl hover:bg-[#3F5131] transition-colors disabled:opacity-50 shadow-sm"
            >
              {releasing ? "Releasing..." : "Confirm Release"}
            </button>
            <button
              type="button"
              onClick={() => setUtrModal(null)}
              className="px-4 py-2.5 bg-white border border-[#E2D4B8] text-[#6B7556] text-sm font-semibold rounded-xl hover:bg-[#FAF4E6] transition-colors"
            >
              Cancel
            </button>
          </div>
        }
      >
        <form id="utr-form" onSubmit={releaseWithUtr} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
              Payment Mode
            </label>
            <select
              value={utrForm.paymentMode}
              onChange={(e) =>
                setUtrForm({ ...utrForm, paymentMode: e.target.value })
              }
              className="w-full px-3 py-2.5 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
            >
              <option value="neft">NEFT</option>
              <option value="rtgs">RTGS</option>
              <option value="imps">IMPS</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
              UTR Number <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              required
              value={utrForm.utrNumber}
              onChange={(e) =>
                setUtrForm({ ...utrForm, utrNumber: e.target.value })
              }
              placeholder="Enter 12-22 digit UTR"
              className="w-full px-3 py-2.5 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 placeholder:text-[#8A9270]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
              Bank Reference (Optional)
            </label>
            <input
              type="text"
              value={utrForm.bankReference}
              onChange={(e) =>
                setUtrForm({ ...utrForm, bankReference: e.target.value })
              }
              className="w-full px-3 py-2.5 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 placeholder:text-[#8A9270]"
            />
          </div>
        </form>
      </Modal>

      {/* Adjust Wallet Modal */}
      <Modal
        isOpen={walletModal}
        onClose={() => {
          setWalletModal(false);
          setWalletError("");
          setWalletMessage("");
        }}
        width="460px"
        title="Adjust Wallet Balance"
        subtitle="Add or deduct funds directly from a merchant's wallet."
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="submit"
              form="wallet-form"
              disabled={walletSubmitting || !walletSellerId || !walletAmount}
              className="flex-1 py-2.5 bg-[#546B41] text-white text-sm font-semibold rounded-xl hover:bg-[#3F5131] transition-colors disabled:opacity-50 shadow-sm"
            >
              {walletSubmitting
                ? "Processing..."
                : `${walletType === "credit" ? "+ Credit" : "− Debit"} Wallet`}
            </button>
            <button
              type="button"
              onClick={() => {
                setWalletModal(false);
                setWalletError("");
                setWalletMessage("");
              }}
              className="px-4 py-2.5 bg-white border border-[#E2D4B8] text-[#6B7556] text-sm font-semibold rounded-xl hover:bg-[#FAF4E6] transition-colors"
            >
              Close
            </button>
          </div>
        }
      >
        <form id="wallet-form" onSubmit={handleWalletSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
              Select Merchant
            </label>
            <select
              required
              value={walletSellerId}
              onChange={(e) => setWalletSellerId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
            >
              <option value="">-- Choose Merchant --</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.business_name} (Bal: ₹
                  {parseFloat(m.wallet_balance || "0").toFixed(0)})
                </option>
              ))}
            </select>
          </div>

          {/* Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
              Action Type
            </label>
            <div className="flex rounded-xl border border-[#E2D4B8] overflow-hidden">
              <button
                type="button"
                onClick={() => setWalletType("credit")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  walletType === "credit"
                    ? "bg-[#D1FAE5] text-[#065F46]"
                    : "bg-white text-[#8A9270] hover:bg-[#FAF4E6]"
                }`}
              >
                + Credit (Add)
              </button>
              <button
                type="button"
                onClick={() => setWalletType("debit")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#E2D4B8] ${
                  walletType === "debit"
                    ? "bg-[#FEE2E2] text-[#991B1B]"
                    : "bg-white text-[#8A9270] hover:bg-[#FAF4E6]"
                }`}
              >
                − Debit (Remove)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7556] mb-1.5 uppercase tracking-wide">
              Amount (₹)
            </label>
            <input
              type="number"
              required
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10"
            />
          </div>

          {walletError && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
              {walletError}
            </div>
          )}
          {walletMessage && (
            <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">
              ✓ {walletMessage}
            </div>
          )}
        </form>
      </Modal>
    </>
  );
}
