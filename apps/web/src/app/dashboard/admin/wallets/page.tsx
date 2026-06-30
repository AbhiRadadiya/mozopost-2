"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

interface Merchant {
  id: string;
  business_name: string;
  wallet_balance: string;
}

export default function WalletControlPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/admin/merchants").then((r) => {
      setMerchants(r.data.merchants);
      if (r.data.merchants[0]) setSellerId(r.data.merchants[0].id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!sellerId || !amount) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/wallets/${sellerId}/adjust`, {
        amount: Number(amount),
        type,
        reason,
      });
      setMessage(`Wallet ${type}ed by ₹${amount} successfully`);
      setAmount("");
      setReason("");
      const { data } = await api.get("/admin/merchants");
      setMerchants(data.merchants);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Wallet Control</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Credit or debit seller wallets and view balances.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adjust Wallet Form */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">
              Adjust Wallet Balance
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                Merchant
              </label>
              <select
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
              >
                {merchants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.business_name} — ₹
                    {parseFloat(m.wallet_balance || "0").toFixed(0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                Action Type
              </label>
              <div className="flex rounded-xl border border-[#E5E8EF] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setType("credit")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${type === "credit" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-white text-[#94A3B8] hover:bg-[#F8F9FB]"}`}
                >
                  + Credit (Add Funds)
                </button>
                <button
                  type="button"
                  onClick={() => setType("debit")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#E5E8EF] ${type === "debit" ? "bg-[#FEE2E2] text-[#991B1B]" : "bg-white text-[#94A3B8] hover:bg-[#F8F9FB]"}`}
                >
                  − Debit (Remove Funds)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Reason
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Goodwill credit"
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">
                ✓ {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
            >
              {submitting
                ? "Processing..."
                : `${type === "credit" ? "+ Credit" : "− Debit"} Wallet`}
            </button>
          </form>
        </div>

        {/* Wallet Balances */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">
              All Merchant Wallets
            </h2>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[#F1F5F9]">
            {merchants.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F8F9FB] transition-colors"
              >
                <div className="text-sm font-medium text-[#0F172A]">
                  {m.business_name}
                </div>
                <div
                  className={`text-sm font-bold font-mono ${parseFloat(m.wallet_balance || "0") >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}
                >
                  ₹{parseFloat(m.wallet_balance || "0").toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
