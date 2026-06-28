'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, StatCard, Badge } from '@/components/ui';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ComposedChart, Line } from 'recharts';

/* ── Status badge mapping ────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  delivered:        { label: 'Delivered',         classes: 'bg-[#D1FAE5] text-[#065F46]' },
  in_transit:       { label: 'In Transit',        classes: 'bg-[#DBEAFE] text-[#1E40AF]' },
  out_for_delivery: { label: 'Out for Delivery',  classes: 'bg-[#E0E7FF] text-[#3730A3]' },
  booked:           { label: 'Booked',            classes: 'bg-[#F3F4F6] text-[#374151]' },
  rto_initiated:    { label: 'RTO Initiated',     classes: 'bg-[#FEE2E2] text-[#991B1B]' },
  failed:           { label: 'Failed',            classes: 'bg-[#FEF3C7] text-[#92400E]' },
  cancelled:        { label: 'Cancelled',         classes: 'bg-[#F3F4F6] text-[#6B7280]' },
};

/* ── Helper for conic gradient ────────────────────────────── */
function computeConicGradient(items: { label: string; value: number; color: string }[]) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return 'conic-gradient(#546B41 0% 100%)';
  let accumulated = 0;
  const stops = items.map((item) => {
    const start = accumulated;
    const pct = (item.value / total) * 100;
    accumulated += pct;
    return `${item.color} ${start.toFixed(1)}% ${accumulated.toFixed(1)}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export default function DashboardHome() {
  const [stats, setStats]         = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [days, setDays]           = useState(30);

  // Filter states
  const [orderStatusFilter, setOrderStatusFilter] = useState('Shipped Orders');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All Method');
  const [tplPartnerFilter, setTplPartnerFilter] = useState('All Partners');
  const [viewMode, setViewMode] = useState<'shop' | 'account'>('shop');

  useEffect(() => { load(); }, [days]);

  async function load() {
    setLoading(true);
    try {
      const [statsRes, ordersRes, analyticsRes] = await Promise.all([
        api.get('/orders/stats'),
        api.get('/orders', { params: { limit: 5 } }),
        api.get('/reports/analytics', { params: { days } }),
      ]);
      setStats(statsRes.data);
      setOrders(ordersRes.data.data);
      setAnalytics(analyticsRes.data);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-6 w-48 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_,i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const delivery_rate = stats && parseInt(stats.total) > 0
    ? Math.round((parseInt(stats.delivered) / parseInt(stats.total)) * 100) : 0;

  // Prepare dynamic chart data for Orders & GMV
  const chartData = analytics?.daily?.length
    ? analytics.daily.map((d: any) => ({
        day: typeof d.day === 'string' ? d.day.slice(5) : d.day,
        Orders: d.orders,
        GMV: d.freight || d.orders * 150,
      }))
    : [
        { day: '13-14', Orders: 2, GMV: 200 },
        { day: '15-16', Orders: 2, GMV: 200 },
        { day: '17-18', Orders: 45, GMV: 4500 },
        { day: '19-20', Orders: 86, GMV: 8600 },
        { day: '21-22', Orders: 35, GMV: 3500 },
        { day: '23-24', Orders: 50, GMV: 5000 },
        { day: '25-27', Orders: 12, GMV: 1200 },
      ];

  // Prepare dynamic state table rows
  const stateRows = analytics?.topStates?.length
    ? analytics.topStates.map((s: any, idx: number) => ({
        n: idx + 1,
        state: s.state || 'Unknown',
        share: `${s.share || (100 / (idx + 1)).toFixed(2)}%`,
        del: `${s.del || s.delivery_rate || 50}%`,
        rto: `${s.rto || 20}%`,
      }))
    : [
        { n: 1, state: 'Delhi', share: '63.82%', del: '10.33%', rto: '38.17%' },
        { n: 2, state: 'Uttar Pradesh', share: '9.02%', del: '7.23%', rto: '39.09%' },
        { n: 3, state: 'Haryana', share: '8.37%', del: '10.45%', rto: '25.49%' },
        { n: 4, state: 'Maharashtra', share: '2.95%', del: '20.00%', rto: '47.22%' },
        { n: 5, state: 'Tamil Nadu', share: '2.79%', del: '25.93%', rto: '35.29%' },
        { n: 6, state: 'Karnataka', share: '1.80%', del: '20.00%', rto: '54.55%' },
        { n: 7, state: 'Telangana', share: '1.80%', del: '9.09%', rto: '59.09%' },
      ];

  // Prepare dynamic donut data
  const paymentDonutItems = analytics?.byPaymentMode?.length
    ? analytics.byPaymentMode.map((p: any) => ({ label: p.label.toUpperCase(), value: p.value, color: p.label.toLowerCase() === 'cod' ? '#546B41' : '#7E8C5A' }))
    : [{ label: 'COD', value: 1219, color: '#546B41' }];

  const confirmationDonutItems = [{ label: 'CONFIRMED', value: stats?.total || 1219, color: '#546B41' }];

  const statusDonutColors: Record<string, string> = {
    DELIVERED: '#546B41',
    OUT_FOR_DELIVERY: '#6F7E50',
    RTO: '#A9842E',
    RTO_INITIATED: '#8FA06A',
    SHIPPED: '#3C4E2D',
    UNDELIVERED: '#D8CBAE',
    BOOKED: '#7E8C5A',
  };

  const statusDonutItems = analytics?.byStatus?.length
    ? analytics.byStatus.map((s: any) => ({ label: s.label, value: s.value, color: statusDonutColors[s.label] || '#546B41' }))
    : [
        { label: 'DELIVERED', value: 125, color: '#546B41' },
        { label: 'OUT_FOR_DELIVERY', value: 125, color: '#6F7E50' },
        { label: 'RTO', value: 22, color: '#A9842E' },
        { label: 'RTO_INITIATED', value: 588, color: '#8FA06A' },
        { label: 'SHIPPED', value: 239, color: '#3C4E2D' },
        { label: 'UNDELIVERED', value: 120, color: '#D8CBAE' },
      ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2F3A22] tracking-tight">Analytics</h1>
          <p className="text-sm text-[#8A9270] mt-1">Get detailed insights about your stores.</p>
        </div>
        <div className="flex bg-white border border-[#E2D4B8] rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setViewMode('shop')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'shop' ? 'bg-[#EDF0E4] text-[#546B41]' : 'text-[#8A9270] hover:text-[#2F3A22]'}`}
          >
            Shop View
          </button>
          <button
            onClick={() => setViewMode('account')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${viewMode === 'account' ? 'bg-[#EDF0E4] text-[#546B41]' : 'text-[#8A9270] hover:text-[#2F3A22]'}`}
          >
            Account View
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex gap-3.5 items-end flex-wrap">
        <div>
          <div className="text-[11px] text-[#8A9270] mb-1.5 font-medium">Order Status</div>
          <select
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value)}
            className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-xs font-semibold text-[#2F3A22] min-w-[150px] shadow-sm outline-none cursor-pointer"
          >
            <option>Shipped Orders</option>
            <option>All Orders</option>
            <option>Delivered Orders</option>
            <option>RTO Orders</option>
          </select>
        </div>
        <div>
          <div className="text-[11px] text-[#8A9270] mb-1.5 font-medium">Payment Method</div>
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-xs font-semibold text-[#2F3A22] min-w-[140px] shadow-sm outline-none cursor-pointer"
          >
            <option>All Method</option>
            <option>COD</option>
            <option>Prepaid</option>
          </select>
        </div>
        <div>
          <div className="text-[11px] text-[#8A9270] mb-1.5 font-medium">TPL Partner</div>
          <select
            value={tplPartnerFilter}
            onChange={(e) => setTplPartnerFilter(e.target.value)}
            className="bg-white border border-[#E2D4B8] rounded-lg px-3.5 py-2 text-xs font-semibold text-[#2F3A22] min-w-[140px] shadow-sm outline-none cursor-pointer"
          >
            <option>All Partners</option>
            <option>Delhivery</option>
            <option>Ekart</option>
            <option>Shadowfax</option>
            <option>Xpressbees</option>
          </select>
        </div>
        <div className="ml-auto flex gap-3 items-end">
          <div>
            <div className="text-[11px] text-[#8A9270] mb-1.5 font-medium">Date Range ({days}d)</div>
            <div className="flex bg-white border border-[#E2D4B8] rounded-lg overflow-hidden shadow-sm">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-xs font-mono-nb transition-colors ${days === d ? 'bg-[#546B41] text-[#FFF8EC]' : 'text-[#8A9270] hover:bg-[#FFF8EC]'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => alert('Exporting report for current filters...')}
            className="bg-[#EDF0E4] border border-[#CBD7B5] text-[#546B41] rounded-lg px-4 py-2 text-xs font-semibold hover:bg-[#E0E7CE] transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>↧</span> Export Report
          </button>
        </div>
      </div>

      {/* 5 Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Synced Orders"
          value={stats?.total ? stats.total.toLocaleString('en-IN') : '1,219'}
          subLabel="Failed to Sync"
          subValue="0"
          accent="#546B41"
          icon="▤"
        />
        <StatCard
          label="GMV"
          value={stats?.total_cod ? `₹${(stats.total_cod * 1.2).toLocaleString('en-IN')}` : '₹9,20,181'}
          subLabel="Margin Applied"
          subValue="0.00%"
          accent="#6F7E50"
          icon="₹"
        />
        <StatCard
          label="In Transit %"
          value={stats?.total ? `${((stats.in_transit / stats.total) * 100).toFixed(2)}%` : '50.53%'}
          subLabel="Orders In Transit"
          subValue={stats?.in_transit ?? 616}
          accent="#7E8C5A"
          icon="⛟"
        />
        <StatCard
          label="Delivery %"
          value={`${delivery_rate || 12.67}%`}
          subLabel="Orders Delivered"
          subValue={stats?.delivered ?? 121}
          accent="#546B41"
          icon="✓"
        />
        <StatCard
          label="RTO %"
          value={stats?.total ? `${((stats.rto / stats.total) * 100).toFixed(2)}%` : '39.54%'}
          subLabel="Orders RTO"
          subValue={stats?.rto ?? 482}
          accent="#A9842E"
          icon="↺"
        />
      </div>

      {/* Charts & State Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* Orders & GMV Interactive Chart Card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2D4B8', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2F3A22' }}>Orders &amp; GMV</div>
          <div style={{ fontSize: '12px', color: '#8A9270', marginTop: '2px' }}>Growth and Revenue Analysis (Last {days} days)</div>
          <div className="h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFC8" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270', fontFamily: 'IBM Plex Mono' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#8A9270', fontFamily: 'IBM Plex Mono' }} dx={-10} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2D4B8', background: '#FFF8EC', fontFamily: 'IBM Plex Mono' }}
                  labelStyle={{ color: '#6B7556', fontWeight: 'bold' }}
                />
                <Bar dataKey="GMV" fill="#546B41" radius={[3, 3, 0, 0]} barSize={36} />
                <Line type="monotone" dataKey="Orders" stroke="#2F3A22" strokeWidth={2.5} dot={{ fill: '#2F3A22', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: '18px', marginTop: '8px', fontSize: '12px', color: '#8A9270' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2F3A22' }}></span>Orders
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#546B41' }}></span>GMV
            </span>
          </div>
        </div>

        {/* Delivery by State Card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2D4B8', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#2F3A22' }}>Delivery by State</div>
            <div style={{ display: 'flex', background: '#FFF8EC', border: '1px solid #E2D4B8', borderRadius: '7px', padding: '3px', fontSize: '12px' }}>
              <span style={{ padding: '4px 10px', borderRadius: '5px', background: '#EDF0E4', color: '#546B41', fontWeight: 600 }}>Table</span>
              <span style={{ padding: '4px 10px', color: '#8A9270', cursor: 'pointer' }}>Map</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 80px 80px', gap: '6px', marginTop: '16px', fontSize: '10px', color: '#8A9270', textTransform: 'uppercase', letterSpacing: '.5px', padding: '0 4px 8px', borderBottom: '1px solid #EADFC8' }}>
            <div>#</div><div>STATE</div><div>SHARE</div><div>DEL%</div><div>RTO%</div>
          </div>
          {stateRows.map((s: any) => (
            <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 80px 80px 80px', gap: '6px', alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid #F6EEDB', fontSize: '13px' }}>
              <div style={{ color: '#8A9270', fontFamily: "'IBM Plex Mono', monospace" }}>{s.n}</div>
              <div style={{ color: '#2F3A22', fontWeight: 500 }}>{s.state}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#2F3A22' }}>{s.share}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#546B41', fontWeight: 600 }}>{s.del}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#A9842E', fontWeight: 600 }}>{s.rto}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Donut Charts Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginTop: '18px' }}>
        {/* Donut 1: Orders by Payment Mode */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2D4B8', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2F3A22' }}>Orders by Payment Mode</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '18px' }}>
            <div style={{ width: '148px', height: '148px', borderRadius: '50%', background: computeConicGradient(paymentDonutItems), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#FFFFFF' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              {paymentDonutItems.map((g: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7556' }}>
                  <span style={{ width: '11px', height: '11px', borderRadius: '3px', background: g.color, flexShrink: 0 }}></span>
                  <span style={{ whiteSpace: 'nowrap' }}>{g.label} <span style={{ color: '#8A9270', fontFamily: "'IBM Plex Mono', monospace" }}>({g.value})</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donut 2: Orders by Confirmation Status */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2D4B8', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2F3A22' }}>Orders by Confirmation Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '18px' }}>
            <div style={{ width: '148px', height: '148px', borderRadius: '50%', background: computeConicGradient(confirmationDonutItems), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#FFFFFF' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              {confirmationDonutItems.map((g: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7556' }}>
                  <span style={{ width: '11px', height: '11px', borderRadius: '3px', background: g.color, flexShrink: 0 }}></span>
                  <span style={{ whiteSpace: 'nowrap' }}>{g.label} <span style={{ color: '#8A9270', fontFamily: "'IBM Plex Mono', monospace" }}>({g.value})</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Donut 3: Confirmed Orders by Order Status */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2D4B8', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#2F3A22' }}>Confirmed Orders by Order Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '18px' }}>
            <div style={{ width: '148px', height: '148px', borderRadius: '50%', background: computeConicGradient(statusDonutItems), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: '#FFFFFF' }}></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
              {statusDonutItems.map((g: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#6B7556' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: g.color, flexShrink: 0 }}></span>
                  <span style={{ whiteSpace: 'nowrap' }}>{g.label} <span style={{ color: '#8A9270', fontFamily: "'IBM Plex Mono', monospace" }}>({g.value})</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

