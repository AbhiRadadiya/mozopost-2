"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

interface Margin {
  id: string;
  courier_name: string | null;
  business_name: string | null;
  margin_type: string;
  margin_value: string;
}
interface Merchant {
  id: string;
  business_name: string;
  email: string;
  kyc_status: string;
  wallet_balance: string;
}

const KYC_STYLE: Record<string, string> = {
  verified: "bg-[#D1FAE5] text-[#065F46]",
  pending_kyc: "bg-[#FEF9C3] text-[#854D0E]",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
};

export default function MarginsPage() {
  const [tab, setTab] = useState<"global" | "seller">("global");
  const [margins, setMargins] = useState<Margin[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [marginType, setMarginType] = useState<"fixed" | "percentage">("fixed");
  const [marginValue, setMarginValue] = useState("5");
  const [submitting, setSubmitting] = useState(false);
  const [sellerForm, setSellerForm] = useState({
    sellerId: "",
    courierId: "",
    marginType: "fixed",
    marginValue: "5",
  });
  const [sellerSubmitting, setSellerSubmitting] = useState(false);
  const [couriers, setCouriers] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const [marginsRes, merchantsRes, couriersRes] = await Promise.all([
        api.get("/admin/margins"),
        api.get("/admin/merchants"),
        api.get("/couriers"),
      ]);
      setMargins(marginsRes.data.margins);
      setMerchants(merchantsRes.data.merchants);
      setCouriers(couriersRes.data.couriers);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSetGlobal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api.post("/admin/margins", {
        marginType,
        marginValue: Number(marginValue),
      });
      setMessage("Global margin rule applied successfully!");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetSeller(e: React.FormEvent) {
    e.preventDefault();
    if (!sellerForm.sellerId) {
      setError("Please select a seller");
      return;
    }
    setSellerSubmitting(true);
    setError("");
    setMessage("");
    try {
      await api.post("/admin/margins", {
        sellerId: sellerForm.sellerId,
        courierId: sellerForm.courierId || undefined,
        marginType: sellerForm.marginType,
        marginValue: Number(sellerForm.marginValue),
      });
      setMessage("Seller margin rule applied!");
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSellerSubmitting(false);
    }
  }

  const globalMargins = margins.filter(
    (m) => !m.business_name && !m.courier_name,
  );
  const sellerMargins = margins.filter((m) => !!m.business_name);

  const inp =
    "w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10";

  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Margin Management</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Configure global & seller-wise shipping cost margins.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#E5E8EF]">
        <button
          onClick={() => setTab("global")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === "global" ? "border-[#4F46E5] text-[#4F46E5]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
        >
          🌍 Global Margins
        </button>
        <button
          onClick={() => setTab("seller")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === "seller" ? "border-[#4F46E5] text-[#4F46E5]" : "border-transparent text-[#64748B] hover:text-[#0F172A]"}`}
        >
          🏪 Seller-wise Margins
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}
      {message && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">
          ✓ {message}
        </div>
      )}

      {/* === GLOBAL TAB === */}
      {tab === "global" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Set Global Margin */}
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-gradient-to-r from-[#EEF2FF] to-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Set Global Margin Rule
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Applies to all couriers unless overridden per seller.
              </p>
            </div>
            <form onSubmit={handleSetGlobal} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Margin Type
                </label>
                <div className="flex rounded-xl border border-[#E5E8EF] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMarginType("fixed")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${marginType === "fixed" ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-white text-[#94A3B8] hover:bg-[#F8F9FB]"}`}
                  >
                    Fixed (₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarginType("percentage")}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#E5E8EF] ${marginType === "percentage" ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-white text-[#94A3B8] hover:bg-[#F8F9FB]"}`}
                  >
                    Percentage (%)
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Value ({marginType === "fixed" ? "₹" : "%"})
                </label>
                <input
                  type="number"
                  required
                  value={marginValue}
                  onChange={(e) => setMarginValue(e.target.value)}
                  className={inp}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
              >
                {submitting ? "Applying..." : "Apply Global Margin Rule"}
              </button>
            </form>
          </div>

          {/* Active Global Rules */}
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Active Global Margin Rules
              </h2>
            </div>
            {loading ? (
              <div className="py-12 text-center text-sm text-[#94A3B8] animate-pulse">
                Loading...
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto divide-y divide-[#F1F5F9]">
                {globalMargins.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-6 py-3.5"
                  >
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#854D0E]">
                        GLOBAL
                      </span>
                      <div className="text-xs text-[#94A3B8] mt-0.5">
                        {m.margin_type}
                      </div>
                    </div>
                    <div className="text-base font-bold font-mono text-[#0F172A]">
                      {m.margin_type === "fixed"
                        ? `₹${m.margin_value}`
                        : `${m.margin_value}%`}
                    </div>
                  </div>
                ))}
                {globalMargins.length === 0 && (
                  <div className="py-12 text-center text-sm text-[#94A3B8]">
                    No global rules configured.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === SELLER TAB === */}
      {tab === "seller" && (
        <div className="space-y-6">
          {/* Set Seller Margin Form */}
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-gradient-to-r from-[#F0FDF4] to-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Set Seller-wise Margin Rule
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Override global margins for a specific seller or seller+courier
                combination.
              </p>
            </div>
            <form onSubmit={handleSetSeller} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                    Select Seller *
                  </label>
                  <select
                    required
                    value={sellerForm.sellerId}
                    onChange={(e) =>
                      setSellerForm((p) => ({ ...p, sellerId: e.target.value }))
                    }
                    className={inp}
                  >
                    <option value="">— Choose seller —</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.business_name} ({m.kyc_status})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                    Courier (Optional)
                  </label>
                  <select
                    value={sellerForm.courierId}
                    onChange={(e) =>
                      setSellerForm((p) => ({
                        ...p,
                        courierId: e.target.value,
                      }))
                    }
                    className={inp}
                  >
                    <option value="">All Couriers</option>
                    {couriers.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                    Margin Type
                  </label>
                  <div className="flex rounded-xl border border-[#E5E8EF] overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setSellerForm((p) => ({ ...p, marginType: "fixed" }))
                      }
                      className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${sellerForm.marginType === "fixed" ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-white text-[#94A3B8]"}`}
                    >
                      Fixed (₹)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSellerForm((p) => ({
                          ...p,
                          marginType: "percentage",
                        }))
                      }
                      className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#E5E8EF] ${sellerForm.marginType === "percentage" ? "bg-[#EEF2FF] text-[#4F46E5]" : "bg-white text-[#94A3B8]"}`}
                    >
                      Percentage (%)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                    Value ({sellerForm.marginType === "fixed" ? "₹" : "%"})
                  </label>
                  <input
                    type="number"
                    required
                    value={sellerForm.marginValue}
                    onChange={(e) =>
                      setSellerForm((p) => ({
                        ...p,
                        marginValue: e.target.value,
                      }))
                    }
                    className={inp}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={sellerSubmitting}
                className="w-full py-2.5 bg-[#16A34A] text-white text-sm font-semibold rounded-xl hover:bg-[#15803D] transition-colors disabled:opacity-50"
              >
                {sellerSubmitting ? "Applying..." : "Apply Seller Margin Rule"}
              </button>
            </form>
          </div>

          {/* Seller Margins Table with KYC status */}
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A]">
                Seller-wise Margin Rules
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                KYC status is shown inline for quick verification.
              </p>
            </div>
            {loading ? (
              <div className="py-12 text-center text-sm text-[#94A3B8] animate-pulse">
                Loading...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                        Seller
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                        KYC Status
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                        Courier
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {sellerMargins.map((m) => {
                      const merchant = merchants.find(
                        (mer) => mer.business_name === m.business_name,
                      );
                      const kycStatus = merchant?.kyc_status || "pending_kyc";
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-[#F8F9FB] transition-colors"
                        >
                          <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A]">
                            {m.business_name}
                          </td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${KYC_STYLE[kycStatus] || "bg-[#F1F5F9] text-[#475569]"}`}
                            >
                              {kycStatus.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-[#64748B]">
                            {m.courier_name || "All Couriers"}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] capitalize">
                              {m.margin_type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#0F172A]">
                            {m.margin_type === "fixed"
                              ? `₹${m.margin_value}`
                              : `${m.margin_value}%`}
                          </td>
                        </tr>
                      );
                    })}
                    {sellerMargins.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-5 py-12 text-center text-sm text-[#94A3B8]"
                        >
                          No seller-wise margin rules configured yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
