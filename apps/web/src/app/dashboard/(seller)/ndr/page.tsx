"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";

const REASON_LABELS: Record<string, string> = {
  customer_not_available: "Customer not available",
  wrong_address: "Address issue",
  refused_delivery: "Customer refused",
  premises_closed: "Premises closed",
  out_of_delivery_area: "Out of delivery area",
  fake_attempt: "Fake attempt",
  other: "Customer not contactable",
};

export default function NdrPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Failed Delivery");
  const [onlyPending, setOnlyPending] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/ndr");
      setRecords(data.ndrRecords);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function takeAction(orderId: string, action: string) {
    setActionId(orderId);
    try {
      await api.post(`/ndr/${orderId}/action`, { action });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  function toggleSelect(id: string) {
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  }

  const ndrTabs = ["Failed Delivery", "Delivered", "Out For Delivery", "RTO"];

  return (
    <div className="animate-fade-up space-y-5  mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2F3A22] tracking-tight">
            Manage NDR
          </h1>
          <p className="text-[15px] text-[#8A9270] mt-1">
            All orders with at least one failed delivery attempt will be shown
            here.
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-4 border-b border-[#EADFC8] pt-1 overflow-x-auto">
        {ndrTabs.map((t) => {
          const isActive = activeTab === t;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-2.5 text-[14px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer ${
                isActive
                  ? "border-[#546B41] text-[#546B41] font-semibold"
                  : "border-transparent text-[#8A9270] hover:text-[#2F3A22]"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-sm font-mono-nb text-[#6B7556] shadow-sm">
          21 Jun – 27 Jun
        </div>
        <select className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-sm font-semibold text-[#2F3A22] shadow-sm outline-none cursor-pointer">
          <option>All Failure Reasons</option>
          <option>Customer not contactable</option>
          <option>Customer not available</option>
          <option>Address issue</option>
        </select>
        <div className="flex-1 max-w-xs">
          <input
            placeholder="⌕ Search AWB, Order ID..."
            className="w-full bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-sm text-[#2F3A22] placeholder-[#B3B596] outline-none shadow-sm focus:border-[#546B41]"
          />
        </div>
        <button
          onClick={() => setOnlyPending(!onlyPending)}
          className="flex items-center gap-2 bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-sm font-medium text-[#6B7556] cursor-pointer shadow-sm"
        >
          <span>Only pending action</span>
          <span
            className={`w-7 h-4 rounded-full p-0.5 transition-colors ${onlyPending ? "bg-[#546B41]" : "bg-[#E2D4B8]"}`}
          >
            <span
              className={`block w-3 h-3 rounded-full bg-white transition-transform ${onlyPending ? "translate-x-3" : "translate-x-0"}`}
            />
          </span>
        </button>
        <button
          onClick={load}
          className="ml-auto bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#E0E7CE] transition-colors shadow-sm cursor-pointer"
        >
          Apply
        </button>
      </div>

      {/* Multi-Selection Bulk Toolbar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-4 bg-[#EDF0E4] border border-[#CBD7B5] rounded-xl p-3 px-4 shadow-sm animate-fade-up">
          <span className="text-[13px] font-semibold text-[#546B41] font-mono-nb">
            {selected.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Initiating re-attempt for selected...")}
              className="bg-white border border-[#E2D4B8] hover:border-[#546B41] text-[#546B41] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            >
              ↻ Re-attempt
            </button>
            <button
              onClick={() => alert("Marking RTO for selected...")}
              className="bg-white border border-[#E2D4B8] hover:border-[#B4623F] text-[#B4623F] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
            >
              ↺ Mark RTO
            </button>
          </div>
          <button
            onClick={() => setSelected([])}
            className="ml-auto text-sm text-[#8A9270] hover:text-[#B4623F] transition-colors cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Action Notice */}
      {records.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FFF8EC] border border-[#E2D4B8] flex items-start gap-3 shadow-sm">
          <div className="w-6 h-6 rounded-full bg-[#EDF0E4] text-[#546B41] flex items-center justify-center shrink-0 font-bold text-[13px] mt-0.5">
            !
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-[#2F3A22] uppercase tracking-wider">
              Action Required
            </h4>
            <p className="text-[13px] text-[#6B7556] mt-0.5">
              Unresolved NDRs auto-convert to RTO after 3 days. Act now to
              protect your COD revenue.
            </p>
          </div>
        </div>
      )}

      {/* Records Grid */}
      {loading ? (
        <div className="text-[13px] text-[#8A9270] text-center py-12 font-mono-nb">
          Loading NDR records...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EADFC8] p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#EDF0E4] text-[#546B41] flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            ✓
          </div>
          <h3 className="text-[17px] font-bold text-[#2F3A22] mb-1">
            No pending NDRs
          </h3>
          <p className="text-[13px] text-[#8A9270]">
            All your deliveries are on track. Great job!
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EADFC8] rounded-xl overflow-hidden shadow-sm mt-4">
          {/* Grid Table Header */}
          <div className="grid grid-cols-[34px_1.2fr_1.6fr_0.9fr_1.5fr_1.4fr_1.3fr_1fr] gap-3 px-4 py-3 bg-[#F6EEDB] text-[12px] font-semibold text-[#8A9270] uppercase tracking-wider items-center border-b border-[#EADFC8]">
            <div>
              <input
                type="checkbox"
                checked={
                  selected.length === records.length && records.length > 0
                }
                onChange={() =>
                  setSelected((p) =>
                    p.length === records.length ? [] : records.map((n) => n.id),
                  )
                }
                className="w-4 h-4 rounded border-[#E2D4B8] accent-[#546B41] cursor-pointer"
              />
            </div>
            <div>Order ID</div>
            <div>Product</div>
            <div>Payment</div>
            <div>Failure Reason</div>
            <div>Status</div>
            <div>Customer</div>
            <div>Attempts</div>
          </div>

          <div className="divide-y divide-[#F6EEDB]">
            {records.map((n) => {
              const isCritical = n.attempt_number >= 3;
              const isSelected = selected.includes(n.id);

              return (
                <div
                  key={n.id}
                  className={`grid grid-cols-[34px_1.2fr_1.6fr_0.9fr_1.5fr_1.4fr_1.3fr_1fr] gap-3 px-4 py-4 text-[13px] items-start transition-colors ${
                    isSelected ? "bg-[#FFF8EC]" : "hover:bg-[#FFF8EC]/50"
                  }`}
                >
                  <div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(n.id)}
                      className="w-4 h-4 rounded border-[#E2D4B8] accent-[#546B41] cursor-pointer mt-0.5"
                    />
                  </div>
                  <div>
                    <div className="font-mono-nb font-semibold text-[#2F3A22] text-sm">
                      #{n.mozopost_order_id}
                    </div>
                    <div className="text-[13px] text-[#8A9270] mt-1 font-mono-nb">
                      {new Date(n.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <div
                      className="w-9 h-9 rounded-md bg-[#F6EEDB] border border-[#E2D4B8] shrink-0"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, #EADFC8 0 4px, transparent 4px 8px)",
                      }}
                    ></div>
                    <div className="text-[13px] text-[#2F3A22] leading-snug">
                      {n.consignee_name}&apos;s Item
                    </div>
                  </div>
                  <div>
                    <div className="font-mono-nb text-[#2F3A22]">
                      ₹
                      {parseFloat(n.total_freight || n.cod_amount || 0).toFixed(
                        0,
                      )}
                    </div>
                    <span className="inline-block mt-1 text-[12px] font-semibold px-2 py-0.5 rounded border bg-[#F3ECD8] text-[#A9842E] border-[#DEC98F]">
                      {n.payment_mode?.toUpperCase() || "COD"}
                    </span>
                  </div>
                  <div className="text-[13px] text-[#6B7556] leading-snug">
                    {REASON_LABELS[n.ndr_reason] ||
                      n.ndr_reason ||
                      "Customer not contactable"}
                  </div>
                  <div>
                    <span
                      className={`inline-block text-[12px] font-semibold font-mono-nb px-2 py-0.5 rounded-full border ${isCritical ? "bg-[#F1E2D8] text-[#B4623F] border-[#DDBBA8]" : "bg-[#EDF0E4] text-[#546B41] border-[#CBD7B5]"}`}
                    >
                      {n.status || "NDR"}
                    </span>
                    <div className="text-[13px] text-[#8A9270] font-mono-nb mt-1.5">
                      {n.courier_name || "DELHIVERY"}
                    </div>
                    <div className="text-[13px] text-[#546B41] font-mono-nb mt-0.5 font-medium">
                      {n.awb_number || "DL5566120934"}
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-[#2F3A22]">
                      {n.consignee_name}
                    </div>
                    <div className="text-[13px] text-[#8A9270] font-mono-nb mt-0.5">
                      {n.consignee_phone}
                    </div>
                  </div>
                  <div>
                    <div className="text-[13px] text-[#8A9270]">
                      Attempts:{" "}
                      <span className="text-[#2F3A22] font-mono-nb font-medium">
                        {n.attempt_number}
                      </span>
                    </div>
                    <div className="mt-1.5 flex gap-1.5 flex-col w-24">
                      {n.attempt_number < 3 && (
                        <button
                          disabled={actionId === n.order_id}
                          onClick={() => takeAction(n.order_id, "reattempt")}
                          className="w-full text-[12px] text-[#A9842E] bg-[#F3ECD8] border border-[#DEC98F] rounded py-1 font-semibold hover:bg-[#E8DFC6] transition-colors disabled:opacity-50 cursor-pointer text-center"
                        >
                          Re-attempt
                        </button>
                      )}
                      <button
                        disabled={actionId === n.order_id}
                        onClick={() => takeAction(n.order_id, "rto")}
                        className="w-full text-[12px] text-[#B4623F] bg-[#F1E2D8] border border-[#DDBBA8] rounded py-1 font-semibold hover:bg-[#E8D4C7] transition-colors disabled:opacity-50 cursor-pointer text-center"
                      >
                        Mark RTO
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
