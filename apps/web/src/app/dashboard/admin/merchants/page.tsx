"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Merchant {
  id: string;
  business_name: string;
  gstin: string | null;
  email: string;
  status: string;
  kyc_status: string;
  first_name: string;
  last_name: string;
  merchant_level: number;
  company_address: string | null;
  wallet_balance: string;
  order_count: string;
  gmv: string;
  rto_count: string;
}

export default function SellersPage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  // Modal State
  const [modal, setModal] = useState<"seller" | "onboard" | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<Merchant | null>(null);
  const [sellerStats, setSellerStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Onboard State
  const [onboardForm, setOnboardForm] = useState({
    businessName: "",
    ownerName: "",
    email: "",
    phone: "",
    gstin: "",
    city: "",
    password: "",
  });
  const [onboardLoading, setOnboardLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/merchants");
      setMerchants(data.merchants);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function openSellerModal(seller: Merchant) {
    setSelectedSeller(seller);
    setSellerStats(null);
    setModal("seller");
    setStatsLoading(true);
    try {
      const { data } = await api.get(
        `/admin/merchants/${seller.id}/modal-stats`,
      );
      setSellerStats(data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleOnboardSubmit() {
    if (
      !onboardForm.businessName ||
      !onboardForm.email ||
      !onboardForm.password
    )
      return;
    setOnboardLoading(true);
    try {
      await api.post("/admin/merchants", onboardForm);
      setModal(null);
      setOnboardForm({
        businessName: "",
        ownerName: "",
        email: "",
        phone: "",
        gstin: "",
        city: "",
        password: "",
      });
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setOnboardLoading(false);
    }
  }

  // Derived filtered items based on search
  const filtered = merchants.filter((m) => {
    const matchesSearch =
      !search ||
      m.business_name.toLowerCase().includes(search.toLowerCase()) ||
      (m.gstin && m.gstin.toLowerCase().includes(search.toLowerCase()));

    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Active" && m.status === "active") ||
      (activeTab === "Pending" && m.status === "pending_kyc") ||
      (activeTab === "Suspended" && m.status === "suspended");

    return matchesSearch && matchesTab;
  });

  const counts = {
    all: merchants.length,
    active: merchants.filter((m) => m.status === "active").length,
    pending: merchants.filter((m) => m.status === "pending_kyc").length,
    suspended: merchants.filter((m) => m.status === "suspended").length,
  };

  const tabs = [
    { label: "All", count: counts.all },
    { label: "Active", count: counts.active },
    { label: "Pending", count: counts.pending },
    { label: "Suspended", count: counts.suspended },
  ];

  return (
    <>
      <div className="animate-fade-up">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">
                Sellers
              </h1>
            </div>
          </div>
          <button
            onClick={() => setModal("onboard")}
            className="bg-[#546B41] text-[#FFF8EC] rounded-lg px-[18px] py-[10px] text-[13px] font-semibold hover:bg-[#63794E] transition-colors shadow-sm"
          >
            + Onboard seller
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] mt-4">
            {error}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-0 mt-[18px] border-b border-[#EADFC8]">
          {tabs.map((t) => {
            const isActive = activeTab === t.label;
            return (
              <button
                key={t.label}
                onClick={() => setActiveTab(t.label)}
                className={`pb-2.5 px-[14px] flex items-center gap-2 border-b-[2px] text-[13px] font-semibold transition-colors ${
                  isActive
                    ? "border-[#546B41] text-[#2F3A22]"
                    : "border-transparent text-[#8A9270] hover:text-[#546B41]"
                }`}
              >
                {t.label}
                <span
                  className={`px-[7px] py-[2px] rounded-full text-[10px] font-mono-nb font-bold ${
                    isActive
                      ? "bg-[#EDF0E4] text-[#546B41]"
                      : "bg-[#F4F0E6] text-[#A59A7E]"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Filters & Search ── */}
        <div className="flex items-end gap-[12px] mt-[18px] relative z-10">
          <div>
            <div className="text-[11px] text-[#8A9270] mb-[6px]">Sort by</div>
            <button className="bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[9px] text-[13px] min-w-[150px] flex items-center justify-between text-[#2F3A22] shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-[#D8CBAE]">
              GMV (high→low) <span className="text-[#8A9270] ml-[10px]">▾</span>
            </button>
          </div>
          <div className="ml-auto flex items-center gap-[8px] bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[9px] text-[13px] min-w-[230px] text-[#A59A7E] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-[15px]">⌕</span>
            <input
              type="text"
              placeholder="Search seller or GST…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-[#2F3A22] placeholder:text-[#A59A7E]"
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] mt-[18px] overflow-hidden">
          <div className="grid grid-cols-[1.5fr_1fr_0.9fr_0.9fr_0.8fr_0.9fr_0.8fr_56px] gap-[10px] px-[18px] py-[13px] bg-[#FAF4E6] border-b border-[#EADFC8] text-[10.5px] text-[#8A9270] uppercase font-bold tracking-[0.5px]">
            <span>Seller</span>
            <span>Owner</span>
            <span className="text-right">GMV</span>
            <span className="text-right">Orders</span>
            <span className="text-right">RTO</span>
            <span className="text-right">Wallet</span>
            <span>Status</span>
            <span></span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[13px] font-mono-nb text-[#8A9270] animate-pulse-soft">
              Loading sellers...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[#8A9270]">
              No sellers found.
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((s) => {
                const orderCount = parseInt(s.order_count || "0");
                const rtoCount = parseInt(s.rto_count || "0");
                const gmv = parseFloat(s.gmv || "0");
                const wallet = parseFloat(s.wallet_balance || "0");
                const rtoPct =
                  orderCount > 0
                    ? ((rtoCount / orderCount) * 100).toFixed(1)
                    : "0";
                const rtoColor =
                  parseFloat(rtoPct) > 20 ? "text-[#DC2626]" : "text-[#546B41]";

                let city = "India";
                if (s.company_address) {
                  const parts = s.company_address.split(",");
                  if (parts.length > 2) {
                    city = parts[parts.length - 2].trim();
                  } else if (parts.length > 0) {
                    city = parts[0].trim();
                  }
                }
                const ownerStr =
                  s.first_name || s.last_name
                    ? `${s.first_name || ""} ${s.last_name || ""}`.trim()
                    : s.email.split("@")[0];

                return (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1.5fr_1fr_0.9fr_0.9fr_0.8fr_0.9fr_0.8fr_56px] gap-[10px] items-center px-[18px] py-[13px] border-b border-[#F0E8D6] text-[13px] hover:bg-[#FAF4E6] transition-colors"
                  >
                    <div className="flex items-center gap-[10px] min-w-0">
                      <div className="w-[30px] h-[30px] rounded-[8px] bg-[#EDF0E4] text-[#546B41] flex items-center justify-center text-[11px] font-bold font-mono-nb shrink-0">
                        {s.business_name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-[#2F3A22] truncate block">
                          {s.business_name}
                        </span>
                        <span className="text-[11px] text-[#A59A7E] font-mono-nb truncate">
                          {city}
                        </span>
                      </div>
                    </div>

                    <span className="text-[#6B7556] truncate">{ownerStr}</span>

                    <span className="text-right font-mono-nb font-semibold text-[#2F3A22]">
                      ₹{(gmv / 100000).toFixed(1)}L
                    </span>

                    <span className="text-right font-mono-nb text-[#6B7556]">
                      {orderCount.toLocaleString("en-IN")}
                    </span>

                    <span
                      className={`text-right font-mono-nb font-medium ${rtoColor}`}
                    >
                      {rtoPct}%
                    </span>

                    <span className="text-right font-mono-nb text-[#6B7556]">
                      ₹{(wallet / 1000).toFixed(1)}K
                    </span>

                    <span>
                      {s.status === "active" && (
                        <span className="px-[6px] py-[3px] rounded-[5px] border border-[#CBD7B5] bg-[#EDF0E4] text-[#546B41] text-[11px] font-semibold">
                          Active
                        </span>
                      )}
                      {s.status === "suspended" && (
                        <span className="px-[6px] py-[3px] rounded-[5px] border border-[#F3C8C8] bg-[#FEE2E2] text-[#991B1B] text-[11px] font-semibold">
                          Suspended
                        </span>
                      )}
                      {s.status === "pending_kyc" && (
                        <span className="px-[6px] py-[3px] rounded-[5px] border border-[#F3E1C8] bg-[#FFFBEB] text-[#D97706] text-[11px] font-semibold">
                          Pending
                        </span>
                      )}
                    </span>

                    <button
                      onClick={() => openSellerModal(s)}
                      className="text-[#546B41] hover:text-[#3F5230] text-[15px] flex justify-center w-full outline-none"
                    >
                      ⊙
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===================== MODAL LAYER ===================== */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C2110]/50 backdrop-blur-[2px]"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white border border-[#E2D4B8] rounded-[16px] overflow-hidden shadow-[0_24px_70px_rgba(40,45,20,0.4)] relative"
            style={{
              width:
                modal === "seller"
                  ? "560px"
                  : modal === "onboard"
                    ? "540px"
                    : "460px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── SELLER DETAIL MODAL ── */}
            {modal === "seller" && selectedSeller && (
              <div>
                <div className="bg-gradient-to-br from-[#5C7347] to-[#4A5F37] px-[24px] py-[20px] flex items-center gap-[14px] text-[#FFF8EC]">
                  <span className="w-[44px] h-[44px] rounded-[11px] bg-white/16 flex items-center justify-center text-[16px] font-semibold font-mono-nb shrink-0">
                    {selectedSeller.business_name.substring(0, 2).toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="text-[17px] font-bold">
                      {selectedSeller.business_name}
                    </div>
                    <div className="text-[12px] opacity-80 font-mono-nb">
                      MZ-{selectedSeller.id.substring(0, 4).toUpperCase()} ·{" "}
                      {selectedSeller.first_name || "Owner"}
                    </div>
                  </div>
                  {selectedSeller.status === "active" && (
                    <span className="px-[8px] py-[3px] rounded-[6px] bg-[#EDF0E4] text-[#546B41] text-[12px] font-bold">
                      Active
                    </span>
                  )}
                  {selectedSeller.status === "suspended" && (
                    <span className="px-[8px] py-[3px] rounded-[6px] bg-[#FEE2E2] text-[#991B1B] text-[12px] font-bold">
                      Suspended
                    </span>
                  )}
                  {selectedSeller.status === "pending_kyc" && (
                    <span className="px-[8px] py-[3px] rounded-[6px] bg-[#FFFBEB] text-[#D97706] text-[12px] font-bold">
                      Pending
                    </span>
                  )}
                  <button
                    onClick={() => setModal(null)}
                    className="text-[#FFF8EC] opacity-80 hover:opacity-100 ml-[6px] bg-inherit"
                  >
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
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div className="p-[24px]">
                  {statsLoading ? (
                    <div className="py-12 text-center text-[13px] font-mono-nb text-[#8A9270] animate-pulse">
                      Loading stats...
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-[12px]">
                        <div className="bg-[#FAF4E6] border border-[#EADFC8] rounded-[10px] px-[14px] py-[13px]">
                          <div className="text-[10.5px] text-[#8A9270] uppercase tracking-[0.5px]">
                            GMV (30D)
                          </div>
                          <div className="text-[18px] font-bold mt-[5px] font-mono-nb text-[#546B41]">
                            ₹{((sellerStats?.gmv_30d || 0) / 100000).toFixed(1)}
                            L
                          </div>
                        </div>
                        <div className="bg-[#FAF4E6] border border-[#EADFC8] rounded-[10px] px-[14px] py-[13px]">
                          <div className="text-[10.5px] text-[#8A9270] uppercase tracking-[0.5px]">
                            Orders
                          </div>
                          <div className="text-[18px] font-bold mt-[5px] font-mono-nb text-[#2F3A22]">
                            {parseInt(
                              sellerStats?.orders_30d || "0",
                            ).toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="bg-[#FAF4E6] border border-[#EADFC8] rounded-[10px] px-[14px] py-[13px]">
                          <div className="text-[10.5px] text-[#8A9270] uppercase tracking-[0.5px]">
                            RTO %
                          </div>
                          <div className="text-[18px] font-bold mt-[5px] font-mono-nb text-[#DC2626]">
                            {sellerStats?.orders_30d > 0
                              ? (
                                  (sellerStats.rto_30d /
                                    sellerStats.orders_30d) *
                                  100
                                ).toFixed(1)
                              : "0"}
                            %
                          </div>
                        </div>
                        <div className="bg-[#FAF4E6] border border-[#EADFC8] rounded-[10px] px-[14px] py-[13px]">
                          <div className="text-[10.5px] text-[#8A9270] uppercase tracking-[0.5px]">
                            Wallet
                          </div>
                          <div className="text-[18px] font-bold mt-[5px] font-mono-nb text-[#546B41]">
                            ₹
                            {(
                              parseFloat(selectedSeller.wallet_balance || "0") /
                              1000
                            ).toFixed(1)}
                            L
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-[22px] mt-[20px]">
                        <div>
                          <div className="text-[11px] text-[#8A9270] uppercase tracking-[0.5px] font-semibold mb-[10px]">
                            Business
                          </div>

                          <div className="flex justify-between py-[7px] border-b border-[#F0E8D6] text-[13px]">
                            <span className="text-[#8A9270]">City</span>
                            <span className="font-medium text-[#2F3A22]">
                              Surat, GJ
                            </span>
                          </div>
                          <div className="flex justify-between py-[7px] border-b border-[#F0E8D6] text-[13px]">
                            <span className="text-[#8A9270]">Joined</span>
                            <span className="font-medium text-[#2F3A22]">
                              {sellerStats?.joined_at
                                ? new Date(
                                    sellerStats.joined_at,
                                  ).toLocaleDateString("en-GB", {
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between py-[7px] border-b border-[#F0E8D6] text-[13px]">
                            <span className="text-[#8A9270]">Couriers</span>
                            <span className="font-medium text-[#2F3A22]">
                              {sellerStats?.active_couriers || 0} active
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-[#8A9270] uppercase tracking-[0.5px] font-semibold mb-[10px]">
                            Compliance
                          </div>
                          <div className="flex justify-between py-[7px] border-b border-[#F0E8D6] text-[13px]">
                            <span className="text-[#8A9270]">GSTIN</span>
                            <span className="font-medium text-[#2F3A22]">
                              {selectedSeller.gstin || "Unregistered"}
                            </span>
                          </div>
                          <div className="flex justify-between py-[7px] border-b border-[#F0E8D6] text-[13px]">
                            <span className="text-[#8A9270]">KYC</span>
                            <span
                              className={`font-medium ${sellerStats?.kyc_status === "verified" ? "text-[#546B41]" : "text-[#D97706]"}`}
                            >
                              {sellerStats?.kyc_status === "verified"
                                ? "Verified"
                                : "Pending"}
                            </span>
                          </div>
                          <div className="flex justify-between py-[7px] border-b border-[#F0E8D6] text-[13px]">
                            <span className="text-[#8A9270]">Bank A/C</span>
                            <span
                              className={`font-medium ${sellerStats?.bank_account_number ? "text-[#546B41]" : "text-[#D97706]"}`}
                            >
                              {sellerStats?.bank_account_number
                                ? "Verified"
                                : "Pending"}
                            </span>
                          </div>
                          <div className="flex justify-between py-[7px] border-b border-[#F0E8D6] text-[13px]">
                            <span className="text-[#8A9270]">Agreement</span>
                            <span className="font-medium text-[#546B41]">
                              Signed
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="px-[24px] py-[16px] border-t border-[#EADFC8] flex gap-[10px] justify-end bg-[#FAF4E6]">
                  <button className="border border-[#E2D4B8] rounded-[8px] px-[18px] py-[10px] text-[13px] text-[#6B7556] hover:border-[#D8CBAE] bg-white transition-colors">
                    ↪ Login as seller
                  </button>
                  <button className="bg-[#B4623F] text-[#FFF8EC] rounded-[8px] px-[18px] py-[10px] text-[13px] font-semibold hover:bg-[#9A5132] transition-colors">
                    Suspend seller
                  </button>
                </div>
              </div>
            )}

            {/* ── ONBOARD SELLER MODAL ── */}
            {modal === "onboard" && (
              <div>
                <div className="bg-gradient-to-br from-[#5C7347] to-[#4A5F37] px-[24px] py-[18px] flex items-center gap-[12px] text-[#FFF8EC]">
                  <span className="w-[36px] h-[36px] rounded-[9px] bg-white/16 flex items-center justify-center text-[16px]">
                    ＋
                  </span>
                  <div className="flex-1">
                    <div className="text-[16px] font-bold">
                      Onboard New Seller
                    </div>
                    <div className="text-[12px] opacity-82 mt-[2px]">
                      Create a merchant account and send the KYC invite
                    </div>
                  </div>
                  <button
                    onClick={() => setModal(null)}
                    className="text-[#FFF8EC] opacity-85 hover:opacity-100 bg-inherit"
                  >
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
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div className="p-[24px]">
                  <div className="grid grid-cols-2 gap-[14px]">
                    <div>
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">
                        Business name
                      </div>
                      <input
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]"
                        placeholder="e.g. Trendy Threads"
                        value={onboardForm.businessName}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            businessName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">
                        Owner name
                      </div>
                      <input
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]"
                        placeholder="e.g. Rahul Desai"
                        value={onboardForm.ownerName}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            ownerName: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">
                        Email
                      </div>
                      <input
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]"
                        placeholder="e.g. founder@trendy.in"
                        value={onboardForm.email}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            email: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">
                        Phone
                      </div>
                      <input
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]"
                        placeholder="e.g. +91 98250 11223"
                        value={onboardForm.phone}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            phone: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">
                        GSTIN (optional)
                      </div>
                      <input
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]"
                        placeholder="e.g. 24TREND4567K1Z9"
                        value={onboardForm.gstin}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            gstin: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">
                        City / State
                      </div>
                      <input
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]"
                        placeholder="e.g. Surat, GJ"
                        value={onboardForm.city}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            city: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="text-[12px] text-[#8A9270] mb-[6px]">
                        Password
                      </div>
                      <input
                        type="password"
                        className="w-full bg-white border border-[#E2D4B8] rounded-[8px] px-[14px] py-[10px] text-[13px] outline-none focus:border-[#546B41]"
                        placeholder="Set a password for the seller"
                        value={onboardForm.password}
                        onChange={(e) =>
                          setOnboardForm({
                            ...onboardForm,
                            password: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleOnboardSubmit}
                    disabled={
                      !onboardForm.businessName ||
                      !onboardForm.email ||
                      !onboardForm.password ||
                      onboardLoading
                    }
                    className="w-full mt-[20px] rounded-[8px] py-[12px] text-[13.5px] font-semibold text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#E8DCC2] text-[#8A9270]"
                    style={{
                      background:
                        onboardForm.businessName &&
                        onboardForm.email &&
                        onboardForm.password
                          ? "#546B41"
                          : "#E8DCC2",
                      color:
                        onboardForm.businessName &&
                        onboardForm.email &&
                        onboardForm.password
                          ? "#FFF8EC"
                          : "#8A9270",
                    }}
                  >
                    {onboardLoading
                      ? "Creating account..."
                      : onboardForm.businessName &&
                          onboardForm.email &&
                          onboardForm.password
                        ? "Create account & send invite"
                        : "Enter business name, email & password"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
