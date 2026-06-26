'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead } from '@/components/ui';
import { PageHeader, Toast, ErrorBar } from '../_shared';

function CourierRow({ c, flash, setErr, reload }: any) {
  const [busy, setBusy] = useState(false);
  const status = c.courier_status || c.status || 'active';
  async function toggle() {
    setBusy(true);
    const next = status === 'active' ? 'inactive' : 'active';
    try { await api.patch(`/super-admin/couriers/${c.courier_id}/status`, { status: next }); flash(`${c.courier_name} ${next}`); reload(); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }
  return (
    <tr className="hover:bg-[#F8FAFC]">
      <td className="px-4 py-3 font-semibold text-[#0F172A]">{c.courier_name}</td>
      <td className="px-4 py-3 font-mono-nb text-[#475569]">{c.courier_code}</td>
      <td className="px-4 py-3 font-mono-nb">₹{c.base_rate}</td>
      <td className="px-4 py-3 text-right">
        <button disabled={busy} onClick={toggle}
          className={`rounded-md px-3 py-1 text-[11px] font-semibold ${status === 'active' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
          {status === 'active' ? 'Active — click to disable' : 'Inactive — click to enable'}
        </button>
      </td>
    </tr>
  );
}

export default function CouriersPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/super-admin/rate-cards'); setCards(data.rateCards || []); }
    catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // dedupe couriers from rate cards
  const couriers = Array.from(new Map(cards.map((rc: any) => [rc.courier_id, rc])).values());

  return (
    <div>
      <PageHeader title="Courier Status" subtitle="Enable or disable couriers platform-wide" />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <Card>
        <CardHead><span className="font-bold text-[#0F172A]">Couriers ({couriers.length})</span></CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-left font-mono-nb text-[10px] uppercase text-[#64748B]">
              <th className="px-4 py-2.5">Courier</th><th className="px-4 py-2.5">Code</th>
              <th className="px-4 py-2.5">Base Rate</th><th className="px-4 py-2.5 text-right">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>}
              {!loading && couriers.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">No couriers</td></tr>}
              {couriers.map((c: any) => <CourierRow key={c.courier_id} c={c} flash={flash} setErr={setErr} reload={load} />)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
