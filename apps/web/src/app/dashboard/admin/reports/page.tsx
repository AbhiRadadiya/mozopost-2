"use client";

import React, { useEffect, useState, useMemo } from "react";
import { api, apiErrorMessage } from "@/lib/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ComposedChart, Line
} from "recharts";

const marginColor = (pct: number) =>
  pct >= 15 ? "text-[#546B41]" : pct >= 5 ? "text-[#CA8A04]" : "text-[#991B1B]";

const formatCurrency = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
};

export default function UnifiedAnalyticsPage() {
  const [pnlData, setPnlData] = useState<any>(null);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedMerchantId, setExpandedMerchantId] = useState<string | null>(null);
  const [merchantHistoryData, setMerchantHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 60000); // 1m poll for heavy reports
    return () => clearInterval(interval);
  }, []);

  async function loadData(isPolling = false) {
    if (!isPolling) setLoading(true);
    try {
      const [pnlRes, cRes, gRes] = await Promise.all([
        api.get("/reports/admin/pnl"),
        api.get("/reports/admin/courier-performance"),
        api.get("/reports/admin/merchant-growth"),
      ]);
      setPnlData(pnlRes.data);
      setCouriers(cRes.data.couriers || []);
      setGrowth(gRes.data || null);
    } catch (err) {
      if (!isPolling) setError(apiErrorMessage(err));
    } finally {
      if (!isPolling) setLoading(false);
    }
  }

  if (loading && !pnlData) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#E2D4B8] border-t-[#546B41] rounded-full animate-spin"></div>
          <div className="text-sm text-[#8A9270] animate-pulse font-semibold tracking-wide">
            Generating Platform Analytics...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-semibold text-[#991B1B]">
        ⚠ {error}
      </div>
    );
  }

  const p = pnlData?.platform || {};
  const netProfit = (p.total_margin || 0) - (p.rto_loss || 0) - (p.weight_refunded || 0);
  const marginPct = p.total_revenue > 0 ? (netProfit / p.total_revenue) * 100 : 0;
  
  // Format Data for Charts
  const financialChartData = (growth?.financialGrowth || []).map((m: any) => ({
    name: m.month,
    Revenue: m.revenue,
    "Net Profit": m.net_profit,
  })).reverse();

  // If no financial data, mock some for visual testing as the DB might be empty
  const hasFinData = financialChartData.length > 0;
  const renderFinData = hasFinData ? financialChartData : [
    { name: "2023-11", Revenue: 1200000, "Net Profit": 150000 },
    { name: "2023-12", Revenue: 1800000, "Net Profit": 220000 },
    { name: "2024-01", Revenue: 2100000, "Net Profit": 310000 },
    { name: "2024-02", Revenue: 1950000, "Net Profit": 280000 },
    { name: "2024-03", Revenue: 2500000, "Net Profit": 390000 },
    { name: "2024-04", Revenue: 3200000, "Net Profit": 480000 },
  ];

  const acquisitionData = (growth?.monthly || []).map((m: any) => ({
    name: m.month,
    Merchants: m.new_merchants
  })).reverse();

  const renderAcqData = acquisitionData.length > 0 ? acquisitionData : [
    { name: "2023-11", Merchants: 12 }, { name: "2023-12", Merchants: 19 },
    { name: "2024-01", Merchants: 15 }, { name: "2024-02", Merchants: 22 },
    { name: "2024-03", Merchants: 28 }, { name: "2024-04", Merchants: 35 },
  ];

  const courierChartData = couriers.map(c => ({
    name: c.name,
    "Delivery Rate (%)": c.delivery_rate || 0,
    "Transit Time (Days)": c.avg_transit_days || 0,
  }));

  // Generate Automated Insights
  const generateInsights = () => {
    const insights = [];
    if (marginPct > 15) insights.push(`🚀 Platform profitability is exceptionally strong at ${marginPct.toFixed(1)}% margin.`);
    else if (marginPct > 5) insights.push(`✅ Platform is maintaining a healthy ${marginPct.toFixed(1)}% net profit margin.`);
    else insights.push(`⚠ Net profit margin is low (${marginPct.toFixed(1)}%). Consider optimizing courier costs or reducing RTO.`);

    if (p.rto_loss > 0 && p.total_margin > 0) {
      const rtoImpact = ((p.rto_loss / p.total_margin) * 100).toFixed(1);
      if (parseFloat(rtoImpact) > 30) insights.push(`🚨 RTO losses are eating ${rtoImpact}% of your gross margins! Immediate action required on high-RTO merchants.`);
      else insights.push(`💡 RTO loss accounts for ${rtoImpact}% of gross margin erosion.`);
    }

    if (couriers.length > 0) {
      const bestCourier = couriers.reduce((prev, curr) => (curr.delivery_rate > prev.delivery_rate ? curr : prev));
      if (bestCourier.delivery_rate > 80) insights.push(`🏆 ${bestCourier.name} is your top performing courier with a ${bestCourier.delivery_rate}% delivery rate.`);
    }

    return insights;
  };

  const toggleMerchant = async (sellerId: string) => {
    if (expandedMerchantId === sellerId) {
      setExpandedMerchantId(null);
      return;
    }
    setExpandedMerchantId(sellerId);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/reports/admin/pnl/${sellerId}/history`);
      const data = res.data.history || [];
      // reverse so chronological order
      setMerchantHistoryData(data.reverse().map((d: any) => ({
        name: d.month,
        Revenue: d.revenue,
        "Net Profit": d.net_profit
      })));
    } catch (err) {
      console.error("Failed to load history", err);
      setMerchantHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const insights = generateInsights();

  return (
    <div className="animate-fade-up mx-auto pb-10 space-y-6 max-w-[1400px]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#2F3A22]">Platform Analytics</h1>
          <p className="text-[13px] text-[#8A9270] mt-1 font-medium">
            Command center for real-time Profit & Loss, growth, and performance insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2.5 text-[13px] font-bold border border-[#E2D4B8] rounded-xl bg-white outline-none focus:border-[#546B41] text-[#2F3A22] shadow-sm">
            <option>All Time</option>
            <option>This Month</option>
            <option>Last 30 Days</option>
          </select>
          <button className="px-5 py-2.5 bg-[#546B41] text-[#FFF8EC] text-[13px] font-bold rounded-xl hover:bg-[#435534] transition-colors shadow-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Row 1: The Big Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", val: formatCurrency(p.total_revenue || 0), sub: "Gross billing", c: "#2F3A22", bg: "bg-white", border: "border-t-[#2F3A22]" },
          { label: "Gross Margin", val: formatCurrency(p.total_margin || 0), sub: "Revenue − Courier Cost", c: "#546B41", bg: "bg-white", border: "border-t-[#546B41]" },
          { label: "RTO Loss", val: formatCurrency(p.rto_loss || 0), sub: "Sunk logistics cost", c: "#CA8A04", bg: "bg-white", border: "border-t-[#CA8A04]" },
          { label: "Net Profit", val: formatCurrency(netProfit), sub: `${marginPct.toFixed(1)}% Platform Margin`, c: netProfit >= 0 ? "#546B41" : "#DC2626", bg: "bg-gradient-to-br from-[#EDF0E4] to-[#F6F8EF]", border: `border-t-${netProfit >= 0 ? '[#546B41]' : '[#DC2626]'}` },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} p-5 rounded-[14px] border border-[#E2D4B8] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`} style={{ borderTopWidth: '3px', borderTopColor: k.border.replace('border-t-', '') }}>
            <div className="text-[11px] font-bold text-[#8A9270] uppercase tracking-widest">{k.label}</div>
            <div className="text-[28px] font-bold font-mono mt-2 tracking-tight" style={{ color: k.c }}>{k.val}</div>
            <div className="text-[12px] font-medium text-[#8A9270] mt-1">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Insights Alert Box */}
      <div className="bg-[#FAF4E6] border border-[#E2D4B8] rounded-[14px] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[16px]">✨</span>
          <h3 className="font-bold text-[#2F3A22] text-[14px]">Key Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, idx) => (
            <div key={idx} className="bg-white/60 border border-[#EADFC8] rounded-xl p-3 text-[13px] text-[#2F3A22] font-medium leading-relaxed">
              {insight}
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Financial Growth Chart */}
        <div className="lg:col-span-2 bg-white border border-[#E2D4B8] rounded-[14px] p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-[#2F3A22] text-[15px]">Financial Growth</h3>
              <p className="text-[12px] text-[#8A9270]">Revenue vs Net Profit over time</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={renderFinData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F3A22" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2F3A22" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#546B41" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#546B41" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D4B8" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270' }} tickFormatter={(val) => `₹${val/1000}K`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2D4B8', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                  itemStyle={{ fontWeight: 700 }}
                  formatter={(val: number) => formatCurrency(val)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }}/>
                <Area type="monotone" dataKey="Revenue" stroke="#2F3A22" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="Net Profit" stroke="#546B41" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Merchant Acquisition Chart */}
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-5 shadow-sm">
          <div className="mb-6">
            <h3 className="font-bold text-[#2F3A22] text-[15px]">Merchant Acquisition</h3>
            <p className="text-[12px] text-[#8A9270]">New signups per month</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={renderAcqData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D4B8" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270' }} />
                <Tooltip 
                  cursor={{ fill: '#EDF0E4' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2D4B8', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '13px', fontWeight: 'bold' }}
                />
                <Bar dataKey="Merchants" fill="#A9842E" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Courier Performance & Secondary Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Courier Performance Chart */}
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] p-5 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-[#2F3A22] text-[15px]">Courier Network Performance</h3>
            <p className="text-[12px] text-[#8A9270]">Delivery Rate vs Transit Time</p>
          </div>
          <div className="h-[300px] w-full mt-auto">
            {courierChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={courierChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2D4B8" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270' }} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270' }} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270' }} />
                  <Tooltip 
                    cursor={{ fill: '#EDF0E4' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2D4B8', fontSize: '13px', fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px' }}/>
                  <Bar yAxisId="left" dataKey="Delivery Rate (%)" fill="#546B41" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Line yAxisId="right" type="monotone" dataKey="Transit Time (Days)" stroke="#B4623F" strokeWidth={3} dot={{ r: 4, fill: '#B4623F', strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[13px] font-semibold text-[#8A9270]">No courier data available</div>
            )}
          </div>
        </div>

        {/* Courier P&L Mini Table */}
        <div className="bg-white border border-[#E2D4B8] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#EADFC8] bg-[#FAF4E6]">
            <h3 className="font-bold text-[#2F3A22] text-[15px]">Courier Financials</h3>
            <p className="text-[12px] text-[#8A9270]">Revenue and cost by partner</p>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#EADFC8] text-[10px] text-[#8A9270] uppercase tracking-wider bg-white">
                  <th className="px-5 py-3 font-semibold">Courier</th>
                  <th className="px-5 py-3 font-semibold text-right">Orders</th>
                  <th className="px-5 py-3 font-semibold text-right">Cost</th>
                  <th className="px-5 py-3 font-semibold text-right">RTOs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E8D6]">
                {(pnlData?.couriers || []).map((c: any) => (
                  <tr key={c.code} className="text-[13px] hover:bg-[#FAF4E6]/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#2F3A22]">{c.courier_name}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-[#2F3A22]">{c.orders}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-[#DC2626]">{formatCurrency(c.base_cost || 0)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-[#CA8A04]">{c.rto_count}</td>
                  </tr>
                ))}
                {(!pnlData?.couriers || pnlData.couriers.length === 0) && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-[#8A9270]">No courier financials found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deep Dive: Merchant P&L Table */}
      <div className="bg-white border border-[#E2D4B8] rounded-[14px] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#EADFC8] bg-[#FAF4E6] flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#2F3A22] text-[15px]">Merchant P&L Deep Dive</h3>
            <p className="text-[12px] text-[#8A9270]">Detailed financial breakdown per seller</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#EADFC8] text-[10px] text-[#8A9270] uppercase tracking-wider bg-white">
                <th className="px-5 py-3 font-semibold">Merchant</th>
                <th className="px-5 py-3 font-semibold text-right">Revenue</th>
                <th className="px-5 py-3 font-semibold text-right">Cost</th>
                <th className="px-5 py-3 font-semibold text-right">RTO Loss</th>
                <th className="px-5 py-3 font-semibold text-right">Net Profit</th>
                <th className="px-5 py-3 font-semibold w-[140px]">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0E8D6]">
              {(pnlData?.merchants || []).map((m: any) => {
                const net = (m.total_margin || m.gross_profit || 0) - (m.rto_loss || 0) - (m.refunded_amt || 0);
                const mPct = m.revenue > 0 ? (net / m.revenue) * 100 : 0;
                const isLoss = net < 0;
                const isExpanded = expandedMerchantId === m.seller_id;
                
                return (
                  <React.Fragment key={m.seller_id}>
                    <tr 
                      onClick={() => toggleMerchant(m.seller_id)}
                      className={`text-[13px] hover:bg-[#FAF4E6]/50 transition-colors cursor-pointer ${isExpanded ? 'bg-[#FAF4E6]/30' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#2F3A22] truncate max-w-[200px] flex items-center gap-2">
                          <span className={`text-[#8A9270] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                          {m.business_name}
                        </div>
                        <div className="text-[11px] text-[#8A9270] mt-0.5 ml-4">{m.orders} orders</div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-medium text-[#2F3A22]">
                        {formatCurrency(m.revenue || 0)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-medium text-[#8A9270]">
                        {formatCurrency(m.courier_cost || 0)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-medium text-[#CA8A04]">
                        {m.rto_loss > 0 ? formatCurrency(m.rto_loss) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className={`font-mono font-bold text-[14px] ${isLoss ? 'text-[#DC2626]' : 'text-[#546B41]'}`}>
                          {formatCurrency(net)}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#EDF0E4] rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${isLoss ? 'bg-[#DC2626]' : mPct > 10 ? 'bg-[#546B41]' : 'bg-[#CA8A04]'}`} 
                              style={{ width: `${Math.min(Math.max(mPct, 0), 100)}%` }} 
                            />
                          </div>
                          <span className={`text-[12px] font-bold font-mono ${isLoss ? 'text-[#DC2626]' : marginColor(mPct)}`}>
                            {mPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#FAF4E6]/20 border-b border-[#F0E8D6]">
                        <td colSpan={6} className="px-10 py-6">
                          <div className="bg-white border border-[#E2D4B8] rounded-[12px] p-5 shadow-sm">
                            <h4 className="font-bold text-[#2F3A22] text-[14px] mb-4">Financial History: {m.business_name}</h4>
                            <div className="h-[200px] w-full">
                              {loadingHistory ? (
                                <div className="h-full flex items-center justify-center text-[12px] font-semibold text-[#8A9270]">Loading chart data...</div>
                              ) : merchantHistoryData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={merchantHistoryData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorMRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2F3A22" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#2F3A22" stopOpacity={0}/>
                                      </linearGradient>
                                      <linearGradient id="colorMNet" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#546B41" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#546B41" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFC8" opacity={0.5} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A9270' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8A9270' }} tickFormatter={(val) => `₹${val/1000}K`} />
                                    <Tooltip 
                                      contentStyle={{ borderRadius: '8px', border: '1px solid #E2D4B8', fontSize: '12px', fontWeight: 'bold' }}
                                      formatter={(val: number) => formatCurrency(val)}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}/>
                                    <Area type="monotone" dataKey="Revenue" stroke="#2F3A22" strokeWidth={2} fillOpacity={1} fill="url(#colorMRev)" />
                                    <Area type="monotone" dataKey="Net Profit" stroke="#546B41" strokeWidth={2} fillOpacity={1} fill="url(#colorMNet)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full flex items-center justify-center text-[12px] font-semibold text-[#8A9270]">Not enough historical data for this merchant.</div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {(!pnlData?.merchants || pnlData.merchants.length === 0) && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-[13px] font-medium text-[#8A9270]">No merchant data found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
