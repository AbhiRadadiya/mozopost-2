"use client";

import { useState, useEffect } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const TABS = [
  {
    id: "profile",
    label: "Company Profile",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    ),
  },
  {
    id: "couriers",
    label: "Courier Priority",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
  },
  {
    id: "billing",
    label: "Billing Details",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <rect x="2" y="5" width="20" height="14" rx="2"></rect>
        <line x1="2" y1="10" x2="22" y2="10"></line>
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Forms state
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone_number: "",
    business_name: "",
    business_type: "Marketplace Seller",
    gstin: "",
    pan: "",
    company_address: "",
    return_address: "",
    same_address: false,
  });
  const [billing, setBilling] = useState({
    bank_account_name: "",
    bank_account_number: "",
    bank_ifsc: "",
  });

  // Drag and Drop state
  const [couriers, setCouriers] = useState<any[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [autoAllocate, setAutoAllocate] = useState(true);

  // Notification state
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    pickup_confirmed: true,
    pickup_failed: true,
    out_for_delivery: true,
    delivered: true,
    ndr: true,
    rto: true,
    cod_collected: true,
    cod_settled: true,
    low_wallet: true,
    weight_discrepancy: true,
    courier_downtime: false,
    maintenance: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/settings");
      setProfile({
        name: data.profile.name || "",
        email: data.profile.email || "",
        phone_number: data.profile.phone_number || "",
        business_name: data.profile.business_name || "",
        business_type: data.profile.business_type || "Marketplace Seller",
        gstin: data.profile.gstin || "",
        pan: data.profile.pan || "",
        company_address: data.profile.company_address || "",
        return_address: data.profile.return_address || "",
        same_address: !!data.profile.same_address,
      });
      setBilling({
        bank_account_name: data.billing.bank_account_name || "",
        bank_account_number: data.billing.bank_account_number || "",
        bank_ifsc: data.billing.bank_ifsc || "",
      });
      setCouriers(data.couriers || []);
      setAutoAllocate(data.auto_allocate_courier ?? true);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.patch("/settings/profile", profile);
      showSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function saveBilling(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.patch("/settings/billing", billing);
      showSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function saveCouriers() {
    setError("");
    try {
      const priorities = couriers.map((c, i) => ({
        courier_id: c.id,
        priority: i + 1,
      }));
      await api.patch("/settings/couriers", {
        auto_allocate_courier: autoAllocate,
        priorities,
      });
      showSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function saveNotifications() {
    // Note: mock notification saving locally since we don't have this in DB right now
    showSaved();
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;

    const newCouriers = [...couriers];
    const draggedCourier = newCouriers[draggedIdx];
    newCouriers.splice(draggedIdx, 1);
    newCouriers.splice(index, 0, draggedCourier);

    setCouriers(newCouriers);
    setDraggedIdx(index);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-[#94A3B8]">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="animate-fade-up mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Settings</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage your account, billing, and preferences.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-56 shrink-0 space-y-1">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive
                    ? "bg-[#EEF2FF] text-[#4F46E5]"
                    : "text-[#475569] hover:bg-[#F8F9FB] hover:text-[#0F172A]"
                }`}
              >
                <span
                  className={isActive ? "text-[#4F46E5]" : "text-[#94A3B8]"}
                >
                  {t.icon}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            {saved && (
              <div className="bg-[#D1FAE5] px-6 py-3 border-b border-[#A7F3D0] flex items-center gap-2 text-sm font-bold text-[#065F46] animate-fade-in">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Settings saved successfully
              </div>
            )}

            {tab === "profile" && (
              <form onSubmit={saveProfile} className="p-8 animate-fade-in">
                <h2 className="text-lg font-bold text-[#0F172A] mb-6">
                  Company Profile
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Business Name *
                    </label>
                    <input
                      required
                      value={profile.business_name}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          business_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Business Type
                    </label>
                    <select
                      value={profile.business_type}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          business_type: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                    >
                      <option value="D2C Brand">D2C Brand</option>
                      <option value="Marketplace Seller">
                        Marketplace Seller
                      </option>
                      <option value="B2B Enterprise">B2B Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      GSTIN
                    </label>
                    <input
                      placeholder="24AAAAA0000A1Z5"
                      value={profile.gstin}
                      onChange={(e) =>
                        setProfile({ ...profile, gstin: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      PAN
                    </label>
                    <input
                      placeholder="AAAAA0000A"
                      value={profile.pan}
                      onChange={(e) =>
                        setProfile({ ...profile, pan: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Company Address
                    </label>
                    <textarea
                      rows={3}
                      value={profile.company_address}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProfile((prev) => ({
                          ...prev,
                          company_address: val,
                          return_address: prev.same_address
                            ? val
                            : prev.return_address,
                        }));
                      }}
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                      placeholder="Enter company billing address..."
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sameAddress"
                      checked={profile.same_address}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setProfile((prev) => ({
                          ...prev,
                          same_address: checked,
                          return_address: checked
                            ? prev.company_address
                            : prev.return_address,
                        }));
                      }}
                      className="rounded border-[#E5E8EF] text-[#4F46E5] focus:ring-[#4F46E5]"
                    />
                    <label
                      htmlFor="sameAddress"
                      className="text-xs font-semibold text-[#475569] cursor-pointer"
                    >
                      Return address is same as company address
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Return Address
                    </label>
                    <textarea
                      rows={3}
                      disabled={profile.same_address}
                      value={profile.return_address}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          return_address: e.target.value,
                        })
                      }
                      className={`w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 ${profile.same_address ? "bg-[#F8F9FB] text-[#94A3B8] cursor-not-allowed" : ""}`}
                      placeholder="Enter warehouse return/pickup address..."
                    />
                  </div>
                </div>

                <div className="h-px bg-[#E5E8EF] my-6" />
                <h3 className="text-sm font-bold text-[#0F172A] mb-4">
                  Contact Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Contact Name *
                    </label>
                    <input
                      required
                      value={profile.name}
                      onChange={(e) =>
                        setProfile({ ...profile, name: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                    />
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                        Email Address
                      </label>
                      <input
                        type="email"
                        disabled
                        value={profile.email}
                        className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-[#F8F9FB] text-[#94A3B8] outline-none cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                        Phone Number *
                      </label>
                      <input
                        required
                        value={profile.phone_number}
                        onChange={(e) =>
                          setProfile({
                            ...profile,
                            phone_number: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {tab === "couriers" && (
              <div className="p-0 animate-fade-in">
                <div className="p-8 border-b border-[#E5E8EF]">
                  <h2 className="text-lg font-bold text-[#0F172A] mb-1">
                    Courier Priority
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    Drag and drop couriers to set your preferred priority order.
                  </p>
                </div>

                <div className="divide-y divide-[#F1F3F7]">
                  {couriers.map((c, i) => (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between p-5 transition-colors cursor-move ${draggedIdx === i ? "bg-[#EEF2FF] opacity-50" : "hover:bg-[#F8F9FB] bg-white"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-[#94A3B8] cursor-move">
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                          </svg>
                        </div>
                        <div className="w-6 h-6 rounded-md bg-[#F4F6F9] text-[#64748B] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="font-bold text-sm text-[#0F172A]">
                          {c.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${c.is_enabled ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F1F5F9] text-[#475569]"}`}
                        >
                          {c.is_enabled ? "Active" : "Disabled"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {couriers.length === 0 && (
                    <div className="p-8 text-center text-sm text-[#94A3B8]">
                      No couriers available.
                    </div>
                  )}
                </div>

                <div className="p-8 bg-[#F8F9FB] border-t border-[#E5E8EF]">
                  <div className="max-w-xs">
                    <label className="block text-xs font-semibold text-[#475569] mb-2 uppercase tracking-wide">
                      Auto-allocate Courier
                    </label>
                    <select
                      value={autoAllocate ? "true" : "false"}
                      onChange={(e) =>
                        setAutoAllocate(e.target.value === "true")
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 mb-4"
                    >
                      <option value="true">
                        Optimize via System Auto-allocation
                      </option>
                      <option value="false">
                        Follow Strict Priority Order
                      </option>
                    </select>
                    <button
                      onClick={saveCouriers}
                      className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm"
                    >
                      Save Priority
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "billing" && (
              <form onSubmit={saveBilling} className="p-8 animate-fade-in">
                <h2 className="text-lg font-bold text-[#0F172A] mb-6">
                  Billing Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Bank Name
                    </label>
                    <input
                      placeholder="HDFC Bank"
                      value={billing.bank_account_name}
                      onChange={(e) =>
                        setBilling({
                          ...billing,
                          bank_account_name: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Account Number
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••1234"
                      value={billing.bank_account_number}
                      onChange={(e) =>
                        setBilling({
                          ...billing,
                          bank_account_number: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      IFSC Code
                    </label>
                    <input
                      placeholder="HDFC0001234"
                      value={billing.bank_ifsc}
                      onChange={(e) =>
                        setBilling({ ...billing, bank_ifsc: e.target.value })
                      }
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="h-px bg-[#E5E8EF] my-6" />

                <div className="mb-6 max-w-md">
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                    GST Invoice Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-[#F8F9FB] text-[#94A3B8] outline-none cursor-not-allowed"
                  />
                  <p className="text-xs text-[#94A3B8] mt-2">
                    Monthly invoices will be sent to this email address
                    automatically.
                  </p>
                </div>

                <div className="pt-4 flex justify-start">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm"
                  >
                    Save Billing Details
                  </button>
                </div>
              </form>
            )}

            {tab === "notifications" && (
              <div className="p-0 animate-fade-in">
                <div className="p-8 border-b border-[#E5E8EF]">
                  <h2 className="text-lg font-bold text-[#0F172A] mb-1">
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-[#64748B]">
                    Choose what alerts you want to receive and how.
                  </p>
                </div>

                <div className="p-8 bg-[#F8F9FB] border-b border-[#E5E8EF] grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      Primary Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-[#F8F9FB] text-[#94A3B8] outline-none cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                      WhatsApp / SMS Number
                    </label>
                    <input
                      disabled
                      value={profile.phone_number}
                      className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-[#F8F9FB] text-[#94A3B8] outline-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  {[
                    ["Pickup confirmed", "pickup_confirmed"],
                    ["Pickup failed", "pickup_failed"],
                    ["Out for delivery", "out_for_delivery"],
                    ["Delivered", "delivered"],
                    ["NDR / Failed delivery", "ndr"],
                    ["RTO initiated", "rto"],
                    ["COD collected", "cod_collected"],
                    ["COD remittance settled", "cod_settled"],
                    ["Low wallet balance", "low_wallet"],
                    ["Weight discrepancy auto-flag", "weight_discrepancy"],
                    ["Courier API downtime", "courier_downtime"],
                    ["System maintenance", "maintenance"],
                  ].map(([label, key]) => {
                    const k = key as string;
                    const isOn = notifications[k];
                    return (
                      <div
                        key={k}
                        className="flex items-center justify-between py-3 border-b border-[#F1F3F7] last:border-0 md:border-0 md:border-b"
                      >
                        <div className="font-medium text-sm text-[#0F172A]">
                          {label}
                        </div>
                        <button
                          onClick={() =>
                            setNotifications({ ...notifications, [k]: !isOn })
                          }
                          className={`w-11 h-6 rounded-full relative transition-colors ${isOn ? "bg-[#4F46E5]" : "bg-[#CBD5E1]"}`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all transform ${isOn ? "translate-x-5" : ""}`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="p-8 pt-0 flex justify-start mt-4">
                  <button
                    onClick={saveNotifications}
                    className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
