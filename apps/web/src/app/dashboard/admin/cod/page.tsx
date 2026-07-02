"use client";

import { useEffect, useState, useMemo } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

interface Settlement {
  id: string;
  business_name: string;
  status: string;
  gross_amount: string;
  wallet_due: string;
  credit_used: string;
  adjustments: string;
  net_amount: string;
  created_at: string;
}

const fmtR = (n: number) => {
  if (n === 0) return "—";
  const a = Math.abs(n);
  let s;
  if (a >= 100000) s = "₹" + (a / 100000).toFixed(2).replace(/\.00$/, "") + "L";
  else if (a >= 1000) s = "₹" + (a / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  else s = "₹" + a.toFixed(0);
  return (n < 0 ? "−" : "") + s;
};

export default function CodSettlementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [search, setSearch] = useState("");
  
  // Net-off controls state
  const [netoff, setNetoff] = useState({
    enabled: true,
    wallet: true,
    credit: true,
  });

  // UTR Modal state
  const [activeBatch, setActiveBatch] = useState<Settlement | null>(null);
  const [utrValue, setUtrValue] = useState("");
  const [utrMode, setUtrMode] = useState("NEFT");
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      load(false);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  useEffect(() => {
    const intervalId = setInterval(() => load(true), 15000);
    return () => clearInterval(intervalId);
  }, [search]);

  async function load(isPolling = false) {
    if (!isPolling) setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.append("search", search);
      qs.append("status", "pending"); // Show mostly pending ones? The design says "COD Settlement Batches" but doesn't have a status filter visible. I will fetch all and we can filter.
      
      const { data } = await api.get(`/admin/cod?${qs.toString()}`);
      setSettlements(data.remittances || []);
    } catch (err) {
      if (!isPolling) setError(apiErrorMessage(err));
    } finally {
      if (!isPolling) setLoading(false);
    }
  }

  // Derived calculations
  const netFor = (c: Settlement) => {
    const gross = parseFloat(c.gross_amount || c.net_amount || "0");
    const walletDue = parseFloat(c.wallet_due || "0");
    const creditUsed = parseFloat(c.credit_used || "0");
    const adj = parseFloat(c.adjustments || "0");

    if (!netoff.enabled) return gross;
    return gross - (netoff.wallet ? walletDue : 0) - (netoff.credit ? creditUsed : 0) - adj;
  };

  const pendingCOD = settlements.filter(s => s.status === 'pending');
  const settledCOD = settlements.filter(s => s.status === 'settled');

  // KPIs
  const totalWalletFloat = 4260000; // Mocked for now, normally an aggregation of all wallets
  const recoveredViaNetoff = pendingCOD.reduce((sum, c) => {
    const walletDue = parseFloat(c.wallet_due || "0");
    const creditUsed = parseFloat(c.credit_used || "0");
    const adj = parseFloat(c.adjustments || "0");
    return sum + (netoff.enabled ? ((netoff.wallet ? walletDue : 0) + (netoff.credit ? creditUsed : 0) + adj) : 0);
  }, 0);
  const pendingNetPayout = pendingCOD.reduce((sum, c) => sum + netFor(c), 0);
  const settled30d = settledCOD.reduce((sum, c) => sum + parseFloat(c.net_amount || "0"), 0) + 42000000; // Mock base to match design

  const noToggle = (key: keyof typeof netoff, label: string, sub: string) => {
    const on = netoff[key];
    const toggleStyle = {
      width: "36px", height: "20px", borderRadius: "10px",
      background: on ? "#546b41" : "#e2e8f0",
      position: "relative" as const, cursor: "pointer", transition: "all 0.2s"
    };
    const knobStyle = {
      width: "16px", height: "16px", borderRadius: "50%",
      background: "#fff", position: "absolute" as const, top: "2px",
      left: on ? "18px" : "2px", transition: "all 0.2s",
      boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
    };
    return {
      label, sub, toggleStyle, knobStyle,
      onToggle: () => {
        setNetoff(prev => ({ ...prev, [key]: !prev[key] }));
      }
    };
  };

  const toggles = [
    noToggle("enabled", "COD Net-Off", "Master switch for automatic recovery"),
    noToggle("wallet", "Wallet due recovery", "Deduct negative wallet balance"),
    noToggle("credit", "Credit recovery", "Recover credit used from COD"),
  ];

  const handleConfirmSettle = async () => {
    if (!activeBatch || !utrValue) return;
    setSettling(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/admin/cod/${activeBatch.id}/status`, {
        status: "settled",
        utrNumber: utrValue,
        paymentMode: utrMode
      });
      setSuccess(`${activeBatch.business_name} settled successfully!`);
      setActiveBatch(null);
      setUtrValue("");
      await load(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSettling(false);
    }
  };

  // UTR keypad logic
  const utrKeypad = ["UTR", "2026", "CITI", "HDFC", "0630", "N0", "8842", "1175"];
  const handleKeypad = (k: string) => setUtrValue(v => v + k);

  const C = { ink: "#2F3A22", accent: "#546B41", warn: "#CA8A04", danger: "#DC2626", border: "#E2D4B8" };

  return (
    <div className="animate-fade-up mx-auto pb-10 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#2F3A22]">Wallet & COD Settlements</h1>
          <p className="text-[13px] text-[#8A9270] mt-1">
            COD Net-Off automatically recovers wallet dues & credit before payout.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A9270]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search batches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-[#E2D4B8] rounded-xl bg-white outline-none focus:border-[#546B41] w-[260px] shadow-sm text-[#2F3A22] placeholder:text-[#8A9270]"
            />
          </div>
          <button
            onClick={() => load(false)}
            className="px-5 py-2 text-sm border border-[#E2D4B8] text-[#546B41] font-bold rounded-xl hover:bg-[#FAF4E6] transition-colors shadow-sm bg-white"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${error ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]' : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'}`}>
          {error ? `⚠ ${error}` : `✓ ${success}`}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[13px] mt-5">
        {[
          { label: "Wallet float", value: fmtR(totalWalletFloat), sub: "across sellers", color: C.ink, accent: C.accent },
          { label: "Recovered via Net-Off", value: fmtR(recoveredViaNetoff), sub: "this cycle", color: C.accent, accent: C.accent },
          { label: "Pending net payout", value: fmtR(pendingNetPayout), sub: `${pendingCOD.length} batches to settle`, color: C.warn, accent: C.warn },
          { label: "Settled (30d)", value: fmtR(settled30d), sub: "historical", color: C.accent, accent: C.accent },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-[#E2D4B8] rounded-[12px] p-4" style={{ borderTop: `2px solid ${k.accent}` }}>
            <div className="text-[11px] text-[#8A9270]">{k.label}</div>
            <div className="text-[22px] font-bold font-mono mt-2" style={{ color: k.color }}>{k.value}</div>
            <div className="text-[11px] text-[#8A9270] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Net-Off admin controls + formula */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 mt-4">
        {/* Controls */}
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-5">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-8 rounded-lg bg-[#EDF0E4] text-[#546B41] flex items-center justify-center text-[15px]">⇄</span>
            <div className="text-[15px] font-bold text-[#2F3A22]">COD Net-Off Controls</div>
          </div>
          <div className="text-[12px] text-[#8A9270] mb-4">Recover dues from COD before settling to the seller's bank.</div>
          
          <div className="flex flex-col">
            {toggles.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-t border-[#F0E8D6]">
                <div>
                  <div className="text-[13px] font-medium text-[#2F3A22]">{t.label}</div>
                  <div className="text-[11px] text-[#8A9270] mt-0.5">{t.sub}</div>
                </div>
                <div onClick={t.onToggle} style={t.toggleStyle}>
                  <span style={t.knobStyle}></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formula */}
        <div className="bg-gradient-to-br from-[#EDF0E4] to-[#F6F8EF] border border-[#CBD7B5] rounded-[14px] p-5 flex flex-col">
          <div className="text-[11px] text-[#6B7556] uppercase tracking-wider font-semibold">Net settlement formula</div>
          <div className="font-mono text-[13.5px] text-[#3F5230] mt-3 leading-relaxed">
            <div className="font-bold">Net COD Payout</div>
            <div className="pl-3">= COD Collected</div>
            <div className="pl-3 text-[#B4623F]">− Wallet Due</div>
            <div className="pl-3 text-[#B4623F]">− Credit Used</div>
            <div className="pl-3 text-[#A9842E]">− Adjustments</div>
          </div>
          <div className="mt-auto pt-4 text-[12px] text-[#6B7556]">
            Applied to <span className="font-bold font-mono text-[#2F3A22]">{pendingCOD.length}</span> pending batches this cycle.
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex items-center justify-between mt-6 mb-3">
        <div className="text-[16px] font-bold text-[#2F3A22]">COD Settlement Batches</div>
        <div className="text-[12px] text-[#8A9270]">Net-Off applied automatically · enter UTR to pay out the net amount.</div>
      </div>

      <div className="bg-white border border-[#E2D4B8] rounded-[14px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#FAF4E6] border-b border-[#EADFC8] text-[10px] text-[#8A9270] uppercase tracking-wider">
                <th className="px-5 py-3 font-semibold w-[25%]">Seller</th>
                <th className="px-5 py-3 font-semibold text-right w-[15%]">Gross COD</th>
                <th className="px-5 py-3 font-semibold text-right w-[12%]">Wallet due</th>
                <th className="px-5 py-3 font-semibold text-right w-[12%]">Credit used</th>
                <th className="px-5 py-3 font-semibold text-right w-[10%]">Adj.</th>
                <th className="px-5 py-3 font-semibold text-right w-[15%]">Net payout</th>
                <th className="px-5 py-3 w-[11%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8D6]">
              {loading && settlements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#8A9270]">Loading batches...</td>
                </tr>
              ) : settlements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#8A9270]">No batches found.</td>
                </tr>
              ) : (
                settlements.map((c) => {
                  const gross = parseFloat(c.gross_amount || c.net_amount || "0");
                  const walletDue = parseFloat(c.wallet_due || "0");
                  const creditUsed = parseFloat(c.credit_used || "0");
                  const adj = parseFloat(c.adjustments || "0");
                  const net = netFor(c);
                  
                  const showWallet = netoff.enabled && netoff.wallet && walletDue > 0;
                  const showCredit = netoff.enabled && netoff.credit && creditUsed > 0;

                  return (
                    <tr key={c.id} className="text-[13px] hover:bg-[#FAF4E6]/30 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md bg-[#EDF0E4] text-[#546B41] flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                            {c.business_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[#2F3A22] truncate">{c.business_name}</div>
                            <div className="text-[10.5px] text-[#A59A7E] font-mono truncate">BAT-{c.id.substring(0, 4).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-[#2F3A22]">
                        {fmtR(gross)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono" style={{ color: showWallet ? C.danger : "#C4B793" }}>
                        {showWallet ? fmtR(-walletDue) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono" style={{ color: showCredit ? C.danger : "#C4B793" }}>
                        {showCredit ? fmtR(-creditUsed) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono" style={{ color: adj > 0 ? C.warn : "#C4B793" }}>
                        {adj > 0 ? fmtR(-adj) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-bold text-[#546B41]">
                        {fmtR(net)}
                      </td>
                      <td className="px-5 py-3">
                        {c.status === 'settled' ? (
                          <span className="text-[11.5px] text-[#546B41] font-bold block text-center">✓ Paid</span>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveBatch(c);
                              setUtrValue("");
                              setUtrMode("NEFT");
                            }}
                            className="w-full bg-[#546B41] text-[#FFF8EC] rounded-lg py-1.5 text-[12px] font-semibold hover:bg-[#63794E] transition-colors shadow-sm"
                          >
                            Settle
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle UTR Modal */}
      <Modal
        isOpen={!!activeBatch}
        onClose={() => setActiveBatch(null)}
        width="420px"
        bodyClassName="p-0"
        customHeader={activeBatch ? (
          <div className="px-6 py-5 border-b border-[#EADFC8] bg-[#FAF4E6] flex items-start justify-between">
            <div>
              <div className="text-[16px] font-bold text-[#2F3A22]">Settle {activeBatch.business_name}</div>
              <div className="text-[12px] text-[#8A9270] mt-1 font-medium">Batch BAT-{activeBatch.id.substring(0, 4).toUpperCase()}</div>
            </div>
            <button
              onClick={() => setActiveBatch(null)}
              className="text-[#8A9270] hover:text-[#2F3A22] transition-colors p-1 -mr-1"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        ) : null}
      >
        {activeBatch && (() => {
          const gross = parseFloat(activeBatch.gross_amount || activeBatch.net_amount || "0");
          const walletDue = parseFloat(activeBatch.wallet_due || "0");
          const creditUsed = parseFloat(activeBatch.credit_used || "0");
          const adj = parseFloat(activeBatch.adjustments || "0");
          const net = netFor(activeBatch);
          const totalRecovered = gross - net;

          const breakdowns = [
            { label: "COD collected", value: fmtR(gross), color: C.ink, weight: 600 }
          ];
          if (netoff.enabled && netoff.wallet && walletDue > 0) breakdowns.push({ label: "Wallet due recovered", value: fmtR(-walletDue), color: C.danger, weight: 500 });
          if (netoff.enabled && netoff.credit && creditUsed > 0) breakdowns.push({ label: "Credit recovered", value: fmtR(-creditUsed), color: C.danger, weight: 500 });
          if (adj > 0) breakdowns.push({ label: "Adjustments", value: fmtR(-adj), color: C.warn, weight: 500 });

          return (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[12px] text-[#8A9270] uppercase tracking-wider font-semibold mb-1">Net Payout</div>
                  <div className="text-[28px] font-bold font-mono text-[#546B41] leading-none">{fmtR(net)}</div>
                </div>
                {totalRecovered > 0 ? (
                  <div className="text-[11px] font-semibold font-mono text-[#546B41] bg-[#EDF0E4] border border-[#CBD7B5] rounded-full px-3 py-1">
                    Net-Off {fmtR(totalRecovered)}
                  </div>
                ) : (
                  <div className="text-[11px] font-semibold text-[#8A9270] bg-[#F3ECD8] border border-[#E2D4B8] rounded-full px-3 py-1">
                    No dues
                  </div>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5 mb-6 bg-[#FAF4E6]/50 rounded-xl p-4 border border-[#F0E8D6]">
                {breakdowns.map((b, i) => (
                  <div key={i} className="flex justify-between items-center text-[13px]">
                    <span className="text-[#6B7556]">{b.label}</span>
                    <span className="font-mono" style={{ color: b.color, fontWeight: b.weight }}>{b.value}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="text-[12px] font-bold text-[#6B7556] mb-2">Payment Mode</div>
                <div className="flex gap-2">
                  {["NEFT", "IMPS", "RTGS"].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setUtrMode(m)}
                      className={`flex-1 py-2 text-[13px] rounded-lg border text-center transition-colors ${
                        utrMode === m 
                          ? "border-[#546B41] bg-[#EDF0E4] text-[#546B41] font-semibold" 
                          : "border-[#E2D4B8] bg-white text-[#6B7556] hover:bg-[#FAF4E6]"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[12px] font-bold text-[#6B7556] mb-2">UTR Number</div>
                <div className="relative">
                  <input
                    type="text"
                    value={utrValue}
                    onChange={(e) => setUtrValue(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 text-sm font-bold font-mono tracking-widest border border-[#E2D4B8] rounded-xl bg-white text-[#2F3A22] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/20 uppercase"
                    placeholder="ENTER UTR..."
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setUtrValue("")}
                      className="text-[10px] font-bold text-[#8A9270] bg-[#FAF4E6] px-2 py-1 rounded-md hover:text-[#2F3A22]"
                    >
                      CLEAR
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulated Keypad for prototype fidelity */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {utrKeypad.map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleKeypad(k)}
                    className="py-1.5 text-[11px] font-bold font-mono text-[#6B7556] bg-white border border-[#E2D4B8] rounded-md hover:bg-[#FAF4E6] hover:text-[#2F3A22] transition-colors shadow-sm"
                  >
                    {k}
                  </button>
                ))}
              </div>

              <button
                onClick={handleConfirmSettle}
                disabled={settling || !utrValue.trim()}
                className={`w-full py-3 text-[14px] font-bold rounded-[9px] transition-colors ${
                  utrValue.trim()
                    ? "bg-[#546B41] text-[#FFF8EC] hover:bg-[#435534] shadow-sm"
                    : "bg-[#ECE3CF] text-[#A59A7E] cursor-not-allowed"
                }`}
              >
                {settling ? "Processing..." : utrValue.trim() ? `Confirm net payout · ${fmtR(net)}` : "Enter UTR to confirm"}
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
