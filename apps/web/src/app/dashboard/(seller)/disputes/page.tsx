"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { format, differenceInDays } from "date-fns";

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
  proof_image_urls?: string[];
}

interface DisputeEvent {
  id: string;
  event_type: string;
  description: string;
  user_type: string;
  created_at: string;
}

const TABS = [
  { id: "new", label: "New Discrepancies" },
  { id: "auto_accepted", label: "Discrepancies Auto Accepted" },
  { id: "auto_disputed", label: "Auto disputed by MozoPost Shipping" },
  { id: "all", label: "All Discrepancies" },
];

export default function WeightDiscrepancyPage() {
  const [summary, setSummary] = useState<DisputeSummary | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyEvents, setHistoryEvents] = useState<DisputeEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Raise dispute form
  const [images, setImages] = useState<File[]>([]);
  const [remarks, setRemarks] = useState("");
  const [raising, setRaising] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        api.get("/weight-disputes/summary"),
        api.get("/weight-disputes"),
      ]);
      setSummary(sumRes.data.summary);
      setDisputes(listRes.data.disputes);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function acceptCharges(id: string) {
    try {
      await api.patch(`/weight-disputes/${id}/accept`);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    }
  }

  async function openRaiseModal(d: Dispute) {
    setSelectedDispute(d);
    setImages([]);
    setRemarks("");
    setRaiseModalOpen(true);
  }

  async function openHistoryModal(d: Dispute) {
    setSelectedDispute(d);
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/weight-disputes/${d.id}/history`);
      setHistoryEvents(res.data.events);
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleRaiseDispute() {
    if (!selectedDispute) return;
    setRaising(true);
    try {
      const imageUrls: string[] = [];
      for (const img of images) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(img);
        });
        const { data } = await api.post("/upload", { name: img.name, data: base64 });
        imageUrls.push(data.url);
      }

      await api.patch(`/weight-disputes/${selectedDispute.id}/escalate`, {
        remarks,
        proofImageUrls: imageUrls
      });
      setRaiseModalOpen(false);
      load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setRaising(false);
    }
  }

  const filteredDisputes = disputes.filter(d => {
    if (activeTab === "new") return d.status === "open";
    if (activeTab === "auto_accepted") return d.status === "rejected" && d.auto_flagged;
    if (activeTab === "auto_disputed") return d.escalated && d.auto_flagged;
    return true;
  });

  const formatWeight = (gm: number) => (gm / 1000).toFixed(2) + " Kg";
  const getSlab = (gm: number) => (Math.ceil(gm / 500) * 0.5).toFixed(1) + " Kg";

  return (
    <div className="flex flex-col h-full bg-[#FFF8EC] overflow-y-auto font-sans p-6">
      
      {/* HEADER & OVERVIEW */}
      <div className="text-[24px] font-bold tracking-tight text-[#0F172A]">Weight Discrepancy</div>
      <div className="text-[15px] font-semibold mt-5 text-[#0F172A]">Overview</div>
      
      <div className="grid grid-cols-1 md:grid-cols-[0.85fr_1.7fr_1.7fr] gap-4 mt-3">
        {/* New Discrepancies */}
        <div className="bg-[#F1E2D8] border border-[#DDBBA8] rounded-2xl p-[18px]">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
            <span className="text-[#B4623F] text-lg">⌕</span> New Discrepancies
          </div>
          <div className="bg-white border border-[#E2D4B8] rounded-xl p-3.5 mt-3.5">
            <div className="text-[22px] font-bold font-mono">
              {summary?.open || 0} <span className="text-[13px] text-[#8A9270] font-sans font-normal">(₹{summary?.total_disputed || 0})</span>
            </div>
            <div className="text-[12px] text-[#8A9270] mt-1">Open Discrepancies</div>
          </div>
        </div>

        {/* Pending Resolution */}
        <div className="bg-[#EDF0E4] border border-[#CBD7B5] rounded-2xl p-[18px]">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
            <span className="text-[#6F7E50] text-lg">◉</span> Discrepancies Pending Resolution
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3.5">
            <div className="bg-white border border-[#E2D4B8] rounded-xl p-3.5">
              <div className="text-[22px] font-bold font-mono">{summary?.under_review || 0}</div>
              <div className="text-[11px] text-[#8A9270] mt-1 leading-snug">Auto Disputed to 3PL by MozoPost Shipping</div>
            </div>
            <div className="bg-white border border-[#E2D4B8] rounded-xl p-3.5">
              <div className="text-[22px] font-bold font-mono">{summary?.under_review || 0}</div>
              <div className="text-[11px] text-[#8A9270] mt-1 leading-snug">Disputes Pending Resolution by 3PL</div>
            </div>
          </div>
        </div>

        {/* Closed Discrepancies */}
        <div className="bg-[#EDF0E4] border border-[#CBD7B5] rounded-2xl p-[18px]">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#0F172A]">
            <span className="text-[#546B41] text-lg">✓</span> Closed Discrepancies
          </div>
          <div className="grid grid-cols-3 gap-2.5 mt-3.5">
            <div className="bg-white border border-[#E2D4B8] rounded-xl p-3.5">
              <div className="text-[22px] font-bold font-mono">{summary?.approved || 0}</div>
              <div className="text-[11px] text-[#8A9270] mt-1 leading-snug">Discrepancies Accepted by you</div>
            </div>
            <div className="bg-white border border-[#E2D4B8] rounded-xl p-3.5">
              <div className="text-[22px] font-bold font-mono">{summary?.approved || 0}</div>
              <div className="text-[11px] text-[#8A9270] mt-1 leading-snug">Disputes Accepted by Courier</div>
            </div>
            <div className="bg-white border border-[#E2D4B8] rounded-xl p-3.5">
              <div className="text-[22px] font-bold font-mono">{summary?.rejected || 0}</div>
              <div className="text-[11px] text-[#8A9270] mt-1 leading-snug">Disputed Rejected by Courier</div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-8 mt-8 border-b border-[#EADFC8] px-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 text-[14px] font-semibold transition-colors relative ${
              activeTab === t.id ? "text-[#546B41]" : "text-[#8A9270] hover:text-[#546B41]"
            }`}
          >
            {t.label}
            {activeTab === t.id && (
              <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#546B41] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* NOTE */}
      <div className="bg-[#F6EEDB] border border-[#DEC98F] rounded-lg p-3 mt-5 text-[12px] text-[#0F172A]">
        <span className="font-bold">NOTE :</span> Take action on the new discrepancy within 10 days of its creation else it will be marked as <span className="font-bold">"Auto Accepted"</span>.
      </div>

      {/* TOOLBAR */}
      <div className="flex items-center gap-3 mt-6 flex-wrap">
        <div className="text-[14px] text-[#6B7556] font-medium">{filteredDisputes.length} Discrepancies</div>
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[12px] text-[#8A9270]">Warehouse:</span>
          <select className="bg-white border border-[#E2D4B8] rounded-lg px-3 py-1.5 text-[13px] text-[#6B7556] outline-none">
            <option>All</option>
          </select>
          <span className="text-[12px] text-[#8A9270] ml-2">Excess Weight:</span>
          <select className="bg-white border border-[#E2D4B8] rounded-lg px-3 py-1.5 text-[13px] text-[#6B7556] outline-none">
            <option>All</option>
          </select>
          <span className="text-[12px] text-[#8A9270] ml-2">Ageing:</span>
          <select className="bg-white border border-[#E2D4B8] rounded-lg px-3 py-1.5 text-[13px] text-[#6B7556] outline-none">
            <option>All</option>
          </select>
          <button className="w-[34px] h-[34px] rounded-lg bg-white border border-[#E2D4B8] flex items-center justify-center text-[#8A9270] hover:bg-gray-50">
            ↓
          </button>
          <button onClick={load} className="w-[34px] h-[34px] rounded-lg bg-white border border-[#E2D4B8] flex items-center justify-center text-[#8A9270] hover:bg-gray-50">
            ↻
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="mt-3.5 border border-[#EADFC8] rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="grid grid-cols-[1.5fr_1.3fr_1.05fr_1.3fr_0.85fr_1.15fr_1.45fr] gap-3.5 px-4.5 py-3 bg-[#F6EEDB] text-[11px] font-semibold text-[#8A9270] uppercase tracking-wide">
          <div className="pl-4">Discrepancy Details</div>
          <div>Products</div>
          <div>Applied Weight</div>
          <div>Courier Weight</div>
          <div>Charged Weight</div>
          <div>Excess Weight & Charge</div>
          <div>Status</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#8A9270] text-sm">Loading...</div>
        ) : filteredDisputes.length === 0 ? (
          <div className="p-8 text-center text-[#8A9270] text-sm">No discrepancies found.</div>
        ) : (
          <div className="divide-y divide-[#F6EEDB]">
            {filteredDisputes.map((r) => {
              const daysOld = differenceInDays(new Date(), new Date(r.created_at));
              const isNew = r.status === 'open';

              let statusColor = "#6B7556";
              let statusBg = "#EDF0E4";
              let statusBd = "#CBD7B5";
              let statusLabel = "PENDING";
              if (r.status === 'open') {
                statusColor = "#B4623F"; statusBg = "#F1E2D8"; statusBd = "#DDBBA8"; statusLabel = "NEW DISCREPANCY";
              } else if (r.status === 'under_review') {
                statusLabel = "DISPUTED";
              } else if (r.status === 'rejected') {
                statusLabel = "ACCEPTED";
              }

              return (
                <div key={r.id} className="grid grid-cols-[1.5fr_1.3fr_1.05fr_1.3fr_0.85fr_1.15fr_1.45fr] gap-3.5 pt-6 pb-5 px-4.5 text-[13px] items-start hover:bg-gray-50/50">
                  <div className="pl-4">
                    <div className="text-[11px] text-[#8A9270]">Updated on:</div>
                    <div className="text-[12px] mt-0.5">{format(new Date(r.created_at), "dd MMM | hh:mm a")}</div>
                    <div className="text-[11px] text-[#8A9270] mt-2">AWB#:</div>
                    <div className="text-[12px] text-[#6F7E50] font-mono mt-0.5">{r.awb_number || "N/A"}</div>
                    <div className="text-[11px] text-[#8A9270] mt-1.5">{r.courier_name || "Standard"}</div>
                  </div>
                  <div>
                    <div className="leading-snug truncate max-w-[120px]" title="Product">Product Details</div>
                    <div className="text-[11px] text-[#8A9270] mt-1.5">Qty 1</div>
                    <div className="text-[11px] text-[#8A9270] mt-0.5">SKU: NA</div>
                    <div className="text-[11px] text-[#8A9270] mt-0.5">HSN: NA</div>
                  </div>
                  <div>
                    <div className="font-semibold">{formatWeight(r.seller_weight_gm)}</div>
                    <div className="text-[11px] text-[#8A9270]">(Slab: {getSlab(r.seller_weight_gm)})</div>
                    <div className="text-[11px] text-[#8A9270] mt-2">Dead Weight</div>
                    <div className="text-[12px]">{formatWeight(r.seller_weight_gm)}</div>
                    <div className="text-[11px] text-[#8A9270] mt-1.5">Volumetric Weight</div>
                    <div className="text-[12px]">{r.volumetric_weight_gm ? formatWeight(r.volumetric_weight_gm) : "0 Kg"}</div>
                  </div>
                  <div>
                    <div className="font-semibold">{formatWeight(r.courier_weight_gm)}</div>
                    <div className="text-[11px] text-[#8A9270]">(Slab: {getSlab(r.courier_weight_gm)})</div>
                    <div className="text-[11px] text-[#8A9270] mt-2">Dead Weight</div>
                    <div className="text-[12px]">{formatWeight(r.courier_weight_gm)}</div>
                    <div className="text-[11px] text-[#8A9270] mt-1.5">Volumetric Weight</div>
                    <div className="text-[12px]">{r.volumetric_weight_gm ? formatWeight(r.volumetric_weight_gm) : "0 Kg"}</div>
                    {r.proof_image_urls && r.proof_image_urls.length > 0 && (
                      <div className="text-[12px] text-[#546B41] mt-2 underline cursor-pointer hover:text-green-700">Shipment Images</div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{formatWeight(r.courier_weight_gm)}</div>
                    <div className="text-[11px] text-[#8A9270]">(Slab: {getSlab(r.courier_weight_gm)})</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#8A9270]">Excess Weight</div>
                    <div className="text-[13px] text-[#B4623F] font-semibold">{formatWeight(r.difference_gm)}</div>
                    <div className="text-[11px] text-[#8A9270]">(Additional Slab: {getSlab(r.difference_gm)})</div>
                    <div className="text-[11px] text-[#8A9270] mt-1.5">Excess Charges</div>
                    <div className="text-[13px] text-[#B4623F] font-semibold">₹ {r.disputed_amount}</div>
                  </div>
                  <div className="pr-4">
                    <span 
                      className="inline-block text-[11px] font-semibold rounded-md px-2.5 py-1"
                      style={{ color: statusColor, background: statusBg, borderColor: statusBd, borderWidth: 1 }}
                    >
                      {statusLabel}
                    </span>
                    {isNew ? (
                      <div className="flex flex-col gap-2 mt-3">
                        <button 
                          onClick={() => acceptCharges(r.id)}
                          className="bg-[#546B41] hover:bg-[#63794E] text-[#FFF8EC] rounded-lg py-2 text-center text-[12px] font-semibold transition-colors"
                        >
                          ACCEPT
                        </button>
                        <button 
                          onClick={() => openRaiseModal(r)}
                          className="border border-[#E2D4B8] hover:border-[#546B41] hover:text-[#546B41] rounded-lg py-2 text-center text-[12px] text-[#6B7556] transition-colors font-medium"
                        >
                          RAISE DISPUTE
                        </button>
                        <button onClick={() => openHistoryModal(r)} className="text-[12px] text-[#6F7E50] text-center hover:underline mt-1">See History ›</button>
                        <div className="text-[11px] text-[#A9842E] text-center font-medium mt-0.5">⏱ {daysOld} days</div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <button onClick={() => openHistoryModal(r)} className="text-[12px] text-[#6F7E50] hover:underline">See History ›</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* RAISE DISPUTE MODAL */}
      {raiseModalOpen && selectedDispute && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="bg-white w-[500px] shadow-2xl flex flex-col h-full border-l border-[#EADFC8]">
            <div className="px-8 py-5 border-b border-[#EADFC8] flex items-start justify-between bg-white">
              <div>
                <div className="text-[18px] font-bold text-[#0F172A]">Raise Dispute</div>
                <div className="text-[13px] text-[#8A9270] mt-1">Please share the following details to help us resolve the discrepancy</div>
              </div>
              <button onClick={() => setRaiseModalOpen(false)} className="text-[#8A9270] hover:text-black text-xl leading-none">✕</button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              <div className="text-[16px] font-bold text-[#0F172A]">Upload Shipment Image<span className="text-[#B4623F] ml-1">*</span></div>
              <div className="text-[13px] text-[#8A9270] mt-1.5 leading-relaxed">
                Adding package images for deadweight and dimensions as per the guidelines increases chances of winning a dispute
              </div>
              
              <div className="bg-white border border-[#EADFC8] rounded-xl px-4 py-3 mt-5 flex items-center justify-between text-[13px] text-[#6B7556] cursor-pointer transition-colors">
                Guidelines for taking picture of shipment <span className="text-[#8A9270]">▾</span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-6">
                {['Package length', 'Package width', 'Package height', 'Package weight'].map((label, idx) => (
                  <div key={idx}>
                    <div className="text-[12px] text-[#6B7556] mb-2">{label}</div>
                    <label className="h-[100px] border border-dashed border-[#D8CBAE] hover:border-[#546B41] hover:text-[#546B41] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#8A9270] text-[11px] cursor-pointer transition-colors bg-white">
                      <span className="text-lg">↥</span>
                      <span className="font-medium">Upload Image</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => {
                        if (e.target.files?.[0]) setImages([...images, e.target.files[0]]);
                      }} />
                    </label>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <div className="text-[12px] text-[#6B7556] mb-2">Package with label</div>
                <label className="w-[150px] h-[100px] border border-dashed border-[#D8CBAE] hover:border-[#546B41] hover:text-[#546B41] rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#8A9270] text-[11px] cursor-pointer transition-colors bg-white">
                  <span className="text-lg">↥</span>
                  <span className="font-medium">Upload Image</span>
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    if (e.target.files?.[0]) setImages([...images, e.target.files[0]]);
                  }} />
                </label>
              </div>
              
              <div className="text-[14px] font-bold text-[#0F172A] mt-8 mb-3">Remarks</div>
              <textarea 
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Enter remarks"
                className="w-full bg-[#FCF9F2] border border-[#EADFC8] rounded-xl p-4 text-[13px] text-[#0F172A] placeholder-[#B3B596] outline-none min-h-[100px] resize-none focus:border-[#CBD7B5]"
              />
              {images.length > 0 && (
                <div className="mt-2 text-[13px] text-[#546B41] font-medium">{images.length} images selected</div>
              )}
            </div>
            
            <div className="px-8 py-5 bg-white flex justify-end">
              <button 
                disabled={raising}
                onClick={handleRaiseDispute}
                className="bg-[#546B41] hover:bg-[#63794E] text-white rounded-xl px-8 py-3 text-[14px] font-bold transition-colors disabled:opacity-50 shadow-sm"
              >
                {raising ? "RAISING..." : "RAISE DISPUTE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL */}
      {historyModalOpen && selectedDispute && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <div className="bg-[#FCF9F2] w-[500px] shadow-2xl flex flex-col h-full border-l border-[#EADFC8]">
            <div className="px-8 py-5 bg-white flex items-center justify-between border-b border-[#EADFC8]">
              <div className="text-[18px] font-bold text-[#2A311D]">Weight Discrepancy Timeline</div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-[#8A9270] hover:text-black text-xl leading-none">✕</button>
            </div>
            
            <div className="px-8 py-6 flex items-center justify-between">
              <div className="text-[20px] font-bold text-[#0F172A]">History</div>
              <button onClick={() => openHistoryModal(selectedDispute)} className="w-[36px] h-[36px] rounded-full bg-white border border-[#EADFC8] flex items-center justify-center text-[#8A9270] hover:bg-gray-50 shadow-sm">
                ↻
              </button>
            </div>
            
            <div className="px-8 pt-2 pb-8 overflow-y-auto flex-1">
              {loadingHistory ? (
                <div className="text-center text-[#8A9270] text-sm py-4">Loading history...</div>
              ) : historyEvents.length === 0 ? (
                <div className="text-center text-[#8A9270] text-sm py-4">No history events found.</div>
              ) : (
                <div className="flex flex-col gap-8 relative before:absolute before:inset-y-0 before:left-[5px] before:w-[2px] before:bg-[#D4D2C3]">
                  {historyEvents.map((evt, idx) => (
                    <div key={evt.id} className="flex gap-5 relative z-10">
                      <div className="w-[12px] h-[12px] rounded-full bg-[#546B41] mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-[15px] font-bold text-[#546B41] capitalize">
                          {evt.event_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-[13px] text-[#8A9270] mb-4 mt-1">{format(new Date(evt.created_at), "dd MMM yyyy | hh:mm a")}</div>
                        <div className="bg-[#FCF9F2] border border-[#E2D4B8] rounded-2xl p-5">
                          <div className="grid grid-cols-[90px_1fr] gap-y-3 gap-x-2 text-[14px]">
                            <div className="text-[#8A9270]">Action By:</div>
                            <div className="font-semibold text-[#0F172A]">{evt.user_type === 'seller' ? 'You' : 'MozoPost'}</div>
                            <div className="text-[#8A9270]">Remarks:</div>
                            <div className="font-semibold text-[#0F172A] leading-snug">{evt.description}</div>
                            {evt.event_type === 'created' && selectedDispute.proof_image_urls && selectedDispute.proof_image_urls.length > 0 && (
                              <>
                                <div className="text-[#8A9270]">Images:</div>
                                <div className="font-medium text-[#546B41] cursor-pointer hover:underline">View Images</div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
