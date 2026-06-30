"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

interface Courier {
  id: string;
  name: string;
  code: string;
  status: string;
  isLive: boolean;
}

export default function CourierIntegrationsPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/couriers");
      setCouriers(data.couriers);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(id: string, current: string) {
    setActionId(id);
    try {
      await api.patch(`/super-admin/couriers/${id}/status`, {
        status: current === "active" ? "inactive" : "active",
      });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  const active = couriers.filter((c) => c.status === "active");
  const live = couriers.filter((c) => c.isLive);

  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Courier Integrations
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-[#64748B]">
              Manage courier partners and their API connections.
            </p>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B]">
              Super Admin Only
            </span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-sm text-[#4338CA]">
        <span className="font-bold">ℹ Info:</span> Couriers marked{" "}
        <strong>LIVE</strong> have API keys configured in{" "}
        <code className="font-mono bg-[#E0E7FF] px-1 rounded text-xs">
          apps/api/.env
        </code>
        . Couriers marked <strong>Mock</strong> generate realistic fake AWBs for
        end-to-end testing.
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Total Couriers
          </div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">
            {couriers.length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Active
          </div>
          <div className="text-2xl font-bold text-[#16A34A] font-mono">
            {active.length}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">
            Live API
          </div>
          <div className="text-2xl font-bold text-[#4F46E5] font-mono">
            {live.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
          <h2 className="text-sm font-bold text-[#0F172A]">All Couriers</h2>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">
            Loading couriers...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {couriers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#F8F9FB] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A]">
                      {c.name}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono font-bold text-[#4F46E5]">
                      {c.code}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.isLive ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEF9C3] text-[#854D0E]"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${c.isLive ? "bg-[#16A34A]" : "bg-[#CA8A04]"}`}
                        ></span>
                        {c.isLive ? "LIVE" : "Mock"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.status === "active" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F1F5F9] text-[#475569]"}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        disabled={actionId === c.id}
                        onClick={() => toggleStatus(c.id, c.status)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${c.status === "active" ? "bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]" : "bg-[#D1FAE5] text-[#065F46] hover:bg-[#A7F3D0]"}`}
                      >
                        {c.status === "active" ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
