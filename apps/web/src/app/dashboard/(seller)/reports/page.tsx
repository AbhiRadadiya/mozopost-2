"use client";

import { useEffect, useState } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ReportsPage() {
  const [shipments, setShipments] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [s, w] = await Promise.all([
          api.get("/reports/shipments"),
          api.get("/reports/wallet"),
        ]);
        setShipments(s.data);
        setWallet(w.data);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="p-8 text-center text-sm text-[#94A3B8]">
        Loading reports...
      </div>
    );
  if (error)
    return (
      <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
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
    );

  const s = shipments?.summary;
  const w = wallet?.summary;

  // Prepare chart data, ensuring chronological order (reverse the slice)
  const chartData = (wallet?.monthly || []).slice(0, 6).reverse();

  return (
    <div className="animate-fade-up mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">
            Reports &amp; Analytics
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Key metrics and performance insights for your shipments.
          </p>
        </div>
        <button className="px-4 py-2 bg-white border border-[#E5E8EF] text-[#475569] text-xs font-semibold rounded-lg hover:bg-[#F8F9FB] hover:text-[#0F172A] transition-colors flex items-center gap-2 shadow-sm">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          Export Report
        </button>
      </div>

      <h2 className="text-sm font-bold text-[#0F172A] mb-4">
        Shipment Overview
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0F172A] text-white p-5 rounded-2xl shadow-sm border border-[#0F172A]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            Total Orders
          </div>
          <div className="text-3xl font-bold font-mono">{s?.total ?? "—"}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            Delivered
          </div>
          <div className="text-3xl font-bold text-[#16A34A] font-mono">
            {s?.delivered ?? "—"}
          </div>
        </div>
        <div className="bg-[#FEF2F2] p-5 rounded-2xl shadow-sm border border-[#FECACA]">
          <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-1.5">
            RTO
          </div>
          <div className="text-3xl font-bold text-[#991B1B] font-mono">
            {s?.rto ?? "—"}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            Delivery Rate
          </div>
          <div className="text-3xl font-bold text-[#0F172A] font-mono">
            {s?.delivery_rate ?? "—"}%
          </div>
        </div>
        <div className="bg-[#FFFBEB] p-5 rounded-2xl shadow-sm border border-[#FEF08A]">
          <div className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest mb-1.5">
            RTO Rate
          </div>
          <div className="text-3xl font-bold text-[#92400E] font-mono">
            {s?.rto_rate ?? "—"}%
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            Total Freight
          </div>
          <div className="text-3xl font-bold text-[#0F172A] font-mono">
            ₹{s?.total_freight?.toFixed(0) ?? "—"}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            COD Volume
          </div>
          <div className="text-3xl font-bold text-[#0F172A] font-mono">
            ₹{s?.total_cod?.toFixed(0) ?? "—"}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1.5">
            NDR
          </div>
          <div className="text-3xl font-bold text-[#4F46E5] font-mono">
            {s?.ndr ?? "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Courier Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] flex flex-col">
          <div className="px-5 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB] shrink-0">
            <h2 className="text-sm font-bold text-[#0F172A]">
              Courier Performance
            </h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="border-b border-[#E5E8EF]">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
                    Courier
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
                    Orders
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
                    Delivered
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">
                    Freight ₹
                  </th>
                </tr>
              </thead>
              <tbody>
                {shipments?.byCourier?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-[#94A3B8] text-sm"
                    >
                      No data available yet
                    </td>
                  </tr>
                ) : (
                  (shipments?.byCourier || []).map((c: any) => (
                    <tr
                      key={c.code}
                      className="border-b border-[#F1F3F7] last:border-0 hover:bg-[#F8F9FB] transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-[#0F172A] text-xs">
                        {c.courier_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-[#475569]">
                        {c.orders}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-medium text-[#16A34A]">
                        {c.delivered}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#0F172A]">
                        ₹{c.freight?.toFixed(0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Wallet Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF]">
          <div className="px-5 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">Wallet Summary</h2>
          </div>
          <div className="p-5 border-b border-[#E5E8EF]">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#EEF2FF] p-4 rounded-xl border border-[#C7D2FE]">
                <div className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-widest mb-1">
                  Total Credits
                </div>
                <div className="text-xl font-bold text-[#3730A3] font-mono">
                  ₹{w?.total_credits?.toFixed(0) ?? "—"}
                </div>
              </div>
              <div className="bg-[#FEF2F2] p-4 rounded-xl border border-[#FECACA]">
                <div className="text-[10px] font-bold text-[#EF4444] uppercase tracking-widest mb-1">
                  Total Debits
                </div>
                <div className="text-xl font-bold text-[#991B1B] font-mono">
                  ₹{w?.total_debits?.toFixed(0) ?? "—"}
                </div>
              </div>
              <div className="bg-[#F8F9FB] p-4 rounded-xl border border-[#E5E8EF]">
                <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                  Refunds
                </div>
                <div className="text-xl font-bold text-[#0F172A] font-mono">
                  ₹{w?.total_refunds?.toFixed(0) ?? "—"}
                </div>
              </div>
              <div className="bg-[#F8F9FB] p-4 rounded-xl border border-[#E5E8EF]">
                <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
                  Transactions
                </div>
                <div className="text-xl font-bold text-[#0F172A] font-mono">
                  {w?.total_transactions ?? "—"}
                </div>
              </div>
            </div>
          </div>
          <div className="p-5 h-[340px]">
            <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4">
              Monthly Breakdown
            </h3>
            {chartData.length === 0 ? (
              <div className="text-sm text-[#94A3B8]">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F1F3F7"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    dx={-10}
                  />
                  <Tooltip
                    cursor={{ fill: "#F8F9FB" }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #E5E8EF",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                  />
                  <Bar
                    dataKey="credits"
                    name="Credits (₹)"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="debits"
                    name="Debits (₹)"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
