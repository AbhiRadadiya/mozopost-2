"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function AdminReportsPage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/reports/admin/courier-performance"),
      api.get("/reports/admin/merchant-growth"),
    ])
      .then(([c, g]) => {
        setCouriers(c.data.couriers);
        setGrowth(g.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#E5E8EF] border-t-[#4F46E5] rounded-full animate-spin"></div>
          <div className="text-sm text-[#64748B] animate-pulse">
            Loading reports...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up  mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Platform Reports
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Analytics across all merchants and couriers.
          </p>
        </div>
        <button className="px-5 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors shadow-sm">
          ⬇ Export All
        </button>
      </div>

      {/* Courier Performance */}
      <div>
        <h2 className="text-base font-bold text-[#0F172A] mb-4">
          Courier Performance
        </h2>
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Courier
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Total Orders
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Delivered
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    NDR
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    RTO
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Delivery Rate
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Avg Transit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {couriers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-10 text-center text-sm text-[#94A3B8]"
                    >
                      No courier data yet. Orders will appear here once placed.
                    </td>
                  </tr>
                ) : (
                  couriers.map((c: any) => (
                    <tr
                      key={c.code}
                      className="hover:bg-[#F8F9FB] transition-colors"
                    >
                      <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A]">
                        {c.name}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#0F172A]">
                        {c.total_orders}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#16A34A]">
                        {c.delivered}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#CA8A04]">
                        {c.ndr}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#DC2626]">
                        {c.rto}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[#F1F5F9] rounded-full h-1.5 w-20">
                            <div
                              className={`h-1.5 rounded-full ${(c.delivery_rate || 0) >= 85 ? "bg-[#16A34A]" : (c.delivery_rate || 0) >= 75 ? "bg-[#CA8A04]" : "bg-[#DC2626]"}`}
                              style={{ width: `${c.delivery_rate || 0}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-bold ${(c.delivery_rate || 0) >= 85 ? "text-[#16A34A]" : (c.delivery_rate || 0) >= 75 ? "text-[#CA8A04]" : "text-[#DC2626]"}`}
                          >
                            {c.delivery_rate || "—"}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#475569]">
                        {c.avg_transit_days ? `${c.avg_transit_days}d` : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Merchants */}
      <div>
        <h2 className="text-base font-bold text-[#0F172A] mb-4">
          Top Merchants by Revenue
        </h2>
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Merchant
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {(growth?.topMerchants || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-sm text-[#94A3B8]"
                    >
                      No merchant data yet.
                    </td>
                  </tr>
                ) : (
                  (growth?.topMerchants || []).map((m: any, i: number) => (
                    <tr
                      key={m.business_name}
                      className="hover:bg-[#F8F9FB] transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <span
                          className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-[#FEF9C3] text-[#854D0E]" : i === 1 ? "bg-[#F1F5F9] text-[#475569]" : "bg-[#FEF3C7] text-[#B45309]"}`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A]">
                        {m.business_name}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#0F172A]">
                        {m.orders}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#16A34A]">
                        ₹{m.revenue?.toFixed(0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
