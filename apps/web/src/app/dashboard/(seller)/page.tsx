'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, StatCard, Badge } from '@/components/ui';

const STATUS_COLORS: Record<string,string> = {
  delivered:'bg-c3 text-black', in_transit:'bg-c1 text-black',
  out_for_delivery:'bg-c1 text-black', booked:'bg-c5 text-black',
  rto_initiated:'bg-c2 text-white', failed:'bg-c4 text-black',
  cancelled:'bg-[#999] text-white',
};

const BAR_COLOR = (i: number) => ['bg-c1','bg-c3','bg-c4','bg-c2','bg-c5','bg-[#88ee88]','bg-[#ffaaee]'][i % 7];

export default function DashboardHome() {
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

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

  if (loading) return <div className="font-mono-nb text-sm">Loading dashboard...</div>;

  const delivery_rate = stats && parseInt(stats.total) > 0
    ? Math.round((parseInt(stats.delivered) / parseInt(stats.total)) * 100) : 0;

  const maxOrders = analytics?.daily?.length
    ? Math.max(...analytics.daily.map((d: any) => d.orders), 1) : 1;

  return (
    <div>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {[7,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`border-2 border-black px-3 py-1 text-xs font-bold font-mono-nb ${days===d?'bg-black text-white shadow-nb-sm':'bg-white hover:bg-[#f5f5f5]'}`}>
              {d}d
            </button>
          ))}
          <Btn variant="success" onClick={() => window.location.href='/dashboard/orders'}>+ New Order</Btn>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <StatCard label="Total Orders" value={stats?.total ?? 0} bg="bg-black text-white" />
        <StatCard label="In Transit"   value={stats?.in_transit ?? 0} bg="bg-c1" />
        <StatCard label="Delivered"    value={stats?.delivered ?? 0} bg="bg-c3" />
        <StatCard label="RTO"          value={stats?.rto ?? 0} bg="bg-c2 text-white" />
        <StatCard label="Delivery Rate" value={`${delivery_rate}%`} bg={delivery_rate>=85?'bg-c3':delivery_rate>=70?'bg-c4':'bg-c2 text-white'} />
        <StatCard label="Total Freight" value={`₹${(stats?.total_freight||0).toFixed(0)}`} bg="bg-c5" />
        <StatCard label="COD Volume"   value={`₹${(stats?.total_cod||0).toFixed(0)}`} bg="bg-c4" />
        <StatCard label="Upcoming COD" value={`₹${(analytics?.futureCod?.upcoming_cod||0).toFixed(0)}`} bg="bg-c3" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Order performance chart */}
        <Card>
          <CardHead className="bg-black text-white">
            <span className="font-bold text-sm">📊 Order Performance ({days}d)</span>
          </CardHead>
          <div className="p-4">
            {!analytics?.daily?.length ? (
              <div className="py-8 text-center text-sm text-[#777]">No order data yet</div>
            ) : (
              <div className="flex items-end gap-1 h-28 overflow-hidden">
                {analytics.daily.slice(-20).map((d: any, i: number) => {
                  const h = Math.round((d.orders / maxOrders) * 100);
                  return (
                    <div key={d.day} className="flex flex-col items-center flex-1 min-w-0 group relative">
                      <div className="w-full bg-c1 border border-[#000]" style={{ height: `${h}%`, minHeight: 2 }} />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-black text-white text-[9px] font-mono-nb px-1.5 py-0.5 border border-c3 z-10 whitespace-nowrap">
                        {d.day}: {d.orders} orders
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-2 flex gap-3 text-[9px] font-mono-nb font-bold">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-c3 inline-block border border-black" />Delivered</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-c2 inline-block border border-black" />RTO</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-c1 inline-block border border-black" />Total</span>
            </div>
          </div>
        </Card>

        {/* Courier performance */}
        <Card>
          <CardHead className="bg-black text-white">
            <span className="font-bold text-sm">🚚 Courier Performance</span>
            {analytics?.bestCourier && (
              <Badge color="bg-c3 text-black">⭐ Best: {analytics.bestCourier.courier_name}</Badge>
            )}
          </CardHead>
          <div className="p-4">
            {!analytics?.byCourier?.length ? (
              <div className="py-8 text-center text-sm text-[#777]">No courier data yet</div>
            ) : analytics.byCourier.map((c: any, i: number) => (
              <div key={c.code} className="mb-2">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-bold">{c.courier_name}</span>
                  <span className="font-mono-nb">{c.delivery_rate || 0}% · {c.orders} orders</span>
                </div>
                <div className="h-3 bg-[#eee] border border-[#ccc] rounded-sm overflow-hidden">
                  <div className={`h-full ${BAR_COLOR(i)}`} style={{ width: `${c.delivery_rate || 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Top states */}
        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold text-sm">📍 Top States</span></CardHead>
          {!analytics?.topStates?.length ? (
            <div className="p-4 text-sm text-[#777]">No data yet</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-c5">
                <th className="px-3 py-1.5 text-left font-mono-nb text-[9px] uppercase">State</th>
                <th className="px-3 py-1.5 text-left font-mono-nb text-[9px] uppercase">Orders</th>
                <th className="px-3 py-1.5 text-left font-mono-nb text-[9px] uppercase">Del. Rate</th>
              </tr></thead><tbody>
                {analytics.topStates.map((s: any) => (
                  <tr key={s.state} className="border-b border-[#eee]">
                    <td className="px-3 py-1.5 font-bold">{s.state}</td>
                    <td className="font-mono-nb px-3 py-1.5">{s.orders}</td>
                    <td className="px-3 py-1.5">
                      <Badge color={(s.delivery_rate||0)>=85?'bg-c3':(s.delivery_rate||0)>=70?'bg-c4':'bg-c2 text-white'}>
                        {s.delivery_rate||0}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </Card>

        {/* Top cities */}
        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold text-sm">🏙 Top Cities</span></CardHead>
          {!analytics?.topCities?.length ? (
            <div className="p-4 text-sm text-[#777]">No data yet</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-c5">
                <th className="px-3 py-1.5 text-left font-mono-nb text-[9px] uppercase">City</th>
                <th className="px-3 py-1.5 text-left font-mono-nb text-[9px] uppercase">State</th>
                <th className="px-3 py-1.5 text-left font-mono-nb text-[9px] uppercase">Orders</th>
              </tr></thead><tbody>
                {analytics.topCities.map((c: any) => (
                  <tr key={`${c.city}-${c.state}`} className="border-b border-[#eee]">
                    <td className="px-3 py-1.5 font-bold">{c.city}</td>
                    <td className="px-3 py-1.5 text-[#777]">{c.state}</td>
                    <td className="font-mono-nb px-3 py-1.5">{c.orders}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHead className="bg-black text-white">
          <span className="font-bold text-sm">📋 Recent Orders</span>
          <Link href="/dashboard/orders/all" className="text-xs font-bold text-c3 underline">View all →</Link>
        </CardHead>
        {orders.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#777]">
            No orders yet. <Link href="/dashboard/orders" className="font-bold underline">Create your first order</Link>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order ID</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Consignee</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">₹</th>
            </tr></thead><tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-[#eee] hover:bg-[#fffbeb]">
                  <td className="font-mono-nb px-3 py-2 font-bold">{o.mozopost_order_id}</td>
                  <td className="px-3 py-2">{o.consignee_city}, {o.consignee_state}</td>
                  <td className="px-3 py-2">{o.courier_name || '—'}</td>
                  <td className="px-3 py-2"><Badge color={STATUS_COLORS[o.status]||'bg-c5'}>{o.status.replace(/_/g,' ')}</Badge></td>
                  <td className="font-mono-nb px-3 py-2 font-bold">₹{parseFloat(o.total_freight).toFixed(0)}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
      </Card>
    </div>
  );
}
