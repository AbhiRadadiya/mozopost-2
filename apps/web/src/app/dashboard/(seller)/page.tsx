'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, StatCard, Badge } from '@/components/ui';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

/* ── Stat card config ────────────────────────────────────── */
const STAT_ICON = (path: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {path.split('M').filter(Boolean).map((seg, i) => <path key={i} d={`M${seg}`} />)}
  </svg>
);

/* ── Bar color palette ───────────────────────────────────── */
const BAR_COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899'];

/* ── Greeting helper ─────────────────────────────────────── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Empty state ─────────────────────────────────────────── */
function EmptyState({ message, link }: { message: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="1.75">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-sm text-[#94A3B8] mb-2">{message}</p>
      {link && (
        <Link href={link.href} className="text-sm font-semibold text-[#4F46E5] hover:underline">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function DashboardHome() {
  const [stats, setStats]       = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [days, setDays]         = useState(30);

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

  /* ── Loading skeleton ── */
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
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-52 rounded-xl" />
          <div className="skeleton h-52 rounded-xl" />
        </div>
      </div>
    );
  }

  const delivery_rate = stats && parseInt(stats.total) > 0
    ? Math.round((parseInt(stats.delivered) / parseInt(stats.total)) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">{greeting()},</h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">Here's what's happening with your shipments today.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex items-center bg-white border border-[#E5E8EF] rounded-lg overflow-hidden shadow-sm">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 text-xs font-semibold transition-colors ${
                  days === d
                    ? 'bg-[#4F46E5] text-white'
                    : 'text-[#64748B] hover:bg-[#F4F6F9]'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Btn variant="primary" onClick={() => window.location.href = '/dashboard/orders'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 4v16m8-8H4" />
            </svg>
            New Order
          </Btn>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={stats?.total ?? 0}
          accent="#4F46E5"
          icon={STAT_ICON('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2')}
        />
        <StatCard
          label="In Transit"
          value={stats?.in_transit ?? 0}
          accent="#3B82F6"
          icon={STAT_ICON('M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12h12l1-12')}
        />
        <StatCard
          label="Delivered"
          value={stats?.delivered ?? 0}
          accent="#10B981"
          icon={STAT_ICON('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')}
        />
        <StatCard
          label="Delivery Rate"
          value={`${delivery_rate}%`}
          accent={delivery_rate >= 85 ? '#10B981' : delivery_rate >= 70 ? '#F59E0B' : '#EF4444'}
          icon={STAT_ICON('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z')}
        />
      </div>

      {/* ── Finance cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="RTO"
          value={stats?.rto ?? 0}
          accent="#EF4444"
          icon={STAT_ICON('M3 3l18 18M10.5 6H5a2 2 0 00-2 2v10c0 1.1.9 2 2 2h10a2 2 0 002-2v-5.5')}
        />
        <StatCard
          label="Total Freight"
          value={`₹${(stats?.total_freight || 0).toFixed(0)}`}
          accent="#F59E0B"
          icon={STAT_ICON('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z')}
        />
        <StatCard
          label="COD Volume"
          value={`₹${(stats?.total_cod || 0).toFixed(0)}`}
          accent="#8B5CF6"
          icon={STAT_ICON('M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z')}
        />
        <StatCard
          label="Upcoming COD"
          value={`₹${(analytics?.futureCod?.upcoming_cod || 0).toFixed(0)}`}
          accent="#10B981"
          icon={STAT_ICON('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z')}
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Order performance chart */}
        <Card>
          <CardHead>
            <div>
              <div className="text-sm font-semibold text-[#0F172A]">Order Performance</div>
              <div className="text-xs text-[#94A3B8] mt-0.5">Last {days} days</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4F46E5] inline-block" />Daily
              </span>
            </div>
          </CardHead>
          <div className="p-5 h-64">
            {!analytics?.daily?.length ? (
              <EmptyState message="No order data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.daily} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F7" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94A3B8' }} 
                    dy={10}
                    minTickGap={20}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#94A3B8' }} 
                    dx={-10}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#E5E8EF', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E8EF', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ color: '#64748B', fontSize: '12px', marginBottom: '4px' }}
                    itemStyle={{ color: '#4F46E5', fontSize: '14px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="orders" name="Orders" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Courier performance */}
        <Card>
          <CardHead>
            <div>
              <div className="text-sm font-semibold text-[#0F172A]">Courier Performance</div>
              {analytics?.bestCourier && (
                <div className="text-xs text-[#94A3B8] mt-0.5">
                  ⭐ Best: <span className="font-semibold text-[#0F172A]">{analytics.bestCourier.courier_name}</span>
                </div>
              )}
            </div>
          </CardHead>
          <div className="p-5 h-64">
            {!analytics?.byCourier?.length ? (
              <EmptyState message="No courier data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byCourier} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F3F7" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="courier_name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8F9FB' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E8EF', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="delivery_rate" name="Delivery Rate (%)" radius={[0, 4, 4, 0]} barSize={24}>
                    {analytics.byCourier.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* ── Location tables ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Top states */}
        <Card noPad>
          <CardHead>
            <div className="text-sm font-semibold text-[#0F172A]">Top States</div>
          </CardHead>
          {!analytics?.topStates?.length ? (
            <EmptyState message="No data yet" />
          ) : (
            <table className="pro-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th>Orders</th>
                  <th>Del. Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topStates.map((s: any) => (
                  <tr key={s.state}>
                    <td className="font-medium">{s.state}</td>
                    <td className="font-mono-nb text-[#475569]">{s.orders}</td>
                    <td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-mono-nb ${
                          (s.delivery_rate || 0) >= 85
                            ? 'bg-[#D1FAE5] text-[#065F46]'
                            : (s.delivery_rate || 0) >= 70
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : 'bg-[#FEE2E2] text-[#991B1B]'
                        }`}
                      >
                        {s.delivery_rate || 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Top cities */}
        <Card noPad>
          <CardHead>
            <div className="text-sm font-semibold text-[#0F172A]">Top Cities</div>
          </CardHead>
          {!analytics?.topCities?.length ? (
            <EmptyState message="No data yet" />
          ) : (
            <table className="pro-table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>State</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topCities.map((c: any) => (
                  <tr key={`${c.city}-${c.state}`}>
                    <td className="font-medium">{c.city}</td>
                    <td className="text-[#94A3B8]">{c.state}</td>
                    <td className="font-mono-nb text-[#475569]">{c.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── Recent orders ── */}
      <Card noPad>
        <CardHead>
          <div className="text-sm font-semibold text-[#0F172A]">Recent Orders</div>
          <Link
            href="/dashboard/orders"
            className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338CA] transition-colors"
          >
            View all →
          </Link>
        </CardHead>
        {orders.length === 0 ? (
          <EmptyState
            message="No orders yet."
            link={{ href: '/dashboard/orders', label: 'Create your first order' }}
          />
        ) : (
          <table className="pro-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Destination</th>
                <th>Courier</th>
                <th>Status</th>
                <th>Freight</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const s = STATUS_MAP[o.status] || { label: o.status, classes: 'bg-[#F3F4F6] text-[#374151]' };
                return (
                  <tr key={o.id}>
                    <td>
                      <span className="font-mono-nb text-xs font-semibold text-[#4F46E5] bg-[#EEF2FF] px-2 py-0.5 rounded">
                        {o.mozopost_order_id}
                      </span>
                    </td>
                    <td className="text-[#475569]">{o.consignee_city}, {o.consignee_state}</td>
                    <td className="text-[#475569]">{o.courier_name || '—'}</td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.classes}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="font-mono-nb font-semibold text-[#0F172A]">
                      ₹{parseFloat(o.total_freight).toFixed(0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
