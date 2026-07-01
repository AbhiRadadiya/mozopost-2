"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { Modal } from "@/components/ui/Modal";

interface Courier {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface RateCard {
  id: string;
  courier_id: string;
  zone_from: string;
  zone_to: string;
  min_weight_kg: string;
  max_weight_kg: string;
  base_rate: string;
  additional_rate_per_kg: string;
  cod_charge_fixed: string;
  cod_charge_pct: string;
  is_active: boolean;
  seller_id: string | null;
  courier_name: string;
  courier_code: string;
}

interface MarginSetting {
  id: string;
  seller_id: string | null;
  courier_id: string | null;
  margin_type: "fixed" | "percentage";
  margin_value: string;
}

const ZONE_LABELS: Record<string, string> = {
  ALL: "All Zones",
  LOCAL: "Local",
  ZONE_A: "Zone A (Regional)",
  ZONE_B: "Zone B (Metro)",
  ZONE_C: "Zone C (ROI)",
  ZONE_D: "Zone D (NE/J&K)",
  AIR: "Air Priority",
};

const COURIER_THEMES: Record<string, { bg: string; code: string }> = {
  ekart: { bg: "#546b41", code: "EK" },
  delhivery: { bg: "#3a7ca5", code: "DL" },
  shadowfax: { bg: "#a9842e", code: "SF" },
  xpressbees: { bg: "#7a6cf0", code: "XB" },
  bluedart: { bg: "#b4623f", code: "BD" },
  dtdc: { bg: "#ca8a04", code: "DT" },
  ecomexpress: { bg: "#0284c7", code: "EC" },
  amazon_shipping: { bg: "#e28743", code: "AM" },
};

function getCourierTheme(code: string, name: string) {
  const cleanCode = code.toLowerCase();
  if (COURIER_THEMES[cleanCode]) return COURIER_THEMES[cleanCode];
  
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return { bg: "#8a9270", code: initials || "CR" };
}

export default function RateCardsPage() {
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [margins, setMargins] = useState<MarginSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formCourierId, setFormCourierId] = useState("");
  const [formZoneTo, setFormZoneTo] = useState("ALL");
  const [formBaseRate, setFormBaseRate] = useState("");
  const [formAdditionalRate, setFormAdditionalRate] = useState("");
  const [formCodType, setFormCodType] = useState<"fixed" | "percentage">("fixed");
  const [formCodValue, setFormCodValue] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [ratesRes, couriersRes, marginsRes] = await Promise.all([
        api.get("/admin/rate-cards"),
        api.get("/couriers"),
        api.get("/admin/margins"),
      ]);
      setRateCards(ratesRes.data.rateCards || []);
      setCouriers(couriersRes.data.couriers || []);
      setMargins(marginsRes.data.margins || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  // Calculate Margin and Seller Pays for a rate card
  function getMarginAndSellerPays(rate: RateCard) {
    const base = parseFloat(rate.base_rate) || 0;
    
    // Find matching margin rule
    // Priority: Seller Specific (shouldn't apply here as global page) -> Courier Specific -> Global
    const courierMargin = margins.find(
      (m) => m.courier_id === rate.courier_id && !m.seller_id
    );
    const globalMargin = margins.find((m) => !m.courier_id && !m.seller_id);
    
    const activeMargin = courierMargin || globalMargin;
    
    let marginVal = 0;
    if (activeMargin) {
      const value = parseFloat(activeMargin.margin_value) || 0;
      if (activeMargin.margin_type === "fixed") {
        marginVal = value;
      } else {
        marginVal = base * (value / 100);
      }
    } else {
      // Default fallback: 15%
      marginVal = base * 0.15;
    }
    
    marginVal = Math.round(marginVal * 100) / 100;
    const sellerPays = Math.round((base + marginVal) * 100) / 100;
    
    return {
      margin: marginVal,
      sellerPays,
    };
  }

  // Stats calculation
  const activeCount = rateCards.filter((r) => r.is_active).length;
  
  const avgMargin = rateCards.length > 0
    ? (rateCards.reduce((acc, curr) => acc + getMarginAndSellerPays(curr).margin, 0) / rateCards.length)
    : 0;

  // Handler to open Modal for creating
  function handleOpenCreate() {
    setEditingCard(null);
    setFormCourierId(couriers[0]?.id || "");
    setFormZoneTo("ALL");
    setFormBaseRate("");
    setFormAdditionalRate("");
    setFormCodType("fixed");
    setFormCodValue("");
    setModalOpen(true);
  }

  // Handler to open Modal for editing
  function handleOpenEdit(card: RateCard) {
    setEditingCard(card);
    setFormCourierId(card.courier_id);
    setFormZoneTo(card.zone_to || "ALL");
    setFormBaseRate(card.base_rate);
    setFormAdditionalRate(card.additional_rate_per_kg);
    
    const hasFixedCod = parseFloat(card.cod_charge_fixed) > 0;
    setFormCodType(hasFixedCod ? "fixed" : "percentage");
    setFormCodValue(hasFixedCod ? card.cod_charge_fixed : card.cod_charge_pct);
    setModalOpen(true);
  }

  // Form Submit Handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    const baseVal = parseFloat(formBaseRate);
    const addVal = parseFloat(formAdditionalRate);
    const codVal = parseFloat(formCodValue) || 0;

    const codFixed = formCodType === "fixed" ? codVal : 0;
    const codPct = formCodType === "percentage" ? codVal : 0;

    try {
      if (editingCard) {
        // Edit Rate Card
        await api.put(`/admin/rate-cards/${editingCard.id}`, {
          baseRate: baseVal,
          additionalRatePerKg: addVal,
          codChargeFixed: codFixed,
          codChargePct: codPct,
          zoneTo: formZoneTo,
        });
        setSuccessMsg("Rate card updated successfully.");
      } else {
        // Create Rate Card
        await api.post("/admin/rate-cards", {
          courierIds: [formCourierId],
          baseRate: baseVal,
          additionalRatePerKg: addVal,
          codChargeFixed: codFixed,
          codChargePct: codPct,
          zoneTo: formZoneTo,
        });
        setSuccessMsg("New rate card created successfully.");
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Format COD Fee label
  function formatCodFee(fixed: string, pct: string) {
    const f = parseFloat(fixed) || 0;
    const p = parseFloat(pct) || 0;
    if (p > 0) return `${p}%`;
    if (f > 0) return `₹${f}`;
    return "—";
  }

  return (
    <div className="animate-fade-up space-y-5">
      {/* Messages */}
      {error && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">
          ✓ {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">Rate Cards & Pricing</h1>
          <p className="text-sm text-[#8A9270] mt-1">
            Platform freight rates, COD fees and your margin per zone.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="bg-[#546B41] hover:bg-[#63794e] text-[#FFF8EC] text-[13px] font-semibold px-[18px] py-[10px] rounded-[8px] transition-colors cursor-pointer"
        >
          + New rate card
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="bg-white border border-[#E2D4B8] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-[#8A9270] font-medium uppercase tracking-wider">Active rate cards</div>
          <div className="text-[22px] font-bold mt-2 font-mono-nb text-[#2F3A22]">
            {loading ? "..." : activeCount}
          </div>
        </div>
        <div className="bg-white border border-[#E2D4B8] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-[#8A9270] font-medium uppercase tracking-wider">Avg margin / shipment</div>
          <div className="text-[22px] font-bold mt-2 font-mono-nb text-[#546B41]">
            {loading ? "..." : `₹${avgMargin.toFixed(1)}`}
          </div>
        </div>
        <div className="bg-white border border-[#E2D4B8] rounded-xl p-4 shadow-sm">
          <div className="text-[11px] text-[#8A9270] font-medium uppercase tracking-wider">Margin revenue (30d)</div>
          <div className="text-[22px] font-bold mt-2 font-mono-nb text-[#546B41]">
            ₹32.6L
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-[#E2D4B8] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full border-3 border-[#546B41]/20 border-t-[#546B41] animate-spin" />
            <span className="text-xs text-[#8A9270] font-medium">Loading rate cards...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF4E6] border-b border-[#EADFC8] text-[10.5px] text-[#8A9270] uppercase font-bold tracking-wider">
                  <th className="py-3 px-5">Courier</th>
                  <th className="py-3 px-4">Zone</th>
                  <th className="py-3 px-4 text-right">Base (0.5kg)</th>
                  <th className="py-3 px-4 text-right">Add'l</th>
                  <th className="py-3 px-4 text-right">COD Fee</th>
                  <th className="py-3 px-4 text-right">Seller Pays</th>
                  <th className="py-3 px-4 text-right">Margin</th>
                  <th className="py-3 px-5 text-center w-14">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E8D6]">
                {rateCards.map((card) => {
                  const theme = getCourierTheme(card.courier_code || "", card.courier_name || "");
                  const { margin, sellerPays } = getMarginAndSellerPays(card);
                  return (
                    <tr
                      key={card.id}
                      className="text-[13px] text-[#2F3A22] hover:bg-[#FAF4E6] transition-colors"
                    >
                      <td className="py-3 px-5 font-semibold">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-[26px] h-[26px] rounded-md text-white flex items-center justify-center text-[10px] font-bold font-mono-nb shrink-0"
                            style={{ backgroundColor: theme.bg }}
                          >
                            {theme.code}
                          </span>
                          <span className="truncate">{card.courier_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#6B7556]">
                        {ZONE_LABELS[card.zone_to] || card.zone_to || "All Zones"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nb">
                        ₹{parseFloat(card.base_rate || "0").toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nb text-[#6B7556]">
                        ₹{parseFloat(card.additional_rate_per_kg || "0").toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nb text-[#6B7556]">
                        {formatCodFee(card.cod_charge_fixed, card.cod_charge_pct)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nb font-semibold">
                        ₹{sellerPays.toFixed(0)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-nb font-semibold text-[#546B41]">
                        ₹{margin.toFixed(0)}
                      </td>
                      <td className="py-3 px-5 text-center">
                        <button
                          onClick={() => handleOpenEdit(card)}
                          className="text-[#546B41] hover:text-[#3f5230] text-sm cursor-pointer p-1"
                          title="Edit Rate Card"
                        >
                          ✎
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {rateCards.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-[#8A9270]">
                      No rate cards found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Container */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCard ? "Edit Rate Card" : "New Rate Card"}
        subtitle={editingCard ? `${editingCard.courier_name} · ${ZONE_LABELS[editingCard.zone_to] || editingCard.zone_to}` : undefined}
        width="460px"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="submit"
              form="rate-card-form"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#546B41] text-white text-sm font-semibold rounded-xl hover:bg-[#3F5131] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && (
                <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              )}
              {editingCard ? "Save rate card" : "Create rate card"}
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2.5 bg-white border border-[#E2D4B8] text-[#6B7556] text-sm font-semibold rounded-xl hover:bg-[#FAF4E6] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        }
      >
        <form id="rate-card-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Courier Selection (only editable when creating) */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider mb-1.5">
              Courier
            </label>
            {editingCard ? (
              <div className="bg-[#FAF4E6] border border-[#E2D4B8] rounded-lg px-3 py-2 text-sm text-[#6B7556] font-medium font-mono-nb">
                {editingCard.courier_name}
              </div>
            ) : (
              <select
                required
                value={formCourierId}
                onChange={(e) => setFormCourierId(e.target.value)}
                className="w-full bg-[#FAF4E6] border border-[#E2D4B8] rounded-lg px-3 py-2 text-sm text-[#2F3A22] outline-none focus:border-[#546B41] font-medium"
              >
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Zone Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider mb-1.5">
              Zone
            </label>
            <select
              required
              value={formZoneTo}
              onChange={(e) => setFormZoneTo(e.target.value)}
              className="w-full bg-[#FAF4E6] border border-[#E2D4B8] rounded-lg px-3 py-2 text-sm text-[#2F3A22] outline-none focus:border-[#546B41] font-medium"
            >
              {Object.entries(ZONE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Base & Additional Rate Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider mb-1.5">
                Base Rate (0.5kg)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-[#8A9270] font-mono-nb">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formBaseRate}
                  onChange={(e) => setFormBaseRate(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#FAF4E6] border border-[#E2D4B8] rounded-lg pl-6 pr-3 py-2 text-sm text-[#2F3A22] font-mono-nb outline-none focus:border-[#546B41]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider mb-1.5">
                Add'l Rate (/kg)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-[#8A9270] font-mono-nb">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formAdditionalRate}
                  onChange={(e) => setFormAdditionalRate(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#FAF4E6] border border-[#E2D4B8] rounded-lg pl-6 pr-3 py-2 text-sm text-[#2F3A22] font-mono-nb outline-none focus:border-[#546B41]"
                />
              </div>
            </div>
          </div>

          {/* COD Fee Input Grid */}
          <div className="grid grid-cols-[1.2fr_1fr] gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider mb-1.5">
                COD Fee Type
              </label>
              <select
                value={formCodType}
                onChange={(e) => setFormCodType(e.target.value as any)}
                className="w-full bg-[#FAF4E6] border border-[#E2D4B8] rounded-lg px-3 py-2 text-sm text-[#2F3A22] outline-none focus:border-[#546B41] font-medium"
              >
                <option value="fixed">Fixed Flat Rate (₹)</option>
                <option value="percentage">Percentage Rate (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#8A9270] uppercase tracking-wider mb-1.5">
                COD Fee Value
              </label>
              <div className="relative">
                {formCodType === "fixed" && (
                  <span className="absolute left-3 top-2 text-xs text-[#8A9270] font-mono-nb">₹</span>
                )}
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formCodValue}
                  onChange={(e) => setFormCodValue(e.target.value)}
                  placeholder="0"
                  className={`w-full bg-[#FAF4E6] border border-[#E2D4B8] rounded-lg ${formCodType === "fixed" ? "pl-6" : "pl-3"} pr-6 py-2 text-sm text-[#2F3A22] font-mono-nb outline-none focus:border-[#546B41]`}
                />
                {formCodType === "percentage" && (
                  <span className="absolute right-3 top-2 text-xs text-[#8A9270] font-mono-nb">%</span>
                )}
              </div>
            </div>
          </div>

          {/* Margin & Pricing Live Preview */}
          {formBaseRate && (
            <div className="mt-2.5 p-3.5 bg-[#FAF4E6] border border-[#E2D4B8] rounded-xl text-xs space-y-1.5">
              <div className="font-semibold text-[#2F3A22] border-b border-[#EADFC8] pb-1.5 mb-1.5">
                Rate Preview (Est.)
              </div>
              <div className="flex justify-between items-center text-[#6B7556]">
                <span>Base Freight:</span>
                <span className="font-mono-nb font-bold">₹{parseFloat(formBaseRate || "0").toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[#6B7556]">
                <span>COD Fee:</span>
                <span className="font-mono-nb font-bold">
                  {formCodType === "fixed" ? `₹${parseFloat(formCodValue || "0").toFixed(2)}` : `${parseFloat(formCodValue || "0").toFixed(2)}%`}
                </span>
              </div>
              {/* We can compute estimated margin and seller pays based on mock settings */}
              <div className="flex justify-between items-center text-[#546B41] font-semibold pt-1 border-t border-[#F0E8D6]">
                <span>Est. Margin (Platform):</span>
                <span className="font-mono-nb">
                  ₹{(parseFloat(formBaseRate) * 0.15).toFixed(2)} (15%)
                </span>
              </div>
              <div className="flex justify-between items-center text-[#2F3A22] font-bold">
                <span>Est. Seller Pays:</span>
                <span className="font-mono-nb">
                  ₹{(parseFloat(formBaseRate) * 1.15).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
