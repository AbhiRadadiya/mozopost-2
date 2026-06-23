'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

const REASON_LABELS: Record<string,string> = {
  customer_not_available: 'Not available', wrong_address: 'Wrong address',
  refused_delivery: 'Refused delivery', premises_closed: 'Premises closed',
  out_of_delivery_area: 'Out of area', fake_attempt: 'Fake attempt', other: 'Other',
};

export default function NdrPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string|null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/ndr');
      setRecords(data.ndrRecords);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function takeAction(orderId: string, action: string) {
    setActionId(orderId);
    try {
      await api.post(`/ndr/${orderId}/action`, { action });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setActionId(null); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">NDR Management</h1>
        {records.length > 0 && <Badge color="bg-c2 text-white">{records.length} Pending</Badge>}
      </div>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">{error}</div>}
      {records.length > 0 && (
        <div className="mb-4 border-2 border-black bg-[#ffe5e5] p-3 text-xs font-semibold shadow-nb-sm">
          ⚠ Unresolved NDRs auto-convert to RTO after 3 days. Act now to protect your COD revenue.
        </div>
      )}
      {loading ? <div className="text-sm">Loading...</div>
      : records.length === 0 ? (
        <div className="border-2 border-black bg-c3 p-6 text-center font-bold shadow-nb">
          ✓ No pending NDRs. All deliveries are on track.
        </div>
      ) : records.map(n => (
        <div key={n.id} className={`nb-card p-4 mb-3 border-l-4 ${n.attempt_number >= 3 ? 'border-l-c2' : 'border-l-c4'}`}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-mono-nb font-bold text-xs">{n.mozopost_order_id}</div>
              <div className="text-xs text-[#777] mt-0.5">{n.courier_name} · Attempt {n.attempt_number}/3</div>
            </div>
            <Badge color="bg-c4">{REASON_LABELS[n.ndr_reason] || n.ndr_reason}</Badge>
          </div>
          <div className="font-bold text-xs mb-3">{n.consignee_name} · {n.consignee_phone}</div>
          {n.attempt_number >= 3 && (
            <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">
              Max attempts reached — you must initiate RTO.
            </div>
          )}
          <div className="flex gap-2 flex-wrap">
            {n.attempt_number < 3 && (
              <Btn variant="success" disabled={actionId===n.order_id} onClick={() => takeAction(n.order_id, 'reattempt')}>
                🔄 Re-attempt
              </Btn>
            )}
            <Btn variant="default" disabled={actionId===n.order_id} onClick={() => takeAction(n.order_id, 'update_address')}>
              ✏ Update address
            </Btn>
            <Btn variant="default" disabled={actionId===n.order_id} onClick={() => takeAction(n.order_id, 'hold')}>
              ⏸ Hold
            </Btn>
            <Btn variant="danger" disabled={actionId===n.order_id} onClick={() => takeAction(n.order_id, 'rto')}>
              ↩ Mark RTO
            </Btn>
          </div>
        </div>
      ))}
    </div>
  );
}
