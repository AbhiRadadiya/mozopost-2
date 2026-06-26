"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const PLATFORMS = [
  { id: "woocommerce", label: "WooCommerce", color: "bg-[#7f54b3] text-white" },
  { id: "opencart", label: "OpenCart", color: "bg-[#23A1D1] text-white" },
  { id: "magento", label: "Magento", color: "bg-[#EE672F] text-white" },
  { id: "shopline", label: "Shopline", color: "bg-[#000000] text-white" },
  { id: "dukaan", label: "Dukaan", color: "bg-[#146EB4] text-white" },
  { id: "custom_api", label: "Custom API", color: "bg-[#475569] text-white" },
];

const STATUS_COLOR: Record<string, { classes: string }> = {
  idle: { classes: "bg-[#D1FAE5] text-[#065F46]" },
  syncing: { classes: "bg-[#DBEAFE] text-[#1E40AF]" },
  error: { classes: "bg-[#FEF2F2] text-[#991B1B]" },
  paused: { classes: "bg-[#F1F5F9] text-[#475569]" },
};

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    platform: "woocommerce",
    storeName: "",
    storeUrl: "",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
    syncIntervalMin: 15,
    autoSync: true,
    importPending: true,
    importPrepaid: true,
    importCod: true,
    pushTracking: true,
    pushAwb: true,
  });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [storeRes, dashRes] = await Promise.all([
        api.get("/stores"),
        api.get("/stores/dashboard"),
      ]);
      setStores(storeRes.data.stores);
      setDashboard(dashRes.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setError("");
    try {
      const { data } = await api.post("/stores", form);
      alert(
        `Store connected!\nWebhook secret: ${data.webhookSecret}\nSave this for order push verification.`,
      );
      setShowForm(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }

  async function syncNow(id: string) {
    setSyncingId(id);
    setError("");
    try {
      await api.post(`/stores/${id}/sync`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSyncingId(null);
    }
  }

  async function connectShopify() {
    const domain = window.prompt(
      "Enter your Shopify domain (e.g., mystore.myshopify.com):",
    );
    if (!domain) return;

    const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0];
    if (!cleanDomain.includes(".myshopify.com")) {
      alert("Please enter a valid .myshopify.com domain");
      return;
    }

    try {
      const { data } = await api.get(`/shopify/auth-url?shop=${cleanDomain}`);
      window.location.href = data.url;
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="animate-fade-up mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Store Integrations
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Connect e-commerce platforms to automatically import orders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={connectShopify}
            className="px-5 py-2.5 bg-[#96bf48] text-white text-sm font-semibold rounded-xl hover:bg-[#86ac40] transition-colors shadow-sm flex items-center gap-2"
          >
            🛍️ Connect Shopify
          </button>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-5 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm flex items-center gap-2"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12l7 7" />
            </svg>
            Other Store
          </button>
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

      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
              Connected Stores
            </div>
            <div className="text-3xl font-bold text-[#0F172A] font-mono">
              {dashboard.connectedCount}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
              Total Imported
            </div>
            <div className="text-3xl font-bold text-[#16A34A] font-mono">
              {dashboard.totalImported}
            </div>
          </div>
          <div className="bg-[#FEF2F2] p-5 rounded-2xl shadow-sm border border-[#FECACA]">
            <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-1.5">
              Failed Syncs (7d)
            </div>
            <div className="text-3xl font-bold text-[#991B1B] font-mono">
              {dashboard.failedSyncs}
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
              Platforms
            </div>
            <div className="text-3xl font-bold text-[#4F46E5] font-mono">
              {[...new Set((stores || []).map((s: any) => s.platform))].length}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden animate-fade-in">
          <div className="px-6 py-5 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Connect New Store
            </h2>
          </div>
          <form onSubmit={connect} className="p-6">
            <div className="mb-6">
              <label className="block text-xs font-semibold text-[#475569] mb-3 uppercase tracking-wide">
                Select Platform
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((p) => {
                  const isSelected = form.platform === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, platform: p.id }))}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isSelected ? `${p.color} ring-4 ring-[#EEF2FF] shadow-sm` : "bg-[#F4F6F9] text-[#475569] hover:bg-[#E5E8EF]"}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Store Name
                </label>
                <input
                  required
                  value={form.storeName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, storeName: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Store URL
                </label>
                <input
                  type="url"
                  required
                  value={form.storeUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, storeUrl: e.target.value }))
                  }
                  placeholder="https://yourstore.com"
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  API Key
                </label>
                <input
                  required
                  value={form.apiKey}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, apiKey: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  API Secret
                </label>
                <input
                  value={form.apiSecret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, apiSecret: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Access Token
                </label>
                <input
                  value={form.accessToken}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accessToken: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                  Sync Interval
                </label>
                <select
                  value={form.syncIntervalMin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      syncIntervalMin: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={15}>Every 15 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                </select>
              </div>
            </div>

            <div className="bg-[#F8F9FB] border border-[#E5E8EF] rounded-xl p-4 mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ["Import Pending Orders", "importPending"],
                ["Import Prepaid", "importPrepaid"],
                ["Import COD", "importCod"],
                ["Push Tracking", "pushTracking"],
                ["Push AWB Number", "pushAwb"],
                ["Auto Sync", "autoSync"],
              ].map(([label, key]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.checked }))
                      }
                      className="w-5 h-5 border-2 border-[#CBD5E1] rounded text-[#4F46E5] focus:ring-[#4F46E5] transition-colors cursor-pointer"
                    />
                  </div>
                  <span className="text-sm font-medium text-[#475569] group-hover:text-[#0F172A] transition-colors">
                    {label}
                  </span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-2 border-t border-[#E5E8EF]">
              <button
                type="submit"
                disabled={connecting}
                className="px-6 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50"
              >
                {connecting ? "Connecting..." : "Connect Store"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] hover:text-[#0F172A] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[#94A3B8] text-center py-12">
          Loading stores...
        </div>
      ) : stores.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F4F6F9] flex items-center justify-center mx-auto mb-4 text-2xl">
            🛒
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-1">
            No stores connected
          </h3>
          <p className="text-sm font-medium text-[#64748B]">
            Connect Shopify, WooCommerce, or any platform to auto-import orders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {stores.map((s) => {
            const p = PLATFORMS.find((x) => x.id === s.platform);
            const statusStyle = STATUS_COLOR[s.status] || {
              classes: "bg-[#F1F5F9] text-[#475569]",
            };

            return (
              <div
                key={s.id}
                className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] p-5 flex flex-col md:flex-row gap-5 items-start md:items-center hover:border-[#CBD5E1] transition-colors"
              >
                {/* Left info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    {p && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${p.color}`}
                      >
                        {s.platform}
                      </span>
                    )}
                    <h3 className="text-base font-bold text-[#0F172A]">
                      {s.store_name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle.classes}`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-[#64748B] flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                      {s.store_url}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                    <span className="font-mono">
                      ID: {s.id.substring(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 md:w-[400px] w-full shrink-0">
                  <div>
                    <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                      Interval
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] font-mono">
                      {s.sync_interval_min}m
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                      Imported
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] font-mono">
                      {s.total_imported}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                      Last Sync
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] whitespace-nowrap">
                      {s.last_sync_at
                        ? new Date(s.last_sync_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                      Auto Sync
                    </div>
                    <div
                      className={`text-sm font-bold ${s.auto_sync ? "text-[#16A34A]" : "text-[#94A3B8]"}`}
                    >
                      {s.auto_sync ? "On" : "Off"}
                    </div>
                  </div>
                </div>

                {/* Error Banner */}
                {s.last_error && (
                  <div className="w-full mt-2 md:mt-0 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]">
                    ⚠ {s.last_error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end mt-2 md:mt-0">
                  <button
                    disabled={syncingId === s.id || s.status === "syncing"}
                    onClick={() => syncNow(s.id)}
                    className="p-2 bg-[#F8F9FB] border border-[#E5E8EF] text-[#475569] rounded-lg hover:bg-white hover:text-[#4F46E5] hover:border-[#4F46E5] transition-all disabled:opacity-50"
                    title="Sync Now"
                  >
                    <svg
                      className={syncingId === s.id ? "animate-spin" : ""}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                    </svg>
                  </button>
                  <button
                    onClick={() =>
                      api
                        .patch(`/stores/${s.id}`, { isActive: !s.is_active })
                        .then(load)
                    }
                    className="px-3 py-2 bg-[#F8F9FB] border border-[#E5E8EF] text-[#475569] text-xs font-semibold rounded-lg hover:bg-white hover:text-[#0F172A] hover:border-[#CBD5E1] transition-all"
                  >
                    {s.is_active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Disconnect this store?"))
                        api.delete(`/stores/${s.id}`).then(load);
                    }}
                    className="p-2 bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] rounded-lg hover:bg-[#FEE2E2] hover:text-[#B91C1C] transition-all"
                    title="Disconnect"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
