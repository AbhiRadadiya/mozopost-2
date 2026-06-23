'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, Badge } from '@/components/ui';

const STATUSES = ['all','unprocessed','booked','in_transit','out_for_delivery','delivered','rto_initiated','failed','cancelled'];
const STATUS_COLOR: Record<string,string> = {
  delivered: 'bg-c3', in_transit: 'bg-c1', out_for_delivery: 'bg-c1',
  booked: 'bg-c5', unprocessed: 'bg-c5',
  rto_initiated: 'bg-c2 text-white', rto_in_transit: 'bg-c2 text-white',
  failed: 'bg-c4', cancelled: 'bg-[#999] text-white',
};

export default function AllOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [status, page]);

  async function load() {
    setLoading(true);
    try {
      const params: any = { limit: 20, page };
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const { data } = await api.get('/orders', { params });
      setOrders(data.data);
      setMeta(data.meta);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">All Orders</h1>
        <div className="flex gap-2">
          <input className="nb-input w-48 text-xs" placeholder="Search AWB, order ID..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && load()} />
          <Btn variant="default" onClick={load}>🔍</Btn>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUSES.map(s => (
          <button key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`border-2 border-black px-3 py-1 text-[10px] font-bold font-mono-nb uppercase transition-all ${
              status === s ? 'bg-black text-white shadow-nb' : 'bg-white text-black hover:bg-[#f5f5f5]'
            }`}
          >{s.replace('_',' ')}</button>
        ))}
      </div>

      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">{error}</div>}

      <Card>
        {loading ? <div className="p-4 text-sm">Loading...</div>
        : orders.length === 0 ? <div className="p-6 text-center text-sm text-[#777]">No orders found.</div>
        : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-black text-c3">
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order ID</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Consignee</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Destination</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">AWB</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Payment</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Freight</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Date</th>
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-[#eee] hover:bg-[#fffbeb]">
                    <td className="font-mono-nb px-3 py-2 font-bold">{o.mozopost_order_id}</td>
                    <td className="px-3 py-2"><div>{o.consignee_name}</div><div className="text-[#777]">{o.consignee_phone}</div></td>
                    <td className="px-3 py-2">{o.consignee_city}, {o.consignee_state}</td>
                    <td className="font-mono-nb px-3 py-2">{o.awb_number || '—'}</td>
                    <td className="px-3 py-2">{o.courier_name || '—'}</td>
                    <td className="px-3 py-2"><Badge color="bg-c5">{o.payment_mode}</Badge>
                      {o.cod_amount > 0 && <div className="font-mono-nb text-[9px]">₹{parseFloat(o.cod_amount).toFixed(0)}</div>}
                    </td>
                    <td className="px-3 py-2"><Badge color={STATUS_COLOR[o.status]||'bg-c5'}>{o.status.replace(/_/g,' ')}</Badge></td>
                    <td className="font-mono-nb px-3 py-2 font-bold">₹{parseFloat(o.total_freight).toFixed(0)}</td>
                    <td className="px-3 py-2 text-[#777]">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#eee] p-3">
            <span className="font-mono-nb text-[10px] text-[#777]">{meta.total} orders · Page {meta.page}/{meta.totalPages}</span>
            <div className="flex gap-2">
              <Btn variant="default" disabled={page === 1} onClick={() => setPage(p => p-1)}>← Prev</Btn>
              <Btn variant="default" disabled={page === meta.totalPages} onClick={() => setPage(p => p+1)}>Next →</Btn>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
