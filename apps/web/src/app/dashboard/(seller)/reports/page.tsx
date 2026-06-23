'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

export default function ReportsPage() {
  const [shipments, setShipments] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [s,w] = await Promise.all([
          api.get('/reports/shipments'),
          api.get('/reports/wallet'),
        ]);
        setShipments(s.data);
        setWallet(w.data);
      } catch (err) { setError(apiErrorMessage(err)); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return <div className="p-4 text-sm">Loading reports...</div>;
  if (error) return <div className="border-2 border-black bg-c2 p-4 font-bold text-white">{error}</div>;

  const s = shipments?.summary;
  const w = wallet?.summary;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Reports & Analytics</h1>
        <Btn variant="default">⬇ Export</Btn>
      </div>

      <h2 className="mb-3 font-bold">Shipment Summary</h2>
      <div className="grid grid-cols-4 gap-2 mb-5">
        <div className="nb-card p-3 bg-black text-white"><div className="font-mono-nb text-[8px] uppercase opacity-70">Total Orders</div><div className="font-mono-nb text-2xl font-bold">{s?.total ?? '—'}</div></div>
        <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Delivered</div><div className="font-mono-nb text-2xl font-bold">{s?.delivered ?? '—'}</div></div>
        <div className="nb-card p-3 bg-c2 text-white"><div className="font-mono-nb text-[8px] uppercase">RTO</div><div className="font-mono-nb text-2xl font-bold">{s?.rto ?? '—'}</div></div>
        <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Delivery Rate</div><div className="font-mono-nb text-2xl font-bold">{s?.delivery_rate ?? '—'}%</div></div>
        <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">RTO Rate</div><div className="font-mono-nb text-2xl font-bold">{s?.rto_rate ?? '—'}%</div></div>
        <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Total Freight</div><div className="font-mono-nb text-xl font-bold">₹{s?.total_freight?.toFixed(0) ?? '—'}</div></div>
        <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">COD Volume</div><div className="font-mono-nb text-xl font-bold">₹{s?.total_cod?.toFixed(0) ?? '—'}</div></div>
        <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">NDR</div><div className="font-mono-nb text-2xl font-bold">{s?.ndr ?? '—'}</div></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">📊 Courier Performance</span></CardHead>
          <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-black text-c3">
            <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
            <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Orders</th>
            <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Delivered</th>
            <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Freight ₹</th>
          </tr></thead><tbody>
            {shipments?.byCourier?.length === 0
              ? <tr><td colSpan={4} className="px-3 py-4 text-center text-[#777]">No data yet</td></tr>
              : (shipments?.byCourier || []).map((c: any) => (
                <tr key={c.code} className="border-b border-[#eee]">
                  <td className="px-3 py-2 font-bold">{c.courier_name}</td>
                  <td className="font-mono-nb px-3 py-2">{c.orders}</td>
                  <td className="font-mono-nb px-3 py-2">{c.delivered}</td>
                  <td className="font-mono-nb px-3 py-2">₹{c.freight?.toFixed(0)}</td>
                </tr>
              ))}
          </tbody></table></div>
        </Card>

        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">💰 Wallet Summary</span></CardHead>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="nb-card p-2.5 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Total Credits</div><div className="font-mono-nb text-lg font-bold">₹{w?.total_credits?.toFixed(0) ?? '—'}</div></div>
              <div className="nb-card p-2.5 bg-c2 text-white"><div className="font-mono-nb text-[8px] uppercase">Total Debits</div><div className="font-mono-nb text-lg font-bold">₹{w?.total_debits?.toFixed(0) ?? '—'}</div></div>
              <div className="nb-card p-2.5 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Refunds</div><div className="font-mono-nb text-lg font-bold">₹{w?.total_refunds?.toFixed(0) ?? '—'}</div></div>
              <div className="nb-card p-2.5 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Transactions</div><div className="font-mono-nb text-lg font-bold">{w?.total_transactions ?? '—'}</div></div>
            </div>
            <h3 className="font-bold text-sm mb-2">Monthly Breakdown</h3>
            {wallet?.monthly?.length === 0
              ? <div className="text-sm text-[#777]">No data yet</div>
              : (wallet?.monthly || []).slice(0,6).map((m: any) => (
                <div key={m.month} className="flex items-center justify-between py-1.5 border-b border-[#eee] text-xs">
                  <span className="font-mono-nb font-bold">{m.month}</span>
                  <span className="text-green-700 font-mono-nb font-bold">+₹{m.credits?.toFixed(0)}</span>
                  <span className="text-c2 font-mono-nb font-bold">-₹{m.debits?.toFixed(0)}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
