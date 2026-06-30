"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, apiErrorMessage } from "@/lib/api";

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; border: string; label: string }
> = {
  scheduled: {
    bg: "bg-[#EDF0E4]",
    text: "text-[#546B41]",
    border: "border-[#CBD7B5]",
    label: "Scheduled",
  },
  picked_up: {
    bg: "bg-[#EDF0E4]",
    text: "text-[#546B41]",
    border: "border-[#CBD7B5]",
    label: "Picked Up",
  },
  failed: {
    bg: "bg-[#FEF2F2]",
    text: "text-[#A84A3B]",
    border: "border-[#FECACA]",
    label: "Failed",
  },
  cancelled: {
    bg: "bg-[#F8F9F7]",
    text: "text-[#8A9270]",
    border: "border-[#EADFC8]",
    label: "Cancelled",
  },
};

export default function PickupsPage() {
  const [mounted, setMounted] = useState(false);
  const [pickups, setPickups] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const [form, setForm] = useState({
    courierId: "",
    pickupDate: "",
    expectedPackageCount: "1",
    timeSlot: "10:00 AM – 12:00 PM",
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    load();
    api
      .get("/couriers")
      .then((r) => setCouriers(r.data.couriers))
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await api.get("/pickups");
      setPickups(r.data.pickups);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/pickups", {
        courierId: form.courierId || undefined,
        pickupDate: form.pickupDate || tomorrowStr,
        expectedPackageCount: parseInt(form.expectedPackageCount),
        timeSlot: form.timeSlot,
      });
      setIsModalOpen(false);
      setForm({
        courierId: "",
        pickupDate: "",
        expectedPackageCount: "1",
        timeSlot: "10:00 AM – 12:00 PM",
      });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    try {
      await api.patch(`/pickups/${id}/cancel`);
      setPickups((p) =>
        p.map((pk) => (pk.id === id ? { ...pk, status: "cancelled" } : pk)),
      );
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  const pickupCards = [
    {
      id: "all",
      label: "Total Pickups",
      sub: "All time requests",
      value: pickups.length,
      color: "#2F3A22",
      iconBg: "#F6EEDB",
      icon: "📦",
    },
    {
      id: "scheduled",
      label: "Scheduled",
      sub: "Upcoming dispatches",
      value: pickups.filter((p) => p.status === "scheduled").length,
      color: "#546B41",
      iconBg: "#EDF0E4",
      icon: "📅",
    },
    {
      id: "picked_up",
      label: "Picked Up",
      sub: "Successfully handed over",
      value: pickups.filter((p) => p.status === "picked_up").length,
      color: "#546B41",
      iconBg: "#EDF0E4",
      icon: "✓",
    },
    {
      id: "cancelled_failed",
      label: "Cancelled / Failed",
      sub: "Unsuccessful pickups",
      value: pickups.filter(
        (p) => p.status === "cancelled" || p.status === "failed",
      ).length,
      color: "#A84A3B",
      iconBg: "#FEF2F2",
      icon: "⚠️",
    },
  ];

  const filteredPickups = pickups.filter((p) => {
    if (activeFilter === "scheduled") return p.status === "scheduled";
    if (activeFilter === "picked_up") return p.status === "picked_up";
    if (activeFilter === "cancelled_failed")
      return p.status === "cancelled" || p.status === "failed";
    return true;
  });

  return (
    <div className="animate-fade-up mx-auto  pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">
            Pickups
          </h1>
          <p className="text-xs text-[#8A9270] mt-1 font-medium">
            Schedule and manage your courier pickups efficiently.
          </p>
        </div>
        <button
          onClick={() => {
            setError("");
            setIsModalOpen(true);
          }}
          className="bg-[#546B41] text-[#FFF8EC] rounded-lg px-5 py-2.5 text-[13px] font-bold hover:bg-[#435534] transition-colors shadow-sm flex items-center gap-2"
        >
          <span>+</span> Schedule Pickup
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-bold text-[#A84A3B]">
          {error}
        </div>
      )}

      {/* Interactive Summary Cards (Filter Tabs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {pickupCards.map((c) => {
          const isActive = activeFilter === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setActiveFilter(c.id)}
              className={`bg-white border rounded-xl p-5 flex items-start justify-between shadow-sm cursor-pointer transition-all ${
                isActive
                  ? "border-[#546B41] ring-2 ring-[#546B41]/20 bg-[#F8F9F7]"
                  : "border-[#EADFC8] hover:border-[#CBD7B5] hover:bg-[#FFF8EC]/50"
              }`}
            >
              <div>
                <div className="text-[11px] text-[#8A9270] uppercase tracking-widest font-bold flex items-center gap-1.5">
                  {c.label}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#546B41]" />
                  )}
                </div>
                <div className="text-xs text-[#8A9270] mt-1.5">{c.sub}</div>
                <div
                  className="text-3xl font-bold font-mono mt-3.5"
                  style={{ color: c.color }}
                >
                  {loading ? "..." : c.value}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm"
                style={{ backgroundColor: c.iconBg, color: c.color }}
              >
                {c.icon}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-width History Table */}
      <div className="bg-white border border-[#EADFC8] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F8F9F7] border-b border-[#EADFC8]">
              <tr>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Pickup Date
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Time Slot
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Courier
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Packages
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3.5 text-right text-[11px] font-bold text-[#8A9270] uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EADFC8]">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[#8A9270] text-sm font-medium"
                  >
                    Loading pickups...
                  </td>
                </tr>
              ) : filteredPickups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#EDF0E4] flex items-center justify-center mx-auto mb-3 border border-[#CBD7B5]">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#546B41"
                        strokeWidth="2"
                      >
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-[#2F3A22]">
                      No{" "}
                      {activeFilter === "all"
                        ? ""
                        : activeFilter.replace("_", " ")}{" "}
                      pickups found.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPickups.map((p: any) => {
                  const s = STATUS_BADGE[p.status] || {
                    bg: "bg-[#F8F9F7]",
                    text: "text-[#8A9270]",
                    border: "border-[#EADFC8]",
                    label: p.status,
                  };
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[#F8F9F7] transition-colors"
                    >
                      <td className="px-5 py-4 text-[#2F3A22] font-bold text-xs">
                        {new Date(p.pickup_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-4 text-[#6B7556] font-medium text-xs">
                        {p.time_slot || "—"}
                      </td>
                      <td className="px-5 py-4 text-[#2F3A22] font-semibold text-xs">
                        {p.courier_name || "Auto (Dynamic)"}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs font-bold text-[#2F3A22]">
                        {p.expected_package_count}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${s.bg} ${s.text} ${s.border}`}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {p.status === "scheduled" && (
                          <button
                            onClick={() => cancel(p.id)}
                            className="text-[11px] font-bold text-[#A84A3B] hover:underline bg-[#FEF2F2] px-2.5 py-1 rounded border border-[#FECACA] transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Pickup Modal */}
      {isModalOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up border border-[#EADFC8] flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="p-6 pb-4 shrink-0 bg-white z-10">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-[#546B41] flex items-center justify-center text-white shrink-0 shadow-sm">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#2F3A22]">
                        Schedule Pickup
                      </h2>
                      <p className="text-xs text-[#8A9270] mt-0.5">
                        Request courier dispatch for your packages.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-[#8A9270] hover:bg-[#FFF8EC] hover:text-[#546B41] w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form
                className="overflow-y-auto flex-1 min-h-0"
                onSubmit={handleCreate}
              >
                <div className="px-6 pb-6 space-y-5">
                  <div>
                    <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                      Pickup Date
                    </div>
                    <input
                      type="date"
                      required
                      value={form.pickupDate || tomorrowStr}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, pickupDate: e.target.value }))
                      }
                      className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl px-4 py-3 text-[#2F3A22] font-semibold text-[13px] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                      Time Slot
                    </div>
                    <div className="relative">
                      <select
                        value={form.timeSlot}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, timeSlot: e.target.value }))
                        }
                        className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl pl-4 pr-10 py-3 text-[#2F3A22] font-semibold text-[13px] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all appearance-none cursor-pointer"
                      >
                        <option>10:00 AM – 12:00 PM</option>
                        <option>12:00 PM – 2:00 PM</option>
                        <option>2:00 PM – 4:00 PM</option>
                        <option>4:00 PM – 6:00 PM</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#546B41]">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                      Courier Partner
                    </div>
                    <div className="relative">
                      <select
                        value={form.courierId}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, courierId: e.target.value }))
                        }
                        className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl pl-4 pr-10 py-3 text-[#2F3A22] font-semibold text-[13px] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Auto (Assign dynamically)</option>
                        {couriers.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#546B41]">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-[#8A9270] uppercase tracking-widest mb-2.5">
                      Expected Package Count
                    </div>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.expectedPackageCount}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          expectedPackageCount: e.target.value,
                        }))
                      }
                      className="w-full bg-[#FFF8EC] border border-[#EADFC8] rounded-xl px-4 py-3 text-[#2F3A22] font-semibold text-[13px] outline-none focus:border-[#546B41] focus:ring-2 focus:ring-[#546B41]/10 transition-all"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-bold text-[#A84A3B]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-[#546B41] text-white font-semibold text-sm hover:bg-[#3C4E2D] transition-colors shadow-sm flex items-center justify-center gap-2 mt-2 shrink-0 disabled:opacity-50"
                  >
                    {submitting ? "Scheduling..." : "Confirm Pickup Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
