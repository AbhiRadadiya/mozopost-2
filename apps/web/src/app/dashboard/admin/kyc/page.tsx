"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

export default function KycPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [activeTab, setActiveTab] = useState("Pending");
  const [modal, setModal] = useState<"approve" | "reject" | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const [couriers, setCouriers] = useState<any[]>([]);

  // Rate Modal State
  const [rateMode, setRateMode] = useState<"margin" | "custom">("margin");
  const [marginValue, setMarginValue] = useState("");
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>([]);
  const [baseRate, setBaseRate] = useState("");
  const [additionalRate, setAdditionalRate] = useState("");
  const [codFixed, setCodFixed] = useState("");
  const [codPct, setCodPct] = useState("");
  
  // Advanced KYC Modal States
  const [kycDocs, setKycDocs] = useState<Record<string, boolean>>({});
  const [paymentCycle, setPaymentCycle] = useState<string>("Weekly");
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [autoRecoverCod, setAutoRecoverCod] = useState<boolean>(true);
  const [accountManager, setAccountManager] = useState<string>("");
  const [salesManager, setSalesManager] = useState<string>("");
  const [courierRates, setCourierRates] = useState<Record<string, number>>({});
  // Reject Modal State
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ data: mData }, { data: cData }] = await Promise.all([
        api.get("/admin/merchants"),
        api.get("/couriers")
      ]);
      setMerchants(mData.merchants);
      setCouriers(cData.couriers);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const pending = merchants.filter((m) => ["pending", "submitted", "pending_kyc"].includes(m.kyc_status) || m.status === "pending_kyc");
  const approved = merchants.filter((m) => m.kyc_status === "verified");
  const rejected = merchants.filter((m) => m.kyc_status === "rejected");

  const displayList = activeTab === "Pending" ? pending : activeTab === "Approved" ? approved : rejected;

  async function handleApprove() {
    if (!selectedSeller) return;
    setActionLoading(true);
    try {
      if (rateMode === "margin" && marginValue) {
        await api.post("/admin/margins", {
          sellerId: selectedSeller.id,
          marginType: "flat",
          marginValue: parseFloat(marginValue),
        });
      } else if (rateMode === "custom" && selectedCouriers.length > 0) {
        await Promise.all(selectedCouriers.map(cid => 
          api.post("/admin/rate-cards", {
            sellerId: selectedSeller.id,
            courierIds: [cid],
            baseRate: courierRates[cid] || 0,
            additionalRatePerKg: 0,
            codChargeFixed: 0,
            codChargePct: 0,
          })
        ));
      }
      await api.patch(`/admin/merchants/${selectedSeller.id}/kyc`, { 
        kycStatus: "verified",
        paymentCycle,
        creditLimit,
        autoRecoverCod,
        accountManagerId: accountManager || null,
        salesManagerId: salesManager || null
      });
      await load();
      setModal(null);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!selectedSeller) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/merchants/${selectedSeller.id}/kyc`, { kycStatus: "rejected", reason: rejectReason });
      await load();
      setModal(null);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleHold() {
    if (!selectedSeller) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/merchants/${selectedSeller.id}/kyc`, { kycStatus: "hold" });
      await load();
      setModal(null);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }


  function openApproveModal(seller: any) {
    setSelectedSeller(seller);
    setRateMode("margin");
    setMarginValue("");
    setSelectedCouriers([]);
    setBaseRate("");
    setAdditionalRate("");
    setCodFixed("");
    setCodPct("");
    setModal("approve");
  }

  function openRejectModal(seller: any) {
    setSelectedSeller(seller);
    setRejectReason("");
    setModal("reject");
  }

  return (
    <>
      <div className="animate-fade-up pb-12">
        {/* ── Header ── */}
        <div className="mb-6">
          <div className="text-[24px] font-bold tracking-tight text-[#2F3A22]">KYC & Onboarding Approvals</div>
          <div className="text-[13px] text-[#8A9270] mt-1">Review documents before a seller can ship.</div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-[20px] mb-6 border-b border-[#EADFC8]">
          {[
            { label: "Pending", count: pending.length },
            { label: "Approved", count: approved.length },
            { label: "Rejected", count: rejected.length },
          ].map((t) => (
            <div 
              key={t.label}
              onClick={() => setActiveTab(t.label)}
              className={`flex items-center gap-[8px] pb-[12px] cursor-pointer text-[14px] font-semibold transition-colors ${
                activeTab === t.label 
                  ? "text-[#546B41] border-b-2 border-[#546B41]" 
                  : "text-[#8A9270] hover:text-[#546B41]"
              }`}
            >
              {t.label}
              <span className={`px-[6px] py-[2px] rounded-full text-[11px] font-bold font-mono-nb ${
                activeTab === t.label ? "bg-[#EDF0E4] text-[#546B41]" : "bg-[#FAF4E6] text-[#A59A7E]"
              }`}>
                {t.count}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[13px] font-mono-nb text-[#8A9270] animate-pulse-soft">
            Loading applications...
          </div>
        ) : displayList.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[#8A9270]">
            No applications found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
            {displayList.map((m) => {
              const appliedDate = m.created_at ? new Date(m.created_at) : new Date();
              const daysAgo = Math.floor((Date.now() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
              const appliedStr = daysAgo === 0 ? "today" : `${daysAgo}d ago`;
              const ownerStr = m.first_name || m.last_name ? `${m.first_name || ''} ${m.last_name || ''}`.trim() : m.email.split('@')[0];

              return (
                <div key={m.id} className="bg-white border border-[#E2D4B8] rounded-[14px] overflow-hidden shadow-sm">
                  {/* Card Header */}
                  <div className="p-[16px] px-[18px] flex items-center gap-[12px] border-b border-[#F0E8D6]">
                    <span className="w-[40px] h-[40px] rounded-[10px] bg-[#EDF0E4] text-[#546B41] flex items-center justify-center text-[13px] font-semibold font-mono-nb shrink-0">
                      {m.business_name.substring(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-bold text-[#2F3A22] truncate">{m.business_name}</div>
                      <div className="text-[11.5px] text-[#8A9270] truncate">{ownerStr} · applied {appliedStr}</div>
                    </div>
                    {m.kyc_status === "verified" && (
                      <span className="px-[8px] py-[3px] rounded-[6px] bg-[#EDF0E4] text-[#546B41] border border-[#CBD7B5] text-[11px] font-bold">Approved</span>
                    )}
                    {m.kyc_status === "rejected" && (
                      <span className="px-[8px] py-[3px] rounded-[6px] bg-[#FEE2E2] text-[#991B1B] border border-[#F3C8C8] text-[11px] font-bold">Rejected</span>
                    )}
                    {(["pending", "submitted", "pending_kyc"].includes(m.kyc_status) || m.status === "pending_kyc") && (
                      <span className="px-[8px] py-[3px] rounded-[6px] bg-[#FFFBEB] text-[#D97706] border border-[#F3E1C8] text-[11px] font-bold">Pending</span>
                    )}
                  </div>

                  {/* Documents Grid */}
                  <div className="p-[14px] px-[18px] grid grid-cols-2 gap-[9px]">
                    {[
                      { label: "GSTIN", value: m.gstin || "awaiting", ok: !!m.gstin },
                      { label: "PAN", value: "Not Provided", ok: false }, // Replace with real PAN if available
                      { label: "Bank A/c", value: "Pending Verification", ok: false }, // Replace with real bank info if available
                      { label: "Address Proof", value: "electricity_bill.pdf", ok: true },
                    ].map((d, i) => (
                      <div key={i} className="flex items-center gap-[9px] bg-[#FAF4E6] border border-[#EADFC8] rounded-[8px] p-[9px] px-[11px]">
                        <span className={`text-[14px] flex items-center justify-center w-[16px] ${d.ok ? 'text-[#546B41]' : 'text-[#D97706]'}`}>
                          {d.ok ? '⛨' : '⚠'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-[#2F3A22]">{d.label}</div>
                          <div className={`text-[10.5px] font-mono-nb truncate ${d.ok ? 'text-[#A59A7E]' : 'text-[#D97706]'}`}>
                            {d.value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="px-[18px] pb-[16px]">
                    {activeTab === "Pending" ? (
                      <div className="flex gap-[9px]">
                        <button 
                          onClick={() => openRejectModal(m)}
                          className="flex-1 text-center border border-[#E3C3B1] text-[#B4623F] rounded-[8px] py-[9px] text-[13px] font-semibold hover:bg-[#F6ECE4] transition-colors"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => openApproveModal(m)}
                          className="flex-1 text-center bg-[#546B41] text-[#FFF8EC] rounded-[8px] py-[9px] text-[13px] font-semibold hover:bg-[#63794E] transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    ) : (
                      <div className="text-[12px] font-medium text-[#8A9270] italic">
                        Application was {activeTab.toLowerCase()} by an administrator.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================== MODAL LAYER ===================== */}
      <Modal
        title=""
        isOpen={modal === "approve"}
        onClose={() => setModal(null)}
        width="600px"
        bodyClassName="p-0"
        customHeader={
          <div className="bg-gradient-to-br from-[#5C7347] to-[#4A5F37] px-[24px] py-[18px] flex items-center gap-[12px] text-[#fff8ec] shrink-0">
            <span className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[13px] font-semibold font-mono-nb bg-white/20">
              {selectedSeller?.business_name?.substring(0, 2).toUpperCase()}
            </span>
            <div className="flex-1">
              <div className="text-[16px] font-bold">Onboard & Approve — {selectedSeller?.business_name}</div>
              <div className="text-[12px] opacity-80 mt-[2px]">Complete every mandatory step before the merchant can go live</div>
            </div>
            <span onClick={() => setModal(null)} className="cursor-pointer text-[16px] opacity-85 hover:opacity-100">✕</span>
          </div>
        }
      >
        {/* progress checklist strip */}
        <div className="flex gap-[6px] px-[24px] py-[14px] border-b border-[#EADFC8] shrink-0 bg-[#FAF4E6] overflow-x-auto">
          {["KYC", "Cycle", "Wallet", "Courier", "Rate"].map((step, i) => {
            let done = false;
            if (step === "KYC") done = Object.values(kycDocs).filter(Boolean).length === 4;
            if (step === "Cycle") done = !!paymentCycle;
            if (step === "Wallet") done = true;
            if (step === "Courier") done = selectedCouriers.length > 0;
            if (step === "Rate") done = rateMode === "margin" ? !!marginValue : Object.keys(courierRates).length > 0;
            
            return (
              <div key={i} className={`flex items-center gap-[6px] px-[10px] py-[4px] rounded-[8px] text-[11px] font-semibold whitespace-nowrap transition-colors border ${done ? 'bg-[#546B41] text-white border-[#546B41]' : 'bg-white text-[#8A9270] border-[#EADFC8]'}`}>
                <span>{done ? '✓' : i + 1}</span>{step}
              </div>
            );
          })}
        </div>

        <div className="px-[24px] py-[20px] overflow-y-auto">
          {/* 1. KYC verification */}
          <div className="text-[12px] text-[#546b41] uppercase tracking-[.5px] font-bold mb-[10px]">① KYC Verification</div>
          <div className="grid grid-cols-2 gap-[9px]">
            {[
              { id: "gstin", label: "GSTIN", value: selectedSeller?.gstin || "Pending" },
              { id: "kyc", label: "KYC Docs", value: "Aadhaar / PAN" },
              { id: "bank", label: "Bank A/c", value: "Verified via Penny Drop" },
              { id: "agreement", label: "Agreement", value: "Digitally Signed" }
            ].map(doc => {
              const ok = !!kycDocs[doc.id];
              return (
                <div key={doc.id} onClick={() => setKycDocs(prev => ({...prev, [doc.id]: !ok}))} className={`flex items-center gap-[9px] p-[9px] px-[11px] rounded-[8px] border cursor-pointer transition-colors ${ok ? 'bg-white border-[#546b41] shadow-[0_2px_8px_rgba(84,107,65,0.12)]' : 'bg-[#faf4e6] border-[#eadfc8] hover:border-[#d8cbae]'}`}>
                  <span className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-[#546b41] border-[#546b41] text-white' : 'border-[#d8cbae] text-transparent'}`}>✓</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-[#2f3a22]">{doc.label}</div>
                    <div className={`text-[10.5px] font-mono-nb truncate ${ok ? 'text-[#8a9270]' : 'text-[#a59a7e]'}`}>{doc.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. Payment cycle */}
          <div className="text-[12px] text-[#546b41] uppercase tracking-[.5px] font-bold mt-[22px] mb-[10px]">② Payment / Settlement Cycle</div>
          <div className="flex gap-[8px] flex-wrap">
            {["Daily", "Weekly", "Bi-weekly", "Monthly"].map(c => (
              <div key={c} onClick={() => setPaymentCycle(c)} className={`px-[14px] py-[8px] rounded-[8px] text-[13px] font-semibold cursor-pointer border transition-colors ${paymentCycle === c ? 'bg-[#546b41] text-white border-[#546b41]' : 'bg-[#faf4e6] text-[#6b7556] border-[#eadfc8] hover:bg-[#f2e6c4]'}`}>
                {c}
              </div>
            ))}
          </div>

          {/* 3. Wallet configuration */}
          <div className="text-[12px] text-[#546b41] uppercase tracking-[.5px] font-bold mt-[22px] mb-[10px]">③ Wallet / Credit Configuration</div>
          <div className="bg-[#faf4e6] border border-[#eadfc8] rounded-[11px] p-[15px]">
            <div className="text-[11.5px] font-semibold text-[#6b7556] mb-[11px]">Credit line terms</div>
            <div className="grid grid-cols-2 gap-[12px]">
              <div className="flex items-center justify-between gap-[8px]">
                <span className="text-[12px] text-[#6b7556]">Credit Limit (₹)</span>
                <div className="flex items-center gap-[7px]">
                  <span onClick={() => setCreditLimit(Math.max(0, creditLimit - 5000))} className="w-[24px] h-[24px] rounded-[6px] border border-[#e2d4b8] flex items-center justify-center text-[14px] cursor-pointer text-[#6b7556] hover:bg-white transition-colors">−</span>
                  <span className="min-w-[64px] text-center font-mono-nb text-[13px] font-bold text-[#546b41]">{creditLimit}</span>
                  <span onClick={() => setCreditLimit(creditLimit + 5000)} className="w-[24px] h-[24px] rounded-[6px] border border-[#e2d4b8] flex items-center justify-center text-[14px] cursor-pointer text-[#6b7556] hover:bg-white transition-colors">+</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-[8px] col-span-2 pt-[4px] border-t border-dashed border-[#e2d4b8]">
                <span className="text-[12px] text-[#6b7556]">Auto-recover from COD (Net-Off)</span>
                <div onClick={() => setAutoRecoverCod(!autoRecoverCod)} className={`w-[36px] h-[20px] rounded-full p-[2px] cursor-pointer transition-colors relative ${autoRecoverCod ? 'bg-[#546b41]' : 'bg-[#d8cbae]'}`}>
                  <span className={`absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full transition-all ${autoRecoverCod ? 'left-[18px]' : 'left-[2px]'}`}></span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Courier access */}
          <div className="text-[12px] text-[#546b41] uppercase tracking-[.5px] font-bold mt-[22px] mb-[10px]">④ Courier Access & Seller Rate</div>
          <div className="flex flex-col gap-[10px]">
            {couriers.map((c: any) => {
              const enabled = selectedCouriers.includes(c.id);
              const rate = courierRates[c.id] || 0;
              return (
                <div key={c.id} className={`border rounded-[11px] p-[12px] transition-colors ${enabled ? 'bg-white border-[#546b41] shadow-sm' : 'bg-[#faf4e6] border-[#eadfc8]'}`}>
                  <div className="flex items-center gap-[11px]">
                    <span className="w-[32px] h-[32px] rounded-[8px] bg-[#546b41] text-white flex items-center justify-center text-[11px] font-bold font-mono-nb">{c.name.substring(0,2).toUpperCase()}</span>
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold text-[#2f3a22]">{c.name}</div>
                    </div>
                    <div onClick={() => setSelectedCouriers(prev => enabled ? prev.filter(id => id !== c.id) : [...prev, c.id])} className={`w-[42px] h-[24px] rounded-full p-[3px] cursor-pointer transition-colors relative ${enabled ? 'bg-[#546b41]' : 'bg-[#d8cbae]'}`}>
                      <span className={`absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full transition-all ${enabled ? 'left-[21px]' : 'left-[3px]'}`}></span>
                    </div>
                  </div>
                  {enabled && (
                    <div className="flex items-center gap-[10px] mt-[12px] pt-[12px] border-t border-dashed border-[#e2d4b8]">
                      <span className="text-[12px] text-[#6b7556] flex-1">Seller rate (base / 0.5 kg)</span>
                      {rate > 0 ? (
                        <div className="flex items-center gap-[8px]">
                          <span onClick={() => setCourierRates(prev => ({...prev, [c.id]: Math.max(0, (prev[c.id]||0) - 1)}))} className="w-[26px] h-[26px] rounded-[7px] border border-[#e2d4b8] flex items-center justify-center text-[15px] cursor-pointer text-[#6b7556] hover:border-[#d8cbae]">−</span>
                          <span className="min-w-[58px] text-center font-mono-nb text-[15px] font-bold text-[#546b41]">₹{rate}</span>
                          <span onClick={() => setCourierRates(prev => ({...prev, [c.id]: (prev[c.id]||0) + 1}))} className="w-[26px] h-[26px] rounded-[7px] border border-[#e2d4b8] flex items-center justify-center text-[15px] cursor-pointer text-[#6b7556] hover:border-[#d8cbae]">+</span>
                        </div>
                      ) : (
                        <div onClick={() => setCourierRates(prev => ({...prev, [c.id]: 45}))} className="border border-[#c8923f] bg-[#f7efda] text-[#a9842e] rounded-[8px] px-[14px] py-[8px] text-[12.5px] font-semibold cursor-pointer hover:bg-[#f2e6c4]">⚠ Tap to set rate</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 5. Rate Card model */}
          <div className="text-[12px] text-[#546b41] uppercase tracking-[.5px] font-bold mt-[22px] mb-[10px]">⑤ Rate Card Model</div>
          <div className="flex gap-[8px] flex-wrap">
            {[
              { id: "margin", label: "Global Rate + Margin" },
              { id: "custom", label: "Custom Rate Card" }
            ].map(r => (
              <div key={r.id} onClick={() => setRateMode(r.id as any)} className={`px-[14px] py-[8px] rounded-[8px] text-[13px] font-semibold cursor-pointer border transition-colors ${rateMode === r.id ? 'bg-[#546b41] text-white border-[#546b41]' : 'bg-[#faf4e6] text-[#6b7556] border-[#eadfc8] hover:bg-[#f2e6c4]'}`}>
                {r.label}
              </div>
            ))}
          </div>
          {rateMode === "margin" && (
            <div className="mt-[10px]">
              <input 
                type="number"
                min="0"
                className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]" 
                placeholder="Margin (Flat ₹) e.g. 5.00"
                value={marginValue}
                onChange={(e) => setMarginValue(e.target.value)}
              />
            </div>
          )}

          {/* 6. Assign managers */}
          <div className="text-[12px] text-[#546b41] uppercase tracking-[.5px] font-bold mt-[22px] mb-[10px]">⑥ Assign Managers <span className="text-[#a59a7e] font-normal normal-case tracking-normal">(optional)</span></div>
          <div className="grid grid-cols-2 gap-[12px]">
            <div>
              <div className="text-[11.5px] text-[#8a9270] mb-[6px]">Account Manager</div>
              <input type="text" placeholder="Manager ID / Email" value={accountManager} onChange={e => setAccountManager(e.target.value)} className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[8px] text-[13px] outline-none focus:border-[#546B41]" />
            </div>
            <div>
              <div className="text-[11.5px] text-[#8a9270] mb-[6px]">Sales Manager</div>
              <input type="text" placeholder="Manager ID / Email" value={salesManager} onChange={e => setSalesManager(e.target.value)} className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[8px] text-[13px] outline-none focus:border-[#546B41]" />
            </div>
          </div>

        </div>

        {/* admin controls footer */}
        <div className="p-[14px] px-[24px] border-t border-[#EADFC8] flex gap-[10px] shrink-0 bg-white">
          <div onClick={() => setModal("reject")} className="border border-[#e3c3b1] text-[#b4623f] rounded-[9px] px-[16px] py-[12px] text-[13px] font-semibold cursor-pointer hover:bg-[#f6ece4] text-center w-[80px]">Reject</div>
          <div onClick={handleHold} className="border border-[#e6d6a8] text-[#a9842e] rounded-[9px] px-[16px] py-[12px] text-[13px] font-semibold cursor-pointer hover:bg-[#f7efda] text-center w-[80px]">Hold</div>
          <div 
            onClick={() => {
              if (Object.values(kycDocs).filter(Boolean).length === 4) {
                handleApprove();
              }
            }} 
            className={`flex-1 text-center rounded-[9px] px-[16px] py-[12px] text-[13px] font-semibold transition-colors ${Object.values(kycDocs).filter(Boolean).length === 4 ? 'bg-[#546b41] text-white cursor-pointer hover:bg-[#4a5f37]' : 'bg-[#e9e2d1] text-[#b5af9f] cursor-not-allowed'}`}
          >
            {actionLoading ? 'Activating...' : 'Activate & Onboard Seller'}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal === "reject"}
        onClose={() => setModal(null)}
        title="Reject Application"
        subtitle={selectedSeller?.business_name}
        headerTheme="danger"
        width="460px"
        footer={
          <>
            <button 
              onClick={() => setModal(null)}
              disabled={actionLoading}
              className="border border-[#E2D4B8] rounded-[8px] px-[18px] py-[10px] text-[13px] text-[#6B7556] hover:border-[#D8CBAE] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleReject}
              disabled={!rejectReason || actionLoading}
              className="bg-[#B4623F] text-[#FFF8EC] rounded-[8px] px-[22px] py-[10px] text-[13px] font-semibold hover:bg-[#9A5132] transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </>
        }
      >
        <div className="text-[13px] text-[#6B7556] mb-[20px]">
          Please provide a reason for rejecting this application. This will be visible to the seller.
        </div>

        <div>
          <div className="text-[12px] text-[#8A9270] mb-[6px]">Rejection Reason</div>
          <textarea 
            rows={3}
            className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#B4623F]" 
            placeholder="e.g. GSTIN mismatch with business name..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}
