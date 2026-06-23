'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

export default function NdrMgmtPage() {
  const [ndrs, setNdrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/merchants');
      // In production this would be a dedicated admin NDR endpoint
      setNdrs([
        { id:'1', mozopost_order_id:'MP2606000003', consignee_name:'Ravi Kumar', consignee_phone:'9876503456', courier_name:'DTDC', attempt_number:1, ndr_reason:'customer_not_available', business_name:'Arjun Textiles', cod_amount:850 },
        { id:'2', mozopost_order_id:'MP2606000099', consignee_name:'Meena Pillai', consignee_phone:'9123456789', courier_name:'Delhivery', attempt_number:2, ndr_reason:'wrong_address', business_name:'Riya Fashion', cod_amount:0 },
        { id:'3', mozopost_order_id:'MP2606000101', consignee_name:'Suresh Nair', consignee_phone:'9988776655', courier_name:'Ekart', attempt_number:3, ndr_reason:'refused_delivery', business_name:'FastMart', cod_amount:500 },
      ]);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  const REASON_COLOR: Record<string,string> = {
    customer_not_available:'bg-c4', wrong_address:'bg-c4',
    refused_delivery:'bg-c2 text-white', premises_closed:'bg-c4',
    fake_attempt:'bg-c2 text-white',
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">NDR Management <Badge color="bg-c2 text-white">{ndrs.length} Pending</Badge></h1>
        <div className="flex gap-2">
          <select className="nb-input text-xs py-1 w-auto"><option>All couriers</option><option>Delhivery</option><option>DTDC</option></select>
        </div>
      </div>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">{error}</div>}
      <div className="border-2 border-black bg-[#ffe5e5] p-3 mb-4 text-xs font-semibold shadow-nb-sm">
        ⚠ Unresolved NDRs auto-convert to RTO after 3 days. Act now to protect COD revenue.
      </div>
      {loading ? <div className="text-sm">Loading...</div>
      : ndrs.map(n => (
        <div key={n.id} className={`nb-card p-4 mb-3 border-l-4 ${n.attempt_number >= 3 ? 'border-l-c2' : 'border-l-c4'}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-mono-nb font-bold text-xs">{n.mozopost_order_id}</div>
              <div className="text-xs text-[#777] mt-0.5">{n.courier_name} · {n.business_name} · Attempt {n.attempt_number}/3 {n.cod_amount > 0 && `· COD ₹${n.cod_amount}`}</div>
            </div>
            <Badge color={REASON_COLOR[n.ndr_reason]||'bg-c4'}>{n.ndr_reason.replace(/_/g,' ')}</Badge>
          </div>
          <div className="font-bold text-xs mb-3">{n.consignee_name} · {n.consignee_phone}</div>
          {n.attempt_number >= 3 && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">Max attempts reached. Must initiate RTO.</div>}
          <div className="flex gap-2 flex-wrap">
            {n.attempt_number < 3 && <Btn variant="success">🔄 Re-attempt</Btn>}
            <Btn variant="default">💬 Customer confirm</Btn>
            <Btn variant="default">✏ Update address</Btn>
            <Btn variant="default">⏸ Hold</Btn>
            <Btn variant="danger">↩ Mark RTO</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}
