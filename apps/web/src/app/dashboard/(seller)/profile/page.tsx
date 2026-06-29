"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, apiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const PT = [
  { label: "Personal Details", icon: "⛢" },
  { label: "Warehouse", icon: "⌂" },
  { label: "Address", icon: "⌖" },
  { label: "GST", icon: "▤" },
  { label: "Bank Accounts", icon: "▢" },
  { label: "TPL Priorities", icon: "⛟" },
  { label: "Brand & Tracking Link", icon: "⚯" },
  { label: "API Setup", icon: "⚿" },
];

const KNOWN_TABS = [
  "Personal Details",
  "Warehouse",
  "Address",
  "GST",
  "Bank Accounts",
  "TPL Priorities",
  "Brand & Tracking Link",
  "API Setup",
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, fetchMe } = useAuthStore();
  const [profileTab, setProfileTab] = useState("Personal Details");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Personal details form state
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");

  // Bank Accounts form state
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

  // TPL Priorities state
  const [tplList, setTplList] = useState([
    { id: 1, name: "EKART" },
    { id: 2, name: "SHADOWFAX" },
    { id: 3, name: "XPRESSBEES" },
    { id: 4, name: "DELHIVERY" },
  ]);

  const [returnTplList, setReturnTplList] = useState([
    { id: 101, name: "DELHIVERY RETURN" },
    { id: 102, name: "EKART RETURN" },
  ]);

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [draggedReturnIndex, setDraggedReturnIndex] = useState<number | null>(null);

  // Warehouse Addresses state
  const [addresses, setAddresses] = useState([
    {
      id: "a0",
      name: "pira surat-500",
      isDefault: true,
      line: "3rd, near pira homes, canal road, surat, gujarat - 395006",
      contact: "classiq",
      phone: "7600881804",
      sundayEnabled: false,
    },
    {
      id: "a1",
      name: "DL500",
      isDefault: false,
      line: "Wz 14/01, Ground Floor, Budella Village, Near Baba Ambedkar College, Vikas Puri, west delhi - 110018",
      contact: "classiq",
      phone: "7600881804",
      sundayEnabled: false,
    },
  ]);

  // Brand Settings state
  const [brandForm, setBrandForm] = useState({
    customUrl: "",
    brandName: "",
    accentColor: "#546B41",
  });

  // API Token state
  const [apiToken, setApiToken] = useState<string | null>(null);

  useEffect(() => {
    fetchMe();
    loadSettings();
  }, [fetchMe]);

  async function loadSettings() {
    setFetching(true);
    try {
      const res = await api.get<any>("/settings");
      const data = res.data;
      if (data?.profile) {
        setCompanyName(data.profile.business_name || "");
        setEmail(data.profile.email || "");
        setPhone(data.profile.phone_number || "");
        setGstin(data.profile.gstin || "");
        setPan(data.profile.pan || "");
      }
      if (data?.billing) {
        setBankAccountName(data.billing.bank_account_name || "");
        setBankAccountNumber(data.billing.bank_account_number || "");
        setBankIfsc(data.billing.bank_ifsc || "");
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setFetching(false);
    }
  }

  async function handleSaveProfile() {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      await api.patch("/settings/profile", {
        business_name: companyName,
        phone_number: phone,
        gstin,
        pan,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBilling() {
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      await api.patch("/settings/billing", {
        bank_account_name: bankAccountName,
        bank_account_number: bankAccountNumber,
        bank_ifsc: bankIfsc,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleSunday(id: string) {
    setAddresses((prev) =>
      prev.map((a) => (a.id === id ? { ...a, sundayEnabled: !a.sundayEnabled } : a))
    );
  }

  function removeAddress(id: string) {
    if (confirm("Are you sure you want to delete this address?")) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  }

  // TPL Swapping & Reordering Functions
  function moveTplUp(index: number) {
    if (index === 0) return;
    setTplList((prev) => {
      const newList = [...prev];
      const temp = newList[index - 1];
      newList[index - 1] = newList[index];
      newList[index] = temp;
      return newList;
    });
  }

  function moveTplDown(index: number) {
    if (index === tplList.length - 1) return;
    setTplList((prev) => {
      const newList = [...prev];
      const temp = newList[index + 1];
      newList[index + 1] = newList[index];
      newList[index] = temp;
      return newList;
    });
  }

  function handleDragStart(index: number) {
    setDraggedItemIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    setTplList((prev) => {
      const newList = [...prev];
      const draggedItem = newList[draggedItemIndex];
      newList.splice(draggedItemIndex, 1);
      newList.splice(index, 0, draggedItem);
      return newList;
    });
    setDraggedItemIndex(index);
  }

  function handleDragEnd() {
    setDraggedItemIndex(null);
  }

  // Return TPL Drag & Drop Functions
  function handleReturnDragStart(index: number) {
    setDraggedReturnIndex(index);
  }

  function handleReturnDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedReturnIndex === null || draggedReturnIndex === index) return;
    setReturnTplList((prev) => {
      const newList = [...prev];
      const draggedItem = newList[draggedReturnIndex];
      newList.splice(draggedReturnIndex, 1);
      newList.splice(index, 0, draggedItem);
      return newList;
    });
    setDraggedReturnIndex(index);
  }

  function handleReturnDragEnd() {
    setDraggedReturnIndex(null);
  }

  // Return TPL Functions
  function moveReturnTplUp(index: number) {
    if (index === 0) return;
    setReturnTplList((prev) => {
      const newList = [...prev];
      const temp = newList[index - 1];
      newList[index - 1] = newList[index];
      newList[index] = temp;
      return newList;
    });
  }

  function moveReturnTplDown(index: number) {
    if (index === returnTplList.length - 1) return;
    setReturnTplList((prev) => {
      const newList = [...prev];
      const temp = newList[index + 1];
      newList[index + 1] = newList[index];
      newList[index] = temp;
      return newList;
    });
  }

  function removeTpl(id: number) {
    setTplList((prev) => prev.filter((t) => t.id !== id));
  }

  function removeReturnTpl(id: number) {
    setReturnTplList((prev) => prev.filter((t) => t.id !== id));
  }

  function addTpl() {
    const name = prompt("Enter TPL Courier Name (e.g. BLUEDART, DTDC, BLUEX):");
    if (name && name.trim()) {
      setTplList((prev) => [...prev, { id: Date.now(), name: name.trim().toUpperCase() }]);
    }
  }

  function addReturnTpl() {
    const name = prompt("Enter Return TPL Courier Name (e.g. SHADOWFAX RETURN):");
    if (name && name.trim()) {
      setReturnTplList((prev) => [...prev, { id: Date.now(), name: name.trim().toUpperCase() }]);
    }
  }

  function generateApiToken() {
    const token = "mp_live_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    setApiToken(token);
  }

  const isPersonalTab = profileTab === "Personal Details";
  const isWarehouseTab = profileTab === "Warehouse" || profileTab === "Address";
  const isGstTab = profileTab === "GST";
  const isBankTab = profileTab === "Bank Accounts";
  const isTplTab = profileTab === "TPL Priorities";
  const isBrandTab = profileTab === "Brand & Tracking Link";
  const isApiTab = profileTab === "API Setup";
  const isOtherProfileTab = !KNOWN_TABS.includes(profileTab);

  return (
    <div>
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[#8A9270] hover:text-[#2F3A22] text-[18px] cursor-pointer"
          >
            ←
          </button>
          <div className="text-[24px] font-bold tracking-[-0.4px] text-[#2F3A22]">
            Profile
          </div>
        </div>
        <div className="flex items-center gap-[12px]">
          {saved && (
            <span className="text-[12px] color-[#546B41] font-semibold">
              ✓ Saved!
            </span>
          )}
          <button
            onClick={isBankTab ? handleSaveBilling : handleSaveProfile}
            disabled={loading}
            className="bg-[#546B41] hover:bg-[#455835] text-[#FFF8EC] rounded-[8px] px-[18px] py-[9px] text-[13px] font-semibold cursor-pointer disabled:opacity-60 flex items-center gap-[6px]"
          >
            <span>⛁</span>
            <span>{loading ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-[16px] bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] p-[12px_16px] text-[#991B1B] text-[13px]">
          ⚠️ {error}
        </div>
      )}

      {/* ── TABS BAR ── */}
      <div className="flex gap-[6px] mt-[22px] border-b border-[#EADFC8] flex-wrap">
        {PT.map((p) => {
          const isActive = p.label === profileTab;
          return (
            <button
              key={p.label}
              onClick={() => setProfileTab(p.label)}
              className={`px-[14px] py-[11px] text-[13px] cursor-pointer flex items-center gap-[7px] border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-[#546B41] text-[#546B41] font-medium"
                  : "border-transparent text-[#8A9270] font-normal hover:text-[#2F3A22]"
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── PERSONAL DETAILS TAB ── */}
      {isPersonalTab && (
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-[28px] mt-[22px] max-w-[1000px]">
          <div className="text-[18px] font-semibold text-[#2F3A22]">Personal Information</div>
          <div className="text-[13px] text-[#8A9270] mt-[4px]">Manage your personal details</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[24px]">
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-[#F6EEDB] border border-[#EADFC8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#8A9270] outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] font-mono outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── WAREHOUSE / ADDRESS TAB ── */}
      {isWarehouseTab && (
        <div className="bg-white border border-[#E2D4B8] border-t-[3px] border-t-[#546B41] rounded-[14px] p-[24px] mt-[22px]">
          <div className="flex items-center justify-between">
            <div className="text-[16px] font-semibold text-[#2F3A22]">
              ⌂ Addresses <span className="text-[#8A9270] font-normal text-[13px]">({addresses.length}/20)</span>
            </div>
            <button
              onClick={() => alert("Add Address Modal")}
              className="bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-[8px] px-[16px] py-[9px] text-[13px] font-medium hover:bg-[#E0E7CE] cursor-pointer"
            >
              + Add New Address
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mt-[18px]">
            {addresses.map((a) => (
              <div key={a.id} className="bg-[#FFF8EC] border border-[#E2D4B8] rounded-[12px] p-[18px] relative">
                {a.isDefault && (
                  <span className="absolute top-[16px] right-[16px] text-[10px] text-[#546B41] bg-[#EDF0E4] border border-[#CBD7B5] rounded-[5px] px-[9px] py-[3px] font-semibold">
                    ✓ Default
                  </span>
                )}
                <div className="text-[15px] font-semibold text-[#2F3A22]">{a.name}</div>
                <div className="text-[12px] text-[#6B7556] mt-[12px] leading-[1.6]">⌖ {a.line}</div>
                <div className="text-[12px] text-[#8A9270] mt-[10px]">⛢ {a.contact}</div>
                <div className="text-[12px] text-[#8A9270] font-mono mt-[5px]">✆ {a.phone}</div>
                <button
                  onClick={() => toggleSunday(a.id)}
                  className="flex items-center gap-[9px] mt-[14px] text-[12px] text-[#6B7556] cursor-pointer select-none"
                >
                  <span className={`w-[16px] h-[16px] rounded-[4px] border border-[#CBD7B5] bg-white flex items-center justify-center text-[10px] text-[#546B41] shrink-0`}>
                    {a.sundayEnabled ? "✓" : ""}
                  </span>
                  <span>Enable Sunday pickup alignment</span>
                </button>
                <div className="border-t border-[#EADFC8] mt-[14px] pt-[12px] flex justify-end gap-[18px]">
                  <button onClick={() => removeAddress(a.id)} className="text-[#B4623F] text-[14px] cursor-pointer">
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GST TAB ── */}
      {isGstTab && (
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-[28px] mt-[22px] max-w-[1000px]">
          <div className="text-[18px] font-semibold text-[#2F3A22]">GST &amp; Tax Identification</div>
          <div className="text-[13px] text-[#8A9270] mt-[4px]">Configure GSTIN and PAN details for billing compliance</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[24px]">
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">GSTIN Number</label>
              <input
                type="text"
                placeholder="e.g. 24AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">PAN Number</label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] font-mono outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="mt-[24px] inline-block bg-[#546B41] hover:bg-[#455835] text-[#FFF8EC] rounded-[8px] px-[22px] py-[11px] text-[13px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save GST & Tax Details"}
          </button>
        </div>
      )}

      {/* ── BANK ACCOUNTS TAB ── */}
      {isBankTab && (
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-[28px] mt-[22px] max-w-[1000px]">
          <div className="text-[18px] font-semibold text-[#2F3A22]">Bank Account Details</div>
          <div className="text-[13px] text-[#8A9270] mt-[4px]">Configure remittance bank details for COD payouts</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[24px]">
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Account Holder Name</label>
              <input
                type="text"
                placeholder="Name on bank account"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Account Number</label>
              <input
                type="text"
                placeholder="Bank account number"
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] font-mono outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">IFSC Code</label>
              <input
                type="text"
                placeholder="e.g. SBIN0001234"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] font-mono uppercase outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleSaveBilling}
            disabled={loading}
            className="mt-[24px] inline-block bg-[#546B41] hover:bg-[#455835] text-[#FFF8EC] rounded-[8px] px-[22px] py-[11px] text-[13px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Bank Account Details"}
          </button>
        </div>
      )}

      {/* ── TPL PRIORITIES TAB (MANAGED SWAP/WRAP SYSTEM) ── */}
      {isTplTab && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[22px]">
            {/* Forward TPL Priorities */}
            <div>
              <div className="text-[16px] font-semibold text-[#2F3A22]">TPL Priorities</div>
              <div className="text-[12px] text-[#8A9270] mt-[4px]">Order is tried with the first TPL; if it fails, the next is used</div>
              <button
                onClick={() => alert("View Rates Modal")}
                className="inline-block mt-[14px] bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-[8px] px-[16px] py-[9px] text-[13px] font-medium hover:bg-[#E0E7CE] cursor-pointer"
              >
                View Shipping Rates
              </button>
              <div className="border border-[#EADFC8] rounded-[12px] p-[14px] mt-[14px] flex flex-col gap-[10px] bg-white">
                {tplList.map((t, index) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-[12px] bg-[#FFF8EC] border rounded-[9px] p-[12px_14px] transition-all cursor-grab active:cursor-grabbing ${
                      draggedItemIndex === index ? "border-[#546B41] shadow-md opacity-75" : "border-[#E2D4B8]"
                    }`}
                  >
                    <span className="w-[26px] h-[26px] rounded-[7px] bg-[#546B41] text-[#FFF8EC] flex items-center justify-center text-[13px] font-bold font-mono shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex flex-col text-[#8A9270] text-[10px] leading-none select-none">
                      <button
                        onClick={() => moveTplUp(index)}
                        disabled={index === 0}
                        className="hover:text-[#546B41] disabled:opacity-30 cursor-pointer"
                        title="Move Up in priority"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveTplDown(index)}
                        disabled={index === tplList.length - 1}
                        className="hover:text-[#546B41] disabled:opacity-30 cursor-pointer"
                        title="Move Down in priority"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-[#8A9270] text-[15px] select-none">≡</span>
                    <span className="text-[13px] font-semibold tracking-[0.3px] text-[#2F3A22]">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Return TPL Priorities */}
            <div>
              <div className="text-[16px] font-semibold text-[#2F3A22]">Return TPL Priorities</div>
              <div className="text-[12px] text-[#8A9270] mt-[4px]">Return pickup is tried with the first TPL; if it fails, the next is used</div>
              <div className="border border-[#EADFC8] rounded-[12px] p-[14px] mt-[14px] flex flex-col gap-[10px] bg-white">
                {returnTplList.map((t, index) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => handleReturnDragStart(index)}
                    onDragOver={(e) => handleReturnDragOver(e, index)}
                    onDragEnd={handleReturnDragEnd}
                    className={`flex items-center gap-[12px] bg-[#FFF8EC] border rounded-[9px] p-[12px_14px] transition-all cursor-grab active:cursor-grabbing ${
                      draggedReturnIndex === index ? "border-[#546B41] shadow-md opacity-75" : "border-[#E2D4B8]"
                    }`}
                  >
                    <span className="w-[26px] h-[26px] rounded-[7px] bg-[#546B41] text-[#FFF8EC] flex items-center justify-center text-[13px] font-bold font-mono shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex flex-col text-[#8A9270] text-[10px] leading-none select-none">
                      <button
                        onClick={() => moveReturnTplUp(index)}
                        disabled={index === 0}
                        className="hover:text-[#546B41] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveReturnTplDown(index)}
                        disabled={index === returnTplList.length - 1}
                        className="hover:text-[#546B41] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="text-[#8A9270] text-[15px] select-none">≡</span>
                    <span className="text-[13px] font-semibold tracking-[0.3px] text-[#2F3A22]">{t.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-[30px]">
            <button
              onClick={() => setProfileTab("Bank Accounts")}
              className="bg-white border border-[#E2D4B8] text-[#2F3A22] rounded-[8px] px-[18px] py-[10px] text-[13px] cursor-pointer"
            >
              ‹ Previous Section
            </button>
            <button
              onClick={() => setProfileTab("Brand & Tracking Link")}
              className="bg-[#546B41] hover:bg-[#455835] text-[#FFF8EC] rounded-[8px] px-[18px] py-[10px] text-[13px] font-semibold cursor-pointer"
            >
              Next Section ›
            </button>
          </div>
        </div>
      )}

      {/* ── BRAND & TRACKING LINK TAB ── */}
      {isBrandTab && (
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-[28px] mt-[22px] max-w-[1000px]">
          <div className="text-[18px] font-semibold text-[#2F3A22]">Brand &amp; Tracking Link</div>
          <div className="text-[13px] text-[#8A9270] mt-[4px]">Customize your white-label tracking page.</div>
          <div className="bg-[#EDF0E4] border border-[#CBD7B5] rounded-[10px] p-[13px_16px] mt-[18px] text-[12px] text-[#6B7556] font-mono">
            ⚯ Tracking Link — configure custom URL name to generate link
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] mt-[20px]">
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Custom URL Name *</label>
              <input
                type="text"
                placeholder="e.g. mybrand"
                value={brandForm.customUrl}
                onChange={(e) => setBrandForm((f) => ({ ...f, customUrl: e.target.value }))}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] outline-none"
              />
              <div className="text-[11px] text-[#8A9270] mt-[6px] font-mono">
                https://www.mozopost.live/{brandForm.customUrl || "yourbrand"}/track
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Brand Name *</label>
              <input
                type="text"
                placeholder="Your brand name"
                value={brandForm.brandName}
                onChange={(e) => setBrandForm((f) => ({ ...f, brandName: e.target.value }))}
                className="w-full bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] text-[#2F3A22] outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Logo</label>
              <div
                onClick={() => alert("Upload logo")}
                className="w-[80px] h-[80px] border border-dashed border-[#D8CBAE] rounded-[10px] flex flex-col items-center justify-center gap-[4px] text-[#8A9270] text-[11px] cursor-pointer hover:border-[#546B41] hover:text-[#546B41]"
              >
                <span>↥</span>
                <span>Upload logo</span>
              </div>
            </div>
            <div>
              <label className="block text-[12px] text-[#6B7556] mb-[8px]">Brand / accent color</label>
              <div className="flex items-center gap-[10px]">
                <span className="w-[38px] h-[38px] rounded-[8px] border border-[#E2D4B8] shrink-0" style={{ background: brandForm.accentColor }}></span>
                <input
                  type="text"
                  value={brandForm.accentColor}
                  onChange={(e) => setBrandForm((f) => ({ ...f, accentColor: e.target.value }))}
                  className="flex-1 bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] px-[14px] py-[11px] text-[14px] font-mono text-[#2F3A22] outline-none"
                />
              </div>
            </div>
          </div>
          <button
            onClick={() => alert("Save Brand Settings")}
            className="mt-[22px] inline-block bg-[#546B41] hover:bg-[#455835] text-[#FFF8EC] rounded-[8px] px-[22px] py-[11px] text-[13px] font-semibold cursor-pointer"
          >
            Save Brand Settings
          </button>
        </div>
      )}

      {/* ── API SETUP TAB ── */}
      {isApiTab && (
        <div className="mt-[22px] flex flex-col gap-[16px] max-w-[1000px]">
          <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-[28px]">
            <div className="flex items-center gap-[12px]">
              <span className="w-[40px] h-[40px] rounded-[10px] bg-[#EDF0E4] text-[#546B41] flex items-center justify-center text-[17px] font-bold">
                ⚿
              </span>
              <div>
                <h3 className="text-[16px] font-semibold text-[#2F3A22]">API Token</h3>
                <p className="text-[12px] text-[#8A9270]">Authenticate your MozoPost API requests</p>
              </div>
            </div>
            <div className="border border-[#EADFC8] rounded-[12px] p-[40px] mt-[20px] text-center bg-[#FFF8EC]/40">
              <div className="w-[60px] h-[60px] rounded-full bg-[#EDF0E4] text-[#546B41] flex items-center justify-center text-[24px] mx-auto">
                ⚿
              </div>
              <h4 className="text-[16px] font-semibold text-[#2F3A22] mt-[16px]">
                {apiToken ? "Your Active API Token" : "No API token yet"}
              </h4>
              <p className="text-[12px] text-[#8A9270] mt-[6px] max-w-[380px] mx-auto leading-[1.6]">
                {apiToken
                  ? "Keep your API token secure and never share it in publicly accessible code repositories."
                  : "Generate an API token to authenticate your MozoPost API requests. Keep your token secure and never share it publicly."}
              </p>
              {apiToken && (
                <div className="mt-[14px] bg-[#FFF8EC] border border-[#E2D4B8] rounded-[8px] p-[12px] font-mono text-[12px] text-[#546B41] font-bold break-all max-w-[500px] mx-auto">
                  {apiToken}
                </div>
              )}
              <button
                onClick={generateApiToken}
                className="mt-[18px] inline-block bg-[#546B41] hover:bg-[#455835] text-[#FFF8EC] rounded-[9px] px-[24px] py-[11px] text-[14px] font-semibold cursor-pointer"
              >
                ⚿ {apiToken ? "Regenerate API Token" : "Generate API Token"}
              </button>
            </div>
            <button
              onClick={() => alert("Viewing API Documentation...")}
              className="border-t border-[#EADFC8] mt-[20px] pt-[16px] text-[13px] text-[#546B41] font-semibold cursor-pointer hover:underline block text-left"
            >
              ▤ View API Documentation ↗
            </button>
          </div>

          <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-[24px] flex items-center gap-[12px]">
            <span className="w-[40px] h-[40px] rounded-[10px] bg-[#EDF0E4] text-[#6F7E50] flex items-center justify-center text-[17px] font-bold">
              ⊕
            </span>
            <div>
              <div className="text-[15px] font-semibold text-[#2F3A22]">Webhooks</div>
              <div className="text-[12px] text-[#8A9270]">Receive real-time order status updates via HTTP</div>
            </div>
          </div>
        </div>
      )}

      {/* ── OTHER TABS PLACEHOLDER ── */}
      {isOtherProfileTab && (
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-[60px] mt-[22px] text-center text-[#B3B596] text-[14px]">
          {profileTab} — configure your {profileTab} details here.
        </div>
      )}
    </div>
  );
}
