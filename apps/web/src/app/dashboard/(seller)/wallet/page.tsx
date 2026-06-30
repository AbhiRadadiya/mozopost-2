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
  const [metrics, setMetrics] = useState<any>(null);
  const [amount, setAmount] = useState("1000");
  const [loading, setLoading] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [selectedTxns, setSelectedTxns] = useState<Set<string>>(new Set());

  useEffect(() => {
    load();
  }, [search, date]);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.append("search", search);
      if (date) qs.append("date", date);

      const [walletRes, txnRes, creditRes, metricsRes] = await Promise.all([
        api.get("/wallet"),
        api.get(`/wallet/transactions?${qs.toString()}`),
        api.get("/credit").catch(() => ({ data: null })),
        api.get("/wallet/metrics").catch(() => ({ data: { metrics: null } })),
      ]);
      setBalance(parseFloat(walletRes.data.wallet.balance));
      setTxns(txnRes.data.transactions);
      if (creditRes.data) setCredit(creditRes.data);
      if (metricsRes.data?.metrics) setMetrics(metricsRes.data.metrics);
      setSelectedTxns(new Set()); // Clear selection on reload
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

  function handleDownloadInvoices() {
    if (selectedTxns.size === 0) return;
    
    const toDownload = txns.filter(t => selectedTxns.has(t.id));
    const header = "Date,Description,Status,Type,Amount\n";
    const rows = toDownload.map(t => {
      const dt = new Date(t.created_at).toLocaleString("en-IN");
      const desc = `"${(t.description || (t.type === 'debit' ? 'Wallet Deduction' : 'Wallet Recharge')).replace(/"/g, '""')}"`;
      return `${dt},${desc},COMPLETED,${t.type.toUpperCase()},${t.amount}`;
    }).join("\n");

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_bulk.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSelectedTxns(new Set());
  }

  function handleDownloadSingleInvoice(id: string) {
    const t = txns.find(x => x.id === id);
    if (!t) return;

    const header = "Date,Description,Status,Type,Amount\n";
    const dt = new Date(t.created_at).toLocaleString("en-IN");
    const desc = `"${(t.description || (t.type === 'debit' ? 'Wallet Deduction' : 'Wallet Recharge')).replace(/"/g, '""')}"`;
    const row = `${dt},${desc},COMPLETED,${t.type.toUpperCase()},${t.amount}\n`;

    const blob = new Blob([header + row], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${id}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-fade-up mx-auto ">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-[#2F3A22] tracking-tight">
            Wallet
          </h1>
          <span className="px-2.5 py-0.5 bg-[#F4F6F0] border border-[#CBD7B5] text-[#546B41] text-[10px] font-bold uppercase tracking-widest rounded-full">
            Active
          </span>
        </div>
        <button className="px-4 py-1.5 border border-[#EADFC8] bg-[#F4F6F0] text-[#546B41] text-[13px] font-bold rounded-lg hover:bg-[#E0E7CE] transition-colors shadow-sm">
          View Shipping Rates
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-[#A84A3B] shadow-sm relative overflow-hidden">
          <div className="text-[11px] font-bold text-[#A84A3B] opacity-70 uppercase tracking-wider mb-2">
            Current Balance
          </div>
          <div className="text-2xl font-bold text-[#A84A3B] font-mono-nb">
            {loading ? "..." : `₹${balance?.toLocaleString("en-IN")}`}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border-l-4 border-l-[#546B41] border border-[#EADFC8] shadow-sm">
          <div className="text-[11px] font-bold text-[#8A9270] uppercase tracking-wider mb-2">
            Withdrawn Till Date
          </div>
          <div className="text-2xl font-bold text-[#2F3A22] font-mono-nb">
            {loading ? "..." : `₹${(metrics?.withdrawnTillDate || 0).toLocaleString("en-IN")}`}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border-l-4 border-l-[#546B41] border border-[#EADFC8] shadow-sm">
          <div className="text-[11px] font-bold text-[#8A9270] uppercase tracking-wider mb-2">
            7 Days Avg. Payments
          </div>
          <div className="text-2xl font-bold text-[#2F3A22] font-mono-nb">
            {loading ? "..." : `₹${(metrics?.sevenDaysAvgPayments || 0).toLocaleString("en-IN")}`}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border-l-4 border-l-[#A9842E] border border-[#EADFC8] shadow-sm">
          <div className="text-[11px] font-bold text-[#8A9270] uppercase tracking-wider mb-2">
            Outstanding
          </div>
          <div className="text-2xl font-bold text-[#2F3A22] font-mono-nb">
            {loading ? "..." : `₹${(metrics?.outstanding || 0).toLocaleString("en-IN")}`}
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
                ₹
                {(credit.wallet.creditOutstanding ?? 0).toLocaleString("en-IN")}
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

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#2F3A22]">Transactions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const evt = new CustomEvent("openWalletModal");
              window.dispatchEvent(evt);
            }}
            className="px-4 py-1.5 bg-[#F6EEDB] border border-[#EADFC8] text-[#546B41] text-[13px] font-bold rounded-lg hover:bg-[#E0E7CE] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="text-[#A9842E]">⚡</span> Recharge
          </button>
          <button 
            disabled={selectedTxns.size === 0}
            onClick={handleDownloadInvoices}
            className={`px-4 py-1.5 border border-[#EADFC8] text-[13px] font-bold rounded-lg transition-colors shadow-sm ${
              selectedTxns.size > 0 
                ? 'bg-white text-[#6B7556] hover:bg-[#FFF8EC]' 
                : 'bg-[#F4F6F0] text-[#A3A898] cursor-not-allowed opacity-70'
            }`}
          >
            Invoices {selectedTxns.size > 0 && `(${selectedTxns.size})`}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by description"
            className="bg-white border border-[#EADFC8] rounded-lg pl-8 pr-4 py-1.5 text-xs font-medium text-[#2F3A22] outline-none focus:border-[#546B41] shadow-sm w-48"
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
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <polyline points="3 3 3 8 8 8" />
          </svg>
          Reset Filter
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#EADFC8] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#8A9270] text-sm font-medium">
            Loading transactions...
          </div>
        ) : txns.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-sm font-medium text-[#8A9270]">
              No transactions found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#FFF8EC] border-b border-[#EADFC8] z-10">
                <tr>
                  <th className="px-5 py-3 w-10 text-left">
                    <input 
                      type="checkbox" 
                      className="rounded border-[#CBD7B5] text-[#546B41] focus:ring-[#546B41] w-4 h-4"
                      checked={txns.length > 0 && selectedTxns.size === txns.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTxns(new Set(txns.map(t => t.id)));
                        } else {
                          setSelectedTxns(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold text-[#8A9270] uppercase tracking-widest whitespace-nowrap">
                    DATE
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold text-[#8A9270] uppercase tracking-widest">
                    DESCRIPTION
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold text-[#8A9270] uppercase tracking-widest">
                    STATUS
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold text-[#8A9270] uppercase tracking-widest whitespace-nowrap">
                    CREDIT
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold text-[#8A9270] uppercase tracking-widest whitespace-nowrap">
                    DEBIT
                  </th>
                  <th className="px-5 py-3 text-left text-[9px] font-bold text-[#8A9270] uppercase tracking-widest whitespace-nowrap">
                    COD COLLECTED
                  </th>
                  <th className="px-5 py-3 text-center text-[9px] font-bold text-[#8A9270] uppercase tracking-widest whitespace-nowrap">
                    INVOICE
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F6EEDB]">
                {txns.map((t) => {
                  const isDebit = t.type === "debit";
                  const dt = new Date(t.created_at);
                  const dateStr = dt.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const timeStr = dt.toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#FFF8EC] transition-colors"
                    >
                      <td className="px-5 py-4 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#CBD7B5] text-[#546B41] focus:ring-[#546B41] w-4 h-4"
                          checked={selectedTxns.has(t.id)}
                          onChange={(e) => {
                            const next = new Set(selectedTxns);
                            if (e.target.checked) next.add(t.id);
                            else next.delete(t.id);
                            setSelectedTxns(next);
                          }}
                        />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-[#2F3A22]">
                          {dateStr}
                        </div>
                        <div className="text-[10px] font-medium text-[#8A9270]">
                          {timeStr}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#2F3A22]">
                          {t.description ||
                            (isDebit ? "Wallet Deduction" : "Wallet Recharge")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] text-[9px] font-bold uppercase tracking-wider shadow-sm">
                          COMPLETED
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono-nb text-[13px] font-bold text-[#546B41]">
                          {!isDebit
                            ? `₹${Math.abs(parseFloat(t.amount)).toLocaleString("en-IN")}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono-nb text-[13px] font-medium text-[#A84A3B]">
                          {isDebit
                            ? `₹${Math.abs(parseFloat(t.amount)).toLocaleString("en-IN")}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono-nb text-[13px] font-bold text-[#2F3A22]">
                          {!isDebit
                            ? `₹${Math.abs(parseFloat(t.amount)).toLocaleString("en-IN")}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-[#8A9270]">
                        <button 
                          onClick={() => handleDownloadSingleInvoice(t.id)}
                          className="hover:text-[#546B41] transition-colors"
                          title="Download Invoice"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
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
  );
}
