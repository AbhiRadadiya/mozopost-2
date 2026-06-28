"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

interface Txn {
  id: string;
  type: string;
  amount: string;
  balance_after: string;
  description: string;
  created_at: string;
}

interface CreditInfo {
  hasCreditFacility: boolean;
  wallet: { balance: number; creditOutstanding?: number };
  creditFacility: {
    creditLimit: number;
    availableCredit: number;
    utilizationPct: number;
    status: string;
    billingCycle: string;
    riskBand: string;
  } | null;
}

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

export default function WalletPage() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [balance, setBalance] = useState<number | null>(null);
  const [credit, setCredit] = useState<CreditInfo | null>(null);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [walletRes, txnRes, creditRes] = await Promise.all([
        api.get("/wallet"),
        api.get("/wallet/transactions"),
        api.get("/credit").catch(() => ({ data: null })),
      ]);
      setBalance(parseFloat(walletRes.data.wallet.balance));
      setTxns(txnRes.data.transactions);
      if (creditRes.data) setCredit(creditRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRecharge() {
    setError("");
    setMessage("");
    const amt = parseFloat(amount);
    if (!amt || amt < 100) {
      setError("Minimum recharge amount is ₹100");
      return;
    }
    setRecharging(true);
    try {
      const { data } = await api.post("/wallet/recharge/create", {
        amount: amt,
      });

      if (data.mock) {
        setMessage(data.message);
        await load();
        await fetchMe();
        setRecharging(false);
        return;
      }

      const options = {
        key: RAZORPAY_KEY || data.keyId,
        amount: Math.round(amt * 100),
        currency: "INR",
        name: "Mozopost",
        description: "Wallet Recharge",
        order_id: data.razorpayOrderId,
        handler: async (response: any) => {
          try {
            await api.post("/wallet/recharge/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: amt,
            });
            setMessage("Payment successful — wallet credited!");
            await load();
            await fetchMe();
          } catch (err) {
            setError(apiErrorMessage(err));
          }
        },
        theme: { color: "#4F46E5" },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setRecharging(false);
    }
  }

  return (
    <div className="animate-fade-up mx-auto">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">
            Wallet &amp; Billing
          </h1>
          <p className="text-sm text-[#8A9270] mt-1">
            Manage your prepaid balance, recharges, and credit limits.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-[#EADFC8] shadow-sm">
          <div className="text-[11px] font-bold text-[#8A9270] uppercase tracking-wider mb-1">
            Wallet Balance
          </div>
          <div className="text-2xl font-bold text-[#2F3A22] font-mono-nb">
            {loading ? "..." : `₹${balance?.toLocaleString("en-IN")}`}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#EADFC8] shadow-sm">
          <div className="text-[11px] font-bold text-[#8A9270] uppercase tracking-wider mb-1">
            Total Transactions
          </div>
          <div className="text-2xl font-bold text-[#2F3A22] font-mono-nb">
            {txns.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#EADFC8] shadow-sm flex flex-col justify-center">
          <div className="text-[11px] font-bold text-[#8A9270] uppercase tracking-wider mb-1">
            Payment Mode
          </div>
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono-nb border ${RAZORPAY_KEY ? "bg-[#EDF0E4] text-[#546B41] border-[#CBD7B5]" : "bg-[#FFF8EC] text-[#A9842E] border-[#E2D4B8]"}`}
            >
              {RAZORPAY_KEY ? "Live" : "Mock Mode"}
            </span>
          </div>
        </div>
      </div>

      {/* Credit facility panel */}
      {credit?.hasCreditFacility && credit.creditFacility && (
        <div
          className={`mb-6 p-5 rounded-xl border shadow-sm ${
            credit.creditFacility.riskBand === "exhausted"
              ? "bg-[#F1E2D8] border-[#DDBBA8]"
              : credit.creditFacility.riskBand === "near_limit"
                ? "bg-[#FFF8EC] border-[#E2D4B8]"
                : "bg-white border-[#EADFC8]"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-[#2F3A22] flex items-center gap-2 text-sm">
              💳 Postpaid Credit Facility
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold font-mono-nb border ${
                credit.creditFacility.riskBand === "exhausted"
                  ? "bg-[#F1E2D8] text-[#B4623F] border-[#DDBBA8]"
                  : credit.creditFacility.riskBand === "near_limit"
                    ? "bg-[#FFF8EC] text-[#A9842E] border-[#E2D4B8]"
                    : "bg-[#EDF0E4] text-[#546B41] border-[#CBD7B5]"
              }`}
            >
              {credit.creditFacility.riskBand === "exhausted"
                ? "Credit Exhausted"
                : credit.creditFacility.riskBand === "near_limit"
                  ? "Near Limit"
                  : "Active"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#FFF8EC]/50 p-3.5 rounded-lg border border-[#E2D4B8]">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-wider mb-1">
                Credit Limit
              </div>
              <div className="text-base font-bold text-[#2F3A22] font-mono-nb">
                ₹{credit.creditFacility.creditLimit.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-[#FFF8EC]/50 p-3.5 rounded-lg border border-[#E2D4B8]">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-wider mb-1">
                Used Credit
              </div>
              <div className="text-base font-bold text-[#B4623F] font-mono-nb">
                ₹{(credit.wallet.creditOutstanding ?? 0).toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-[#FFF8EC]/50 p-3.5 rounded-lg border border-[#E2D4B8]">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-wider mb-1">
                Available Credit
              </div>
              <div className="text-base font-bold text-[#546B41] font-mono-nb">
                ₹{credit.creditFacility.availableCredit.toLocaleString("en-IN")}
              </div>
            </div>
            <div className="bg-[#FFF8EC]/50 p-3.5 rounded-lg border border-[#E2D4B8]">
              <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-wider mb-1">
                Billing Cycle
              </div>
              <div className="text-base font-bold text-[#2F3A22]">
                {credit.creditFacility.billingCycle}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold text-[#475569] mb-2">
              <span>Credit Utilization</span>
              <span>{credit.creditFacility.utilizationPct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 bg-[#E5E8EF] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${credit.creditFacility.riskBand === "exhausted" ? "bg-[#EF4444]" : credit.creditFacility.riskBand === "near_limit" ? "bg-[#F59E0B]" : "bg-[#10B981]"}`}
                style={{
                  width: `${Math.min(100, credit.creditFacility.utilizationPct)}%`,
                }}
              />
            </div>
          </div>

          {credit.creditFacility.riskBand === "exhausted" && (
            <div className="mt-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]">
              Credit limit exhausted. New orders blocked. Please recharge your
              wallet.
            </div>
          )}
          {credit.creditFacility.riskBand === "near_limit" && (
            <div className="mt-4 p-3 rounded-xl bg-[#FFFBEB] border border-[#FEF08A] text-xs font-medium text-[#92400E]">
              Credit limit near exhaustion. Recharge soon to avoid order blocks.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharge Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden sticky top-6">
            <div className="px-5 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Recharge Wallet
              </h2>
            </div>
            <div className="p-5">
              <div className="relative mb-4">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-[#94A3B8]">
                  ₹
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] font-mono outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {[1000, 2000, 5000, 10000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(String(v))}
                    className="flex-1 bg-[#F8F9FB] border border-[#E5E8EF] text-[#475569] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-white hover:border-[#CBD5E1] transition-colors"
                  >
                    +₹{v.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>

              {!RAZORPAY_KEY && (
                <div className="mb-4 p-3 rounded-xl bg-[#F8F9FB] border border-[#E5E8EF] text-[11px] font-medium text-[#64748B] leading-relaxed">
                  Running in mock mode. Wallet credits instantly without actual
                  payment.
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]">
                  {error}
                </div>
              )}
              {message && (
                <div className="mb-4 p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-medium text-[#166534]">
                  {message}
                </div>
              )}

              <button
                disabled={recharging}
                onClick={handleRecharge}
                className="w-full flex items-center justify-center py-3 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50"
              >
                {recharging
                  ? "Processing..."
                  : RAZORPAY_KEY
                    ? "Pay via Razorpay"
                    : "Recharge Wallet"}
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E8EF] bg-white flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Transaction History
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-[#94A3B8] text-sm">
                Loading transactions...
              </div>
            ) : txns.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#F4F6F9] flex items-center justify-center mx-auto mb-3">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="2"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#64748B]">
                  No transactions found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#F8F9FB] shadow-sm z-10">
                    <tr>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Date
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Description
                      </th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((t) => {
                      const isDebit = t.type === "debit";
                      return (
                        <tr
                          key={t.id}
                          className="border-b border-[#F1F3F7] hover:bg-[#F8F9FB] transition-colors"
                        >
                          <td className="px-5 py-4 text-[#475569] font-medium text-xs whitespace-nowrap">
                            {new Date(t.created_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-5 py-4 text-[#0F172A] font-medium text-sm">
                            {t.description}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${isDebit ? "bg-[#FEF2F2] text-[#991B1B]" : "bg-[#D1FAE5] text-[#065F46]"}`}
                            >
                              {t.type}
                            </span>
                          </td>
                          <td
                            className={`px-5 py-4 text-right font-mono text-sm font-bold whitespace-nowrap ${isDebit ? "text-[#0F172A]" : "text-[#16A34A]"}`}
                          >
                            {isDebit ? "-" : "+"}₹
                            {Math.abs(parseFloat(t.amount)).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
