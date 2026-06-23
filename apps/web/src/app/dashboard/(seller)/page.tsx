'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, StatCard, Badge } from '@/components/ui';

interface Stats {
  unprocessed: string;
  picked: string;
  in_transit: string;
  delivered: string;
  rto: string;
  cancelled: string;
  total: string;
  total_freight: number;
  total_cod: number;
}

interface OrderRow {
  id: string;
  mozopost_order_id: string;
  awb_number: string | null;
  consignee_city: string;
  consignee_state: string;
  courier_name: string | null;
  status: string;
  total_freight: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  delivered: 'bg-c3 text-black',
  in_transit: 'bg-c1 text-black',
  out_for_delivery: 'bg-c1 text-black',
  booked: 'bg-c5 text-black',
  unprocessed: 'bg-c5 text-black',
  rto_initiated: 'bg-c2 text-white',
  rto_in_transit: 'bg-c2 text-white',
  cancelled: 'bg-[#999] text-white',
};

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          api.get('/orders/stats'),
          api.get('/orders', { params: { limit: 6 } }),
        ]);
        setStats(statsRes.data);
        setOrders(ordersRes.data.data);
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="font-mono-nb text-sm">Loading dashboard...</div>;
  if (error)
    return (
      <div className="border-2 border-black bg-c2 p-4 font-bold text-white shadow-nb">⚠ {error}</div>
    );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <Link href="/dashboard/orders">
          <Btn variant="success">+ New Order</Btn>
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Total Orders" value={stats?.total ?? 0} bg="bg-black text-white" />
        <StatCard label="Unprocessed" value={stats?.unprocessed ?? 0} bg="bg-c4" />
        <StatCard label="In Transit" value={stats?.in_transit ?? 0} bg="bg-c1" />
        <StatCard label="Delivered" value={stats?.delivered ?? 0} bg="bg-c3" />
        <StatCard label="RTO" value={stats?.rto ?? 0} bg="bg-c2 text-white" />
        <StatCard label="Cancelled" value={stats?.cancelled ?? 0} bg="bg-[#555] text-white" />
        <StatCard label="Freight (₹)" value={(stats?.total_freight ?? 0).toFixed(0)} bg="bg-c5" />
        <StatCard label="COD Collected (₹)" value={(stats?.total_cod ?? 0).toFixed(0)} bg="bg-c3" />
      </div>

      <Card>
        <CardHead className="bg-black text-white">
          <span className="text-sm font-bold">Recent Orders</span>
          <Link href="/dashboard/orders" className="text-xs font-bold underline">
            View all →
          </Link>
        </CardHead>
        {orders.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#777]">
            No orders yet.{' '}
            <Link href="/dashboard/orders" className="font-bold underline">
              Create your first order
            </Link>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order ID</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">AWB</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Route</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">₹</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[#eee] hover:bg-[#fffbeb]">
                    <td className="font-mono-nb px-3 py-2 font-bold">{o.mozopost_order_id}</td>
                    <td className="font-mono-nb px-3 py-2">{o.awb_number || '—'}</td>
                    <td className="px-3 py-2">
                      {o.consignee_city}, {o.consignee_state}
                    </td>
                    <td className="px-3 py-2">{o.courier_name || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge color={STATUS_COLORS[o.status] || 'bg-c5'}>{o.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="font-mono-nb px-3 py-2 font-bold">₹{o.total_freight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
