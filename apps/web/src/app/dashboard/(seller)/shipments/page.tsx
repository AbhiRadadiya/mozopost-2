'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, Badge } from '@/components/ui';

const STATUS_COLOR: Record<string,string> = {
  delivered:'bg-c3',in_transit:'bg-c1',out_for_delivery:'bg-c1',
  booked:'bg-c5',unprocessed:'bg-c5',rto_initiated:'bg-c2 text-white',
  rto_in_transit:'bg-c2 text-white',failed:'bg-c4',cancelled:'bg-[#999] text-white',
};

export default function ShipmentsPage() {
  const searchParams = useSearchParams();
  const defaultStatus = searchParams.get('status') || '';
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [status, setStatus] = useState(defaultStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [status]);

  async function load() {
    setLoading(true);
    try {
      const [ordRes, statsRes] = await Promise.all([
        api.get('/orders', { params: { limit: 20, ...(status ? { status } : {}) } }),
        api.get('/orders/stats'),
      ]);
      setOrders(ordRes.data.data);
      setStats(statsRes.data);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Shipments</h1>
        <Btn variant="default" onClick={load}>↻ Refresh</Btn>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { label:'In Transit', val:stats.in_transit, bg:'bg-c1', s:'in_transit' },
            { label:'Delivered',  val:stats.delivered,  bg:'bg-c3', s:'delivered' },
            { label:'RTO',        val:stats.rto,         bg:'bg-c2 text-white', s:'rto_initiated' },
            { label:'NDR/Failed', val:stats.failed||0,   bg:'bg-c4', s:'failed' },
            { label:'Cancelled',  val:stats.cancelled,   bg:'bg-[#555] text-white', s:'cancelled' },
          ].map(card => (
            <button key={card.s} onClick={() => setStatus(s => s===card.s ? '' : card.s)}
              className={`nb-card p-3 text-left cursor-pointer ${status===card.s?'ring-2 ring-black':''} ${card.bg}`}>
              <div className="font-mono-nb text-[8px] uppercase opacity-70">{card.label}</div>
              <div className="font-mono-nb text-xl font-bold">{card.val ?? '—'}</div>
            </button>
          ))}
        </div>
      )}

      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">{error}</div>}

      <Card>
        <div className="flex items-center justify-between border-b-2 border-black bg-black px-4 py-2.5 text-white">
          <span className="font-bold text-sm">{status ? status.replace(/_/g,' ').toUpperCase() : 'ALL SHIPMENTS'}</span>
          {status && <button onClick={() => setStatus('')} className="text-xs text-[#888] underline">Clear filter</button>}
        </div>
        {loading ? <div className="p-4 text-sm">Loading...</div>
        : orders.length === 0 ? <div className="p-6 text-center text-sm text-[#777]">No shipments found.</div>
        : (
          <div className="overflow-auto">
            <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order ID</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">AWB</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Consignee</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Route</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Wt</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Freight</th>
            </tr></thead><tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-[#eee] hover:bg-[#fffbeb]">
                  <td className="font-mono-nb px-3 py-2 font-bold">{o.mozopost_order_id}</td>
                  <td className="font-mono-nb px-3 py-2">{o.awb_number || '—'}</td>
                  <td className="px-3 py-2">{o.consignee_name}</td>
                  <td className="px-3 py-2 text-[#777]">{o.consignee_city}, {o.consignee_state}</td>
                  <td className="px-3 py-2">{o.courier_name || '—'}</td>
                  <td className="font-mono-nb px-3 py-2">{o.billed_weight_kg}kg</td>
                  <td className="px-3 py-2"><Badge color={STATUS_COLOR[o.status]||'bg-c5'}>{o.status.replace(/_/g,' ')}</Badge></td>
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
