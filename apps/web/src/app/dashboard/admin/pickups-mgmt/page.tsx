"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-[#DBEAFE] text-[#1E40AF]",
  picked_up: "bg-[#D1FAE5] text-[#065F46]",
  failed: "bg-[#FEE2E2] text-[#991B1B]",
  cancelled: "bg-[#F1F5F9] text-[#475569]",
};

export default function PickupsMgmtPage() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/pickups");
      setPickups(data.pickups);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/admin/pickups/${id}/status`, { status });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div className="animate-fade-up  mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Pickup Management</h1>
        <p className="text-sm text-[#64748B] mt-1">
          View and update all pickup requests across the platform.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
          <h2 className="text-sm font-bold text-[#0F172A]">
            All Pickup Requests
          </h2>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">
            Loading pickups...
          </div>
        ) : pickups.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">📦</div>
            <div className="text-sm font-semibold text-[#0F172A]">
              No pickup requests yet
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Pkgs
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {pickups.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#F8F9FB] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm text-[#64748B]">
                      {new Date(p.pickup_date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A]">
                      {p.business_name}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#0F172A]">
                      {p.courier_name || "Auto"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#64748B]">
                      {p.warehouse_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono text-[#0F172A]">
                      {p.expected_package_count}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[p.status] || "bg-[#F1F5F9] text-[#475569]"}`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {p.status === "scheduled" && (
                          <>
                            <button
                              onClick={() => updateStatus(p.id, "picked_up")}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#D1FAE5] text-[#065F46] rounded-lg hover:bg-[#A7F3D0] transition-colors"
                            >
                              Picked Up
                            </button>
                            <button
                              onClick={() => updateStatus(p.id, "failed")}
                              className="px-3 py-1.5 text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] rounded-lg hover:bg-[#FECACA] transition-colors"
                            >
                              Failed
                            </button>
                          </>
                        )}
                      </div>
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
