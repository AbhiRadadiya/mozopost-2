'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead } from '@/components/ui';
import { PageHeader, Toast, ErrorBar } from '../_shared';

export default function RateCardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
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

  function startEdit(rc: any) {
    setEditId(rc.id);
    setForm({ baseRate: rc.base_rate, additionalRatePerKg: rc.additional_rate_per_kg, codChargeFixed: rc.cod_charge_fixed, codChargePct: rc.cod_charge_pct });
  }
  async function save(id: string) {
    setBusy(true);
    try { await api.put(`/super-admin/rate-cards/${id}`, form); flash('Rate card updated'); setEditId(null); load(); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Rate Cards" subtitle="Per-courier pricing — base, per-kg and COD charges" />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <Card>
        <CardHead><span className="font-bold text-[#0F172A]">Rate Cards ({cards.length})</span></CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-left font-mono-nb text-[10px] uppercase text-[#64748B]">
              <th className="px-4 py-2.5">Courier</th><th className="px-4 py-2.5">Base ₹</th>
              <th className="px-4 py-2.5">Per Kg ₹</th><th className="px-4 py-2.5">COD Fixed ₹</th>
              <th className="px-4 py-2.5">COD %</th><th className="px-4 py-2.5 text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>}
              {!loading && cards.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">No rate cards</td></tr>}
              {cards.map((rc: any) => (
                <tr key={rc.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#0F172A]">{rc.courier_name}</td>
                  {editId === rc.id ? (
                    <>
                      {(['baseRate', 'additionalRatePerKg', 'codChargeFixed', 'codChargePct'] as const).map(k => (
                        <td key={k} className="px-4 py-2">
                          <input type="number" value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })} className="nb-input w-20 py-1 text-xs" />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => save(rc.id)} disabled={busy} className="rounded-md bg-[#D1FAE5] px-2.5 py-1 text-[11px] font-semibold text-[#065F46]">Save</button>
                          <button onClick={() => setEditId(null)} className="rounded-md border border-[#E5E8EF] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-mono-nb">{rc.base_rate}</td>
                      <td className="px-4 py-3 font-mono-nb">{rc.additional_rate_per_kg}</td>
                      <td className="px-4 py-3 font-mono-nb">{rc.cod_charge_fixed}</td>
                      <td className="px-4 py-3 font-mono-nb">{rc.cod_charge_pct}%</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(rc)} className="rounded-md border border-[#E5E8EF] px-2.5 py-1 text-[11px] font-semibold text-[#475569]">Edit</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
