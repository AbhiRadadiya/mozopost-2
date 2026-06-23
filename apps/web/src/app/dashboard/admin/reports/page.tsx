'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, Btn, Badge } from '@/components/ui';

export default function AdminReportsPage() {
  const [couriers, setCouriers] = useState<any[]>([]);
  const [growth, setGrowth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/admin/courier-performance'),
      api.get('/reports/admin/merchant-growth'),
    ]).then(([c,g]) => { setCouriers(c.data.couriers); setGrowth(g.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm p-4">Loading...</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Platform Reports</h1>
        <Btn variant="default">⬇ Export All</Btn>
      </div>

      <h2 className="mb-3 font-bold">Courier Performance</h2>
      <Card>
        <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-black text-c3">
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Total Orders</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Delivered</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">NDR</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">RTO</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Delivery Rate</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Avg Transit</th>
        </tr></thead><tbody>
          {couriers.length === 0
            ? <tr><td colSpan={7} className="px-3 py-6 text-center text-[#777]">No courier data yet. Orders will appear here once placed.</td></tr>
            : couriers.map((c:any) => (
              <tr key={c.code} className="border-b border-[#eee]">
                <td className="px-3 py-2 font-bold">{c.name}</td>
                <td className="font-mono-nb px-3 py-2">{c.total_orders}</td>
                <td className="font-mono-nb px-3 py-2">{c.delivered}</td>
                <td className="font-mono-nb px-3 py-2">{c.ndr}</td>
                <td className="font-mono-nb px-3 py-2">{c.rto}</td>
                <td className="px-3 py-2">
                  <Badge color={(c.delivery_rate||0)>=85?'bg-c3':(c.delivery_rate||0)>=75?'bg-c4':'bg-c2 text-white'}>
                    {c.delivery_rate || '—'}%
                  </Badge>
                </td>
                <td className="font-mono-nb px-3 py-2">{c.avg_transit_days ? `${c.avg_transit_days}d` : '—'}</td>
              </tr>
            ))}
        </tbody></table></div>
      </Card>

      <h2 className="mb-3 mt-6 font-bold">Top Merchants</h2>
      <Card>
        <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-black text-c3">
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Orders</th>
          <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Revenue</th>
        </tr></thead><tbody>
          {(growth?.topMerchants||[]).length === 0
            ? <tr><td colSpan={3} className="px-3 py-6 text-center text-[#777]">No merchant data yet.</td></tr>
            : (growth?.topMerchants||[]).map((m:any) => (
              <tr key={m.business_name} className="border-b border-[#eee]">
                <td className="px-3 py-2 font-bold">{m.business_name}</td>
                <td className="font-mono-nb px-3 py-2">{m.orders}</td>
                <td className="font-mono-nb px-3 py-2 font-bold">₹{m.revenue?.toFixed(0)}</td>
              </tr>
            ))}
        </tbody></table></div>
      </Card>
    </div>
  );
}
