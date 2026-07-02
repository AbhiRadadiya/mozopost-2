"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-[#FAF4E6] text-[#546B41]",
  picked_up: "bg-[#E0E7CE] text-[#546B41]",
  failed: "bg-[#FEF2F2] text-[#DC2626]",
  cancelled: "bg-[#F1F5F9] text-[#6B7556]",
};

export default function PickupsMgmtPage() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal State
  const [selectedPickup, setSelectedPickup] = useState<any | null>(null);
  const [targetStatus, setTargetStatus] = useState<
    "picked_up" | "failed" | null
  >(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    load(false);
    const interval = setInterval(() => load(true), 15000);
    return () => clearInterval(interval);
  }, []);

  async function load(isPolling = false) {
    if (!isPolling) setLoading(true);
    try {
      const { data } = await api.get("/admin/pickups");
      setPickups(data.pickups || []);
    } catch (err) {
      if (!isPolling) setError(apiErrorMessage(err));
    } finally {
      if (!isPolling) setLoading(false);
    }
  }

  async function handleConfirmUpdate() {
    if (!selectedPickup || !targetStatus) return;
    setIsUpdating(true);
    try {
      await api.patch(`/admin/pickups/${selectedPickup.id}/status`, {
        status: targetStatus,
      });
      await load(true);
      closeModal();
    } catch (err) {
      setError(apiErrorMessage(err));
      setIsUpdating(false);
    }
  }

  function closeModal() {
    setSelectedPickup(null);
    setTargetStatus(null);
    setIsUpdating(false);
  }

  return (
    <div className="animate-fade-up mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22]">
            Pickup Management
          </h1>
          <p className="text-sm text-[#8A9270] mt-1">
            View and update all pickup requests across the platform.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-semibold text-[#991B1B]">
          ⚠ {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E2D4B8] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-[#E2D4B8] border-t-[#546B41] rounded-full animate-spin"></div>
              <div className="text-sm text-[#8A9270] animate-pulse">
                Loading pickups...
              </div>
            </div>
          </div>
        ) : pickups.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-base font-semibold text-[#2F3A22]">
              No pickup requests yet
            </div>
            <p className="text-sm text-[#8A9270] mt-1">
              New pickup requests will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2D4B8] bg-[#FAF4E6]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                    Pkgs
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF4E6]">
                {pickups.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#FAF4E6] transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#8A9270]">
                      {new Date(p.pickup_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-bold text-[#2F3A22]">
                      {p.business_name}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-[#2F3A22]">
                      {p.courier_name || "Auto"}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#6B7556]">
                      {p.warehouse_name || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-sm font-mono font-bold text-[#2F3A22]">
                      {p.expected_package_count}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLE[p.status] || "bg-[#F1F5F9] text-[#6B7556]"}`}
                      >
                        {p.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {p.status === "scheduled" ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPickup(p);
                                setTargetStatus("picked_up");
                              }}
                              className="px-3 py-1.5 text-xs font-bold border border-[#546B41] text-[#546B41] rounded-lg hover:bg-[#546B41] hover:text-white transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPickup(p);
                                setTargetStatus("failed");
                              }}
                              className="px-3 py-1.5 text-xs font-bold border border-[#DC2626] text-[#DC2626] rounded-lg hover:bg-[#DC2626] hover:text-white transition-colors"
                            >
                              Fail
                            </button>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-[#8A9270]">
                            —
                          </span>
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

      {/* Confirmation Modal */}
      {selectedPickup && targetStatus && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2F3A22]/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2D4B8] bg-[#FAF4E6]">
              <h3 className="text-lg font-bold text-[#2F3A22]">
                Confirm Action
              </h3>
              <button
                onClick={closeModal}
                className="text-[#8A9270] hover:text-[#2F3A22] transition-colors"
              >
                <svg
                  width="24"
                  height="24"
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

            <div className="p-6">
              <p className="text-sm font-medium text-[#6B7556] mb-5">
                You are about to mark this pickup as{" "}
                <strong
                  className={
                    targetStatus === "picked_up"
                      ? "text-[#546B41]"
                      : "text-[#DC2626]"
                  }
                >
                  {targetStatus === "picked_up" ? "Picked Up" : "Failed"}
                </strong>
                . Please confirm the details below.
              </p>

              <div className="bg-[#FAF4E6] border border-[#E2D4B8] rounded-xl p-4 space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-[#8A9270] uppercase tracking-widest">
                    Merchant
                  </span>
                  <span className="text-sm font-bold text-[#2F3A22]">
                    {selectedPickup.business_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-[#8A9270] uppercase tracking-widest">
                    Courier
                  </span>
                  <span className="text-sm font-bold text-[#2F3A22]">
                    {selectedPickup.courier_name || "Auto"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-[#8A9270] uppercase tracking-widest">
                    Packages
                  </span>
                  <span className="text-sm font-bold text-[#2F3A22]">
                    {selectedPickup.expected_package_count} pkgs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs font-bold text-[#8A9270] uppercase tracking-widest">
                    Date
                  </span>
                  <span className="text-sm font-bold text-[#2F3A22]">
                    {new Date(selectedPickup.pickup_date).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={closeModal}
                  disabled={isUpdating}
                  className="flex-1 py-3 px-4 text-sm font-bold text-[#6B7556] bg-white border border-[#E2D4B8] rounded-xl hover:bg-[#FAF4E6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpdate}
                  disabled={isUpdating}
                  className={`flex-1 py-3 px-4 text-sm font-bold text-white rounded-xl transition-colors ${
                    targetStatus === "picked_up"
                      ? "bg-[#546B41] hover:bg-[#435534]"
                      : "bg-[#DC2626] hover:bg-[#B91C1C]"
                  }`}
                >
                  {isUpdating ? "Saving..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
