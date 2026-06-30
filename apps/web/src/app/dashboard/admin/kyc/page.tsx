"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

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
        await api.post("/admin/rate-cards", {
          sellerId: selectedSeller.id,
          courierIds: selectedCouriers,
          baseRate: parseFloat(baseRate) || 0,
          additionalRatePerKg: parseFloat(additionalRate) || 0,
          codChargeFixed: parseFloat(codFixed) || 0,
          codChargePct: parseFloat(codPct) || 0,
        });
      }
      await api.patch(`/admin/merchants/${selectedSeller.id}/kyc`, { kycStatus: "verified" });
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
      {modal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C2110]/50 backdrop-blur-[2px]"
          onClick={() => setModal(null)}
        >
          <div 
            className="bg-white border border-[#E2D4B8] rounded-[16px] overflow-hidden shadow-[0_24px_70px_rgba(40,45,20,0.4)] relative"
            style={{ width: modal === "approve" ? "540px" : "460px" }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* ── APPROVE / RATE MODAL ── */}
            {modal === "approve" && selectedSeller && (
              <div>
                <div className="px-[24px] py-[18px] border-b border-[#EADFC8] flex items-center justify-between bg-[#FAF4E6]">
                  <div>
                    <div className="text-[16px] font-bold text-[#2F3A22]">Configure Seller Rates</div>
                    <div className="text-[12px] text-[#8A9270] mt-[2px]">{selectedSeller.business_name} · Initial Configuration</div>
                  </div>
                  <button onClick={() => setModal(null)} className="text-[#8A9270] hover:text-[#2F3A22] bg-inherit">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
                
                <div className="p-[24px]">
                  <div className="text-[13px] text-[#6B7556] mb-[20px]">
                    Configure pricing for this seller. You can apply a simple margin on top of our global base rates, or create a completely custom rate card.
                  </div>

                  <div className="flex gap-[8px] mb-[20px]">
                    {[
                      { id: "margin", label: "Global Rate + Margin" },
                      { id: "custom", label: "Custom Rate Card" }
                    ].map(type => (
                      <div 
                        key={type.id} 
                        onClick={() => setRateMode(type.id as "margin" | "custom")}
                        className={`flex-1 py-[10px] text-center rounded-[8px] text-[13px] cursor-pointer transition-colors border ${
                          rateMode === type.id 
                            ? "bg-[#FAF4E6] border-[#546B41] text-[#546B41] font-bold"
                            : "bg-white border-[#E2D4B8] text-[#6B7556] hover:border-[#D8CBAE]"
                        }`}
                      >
                        {type.label}
                      </div>
                    ))}
                  </div>

                  {rateMode === "margin" ? (
                    <div className="mb-[14px]">
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">Margin (Flat ₹)</div>
                      <input 
                        type="number"
                        min="0"
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]" 
                        placeholder="e.g. 5.00"
                        value={marginValue}
                        onChange={(e) => setMarginValue(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-[14px]">
                      <div className="col-span-2">
                        <div className="text-[12px] text-[#8A9270] mb-[6px]">Couriers</div>
                        <div className="flex flex-wrap gap-[10px] bg-[#FAF4E6] border border-[#E2D4B8] rounded-[8px] p-[12px]">
                          {couriers.map((c: any) => (
                            <label key={c.id} className="flex items-center gap-[6px] text-[13px] text-[#2F3A22] font-medium cursor-pointer bg-white px-[10px] py-[6px] rounded-[6px] border border-[#EADFC8] hover:border-[#546B41] transition-colors">
                              <input 
                                type="checkbox"
                                className="accent-[#546B41]"
                                checked={selectedCouriers.includes(c.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedCouriers([...selectedCouriers, c.id]);
                                  else setSelectedCouriers(selectedCouriers.filter(id => id !== c.id));
                                }}
                              />
                              {c.name}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[12px] text-[#8A9270] mb-[6px]">Base Rate (₹)</div>
                        <input type="number" className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]" placeholder="e.g. 40" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-[12px] text-[#8A9270] mb-[6px]">Additional Rate/Kg (₹)</div>
                        <input type="number" className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]" placeholder="e.g. 35" value={additionalRate} onChange={(e) => setAdditionalRate(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-[12px] text-[#8A9270] mb-[6px]">COD Fixed (₹)</div>
                        <input type="number" className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]" placeholder="e.g. 50" value={codFixed} onChange={(e) => setCodFixed(e.target.value)} />
                      </div>
                      <div>
                        <div className="text-[12px] text-[#8A9270] mb-[6px]">COD Percent (%)</div>
                        <input type="number" className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]" placeholder="e.g. 2" value={codPct} onChange={(e) => setCodPct(e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-[10px] mt-[24px]">
                    <button 
                      onClick={() => setModal(null)}
                      disabled={actionLoading}
                      className="border border-[#E2D4B8] rounded-[8px] px-[18px] py-[10px] text-[13px] text-[#6B7556] hover:border-[#D8CBAE] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="bg-[#546B41] text-[#FFF8EC] rounded-[8px] px-[22px] py-[10px] text-[13px] font-semibold hover:bg-[#63794E] transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? 'Approving...' : 'Approve & Save Rates'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── REJECT MODAL ── */}
            {modal === "reject" && selectedSeller && (
              <div>
                <div className="px-[24px] py-[18px] border-b border-[#EADFC8] flex items-center justify-between bg-[#FEE2E2]/30">
                  <div>
                    <div className="text-[16px] font-bold text-[#991B1B]">Reject Application</div>
                    <div className="text-[12px] text-[#B4623F] mt-[2px]">{selectedSeller.business_name}</div>
                  </div>
                  <button onClick={() => setModal(null)} className="text-[#B4623F] hover:text-[#991B1B] bg-inherit">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
                
                <div className="p-[24px]">
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

                  <div className="flex justify-end gap-[10px] mt-[24px]">
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
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
