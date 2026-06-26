'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Input, Field, Badge } from '@/components/ui';
import { PageHeader, Toast, ErrorBar } from '../_shared';

const BL_TYPES = ['mobile', 'email', 'gst', 'ip', 'pan', 'device'];

export default function BlacklistPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('mobile');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/super-admin/risk/blacklist'); setList(data.items || data.blacklist || data.entries || data || []); }
    catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!value.trim()) return;
    setBusy(true);
    try { await api.post('/super-admin/risk/blacklist', { type, value: value.trim(), reason }); flash('Added to blacklist'); setValue(''); setReason(''); load(); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!window.confirm('Remove this blacklist entry?')) return;
    try { await api.delete(`/super-admin/risk/blacklist/${id}`); flash('Removed'); load(); }
    catch (e) { setErr(apiErrorMessage(e)); }
  }

  return (
    <div>
      <PageHeader title="Blacklist" subtitle="Block mobiles, emails, GST, IP, PAN and devices" />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      <Card className="mb-4">
        <CardHead><span className="font-bold text-[#0F172A]">Add to Blacklist</span></CardHead>
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-4">
          <Field label="Type">
            <select value={type} onChange={e => setType(e.target.value)} className="nb-input w-full">
              {BL_TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label="Value"><Input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 9999999999" /></Field>
          <Field label="Reason"><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Fraud / chargeback" /></Field>
          <div className="flex items-end"><Btn variant="danger" disabled={busy} onClick={add} className="w-full justify-center">Blacklist</Btn></div>
        </div>
      </Card>

      <Card>
        <CardHead><span className="font-bold text-[#0F172A]">Active Blacklist ({list.length})</span></CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-[#F8FAFC] text-left font-mono-nb text-[10px] uppercase text-[#64748B]">
              <th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Value</th>
              <th className="px-4 py-2.5">Reason</th><th className="px-4 py-2.5 text-right">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>}
              {!loading && list.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[#94A3B8]">Blacklist is empty</td></tr>}
              {list.map((b: any) => (
                <tr key={b.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><Badge className="bg-[#EDE9FE] text-[#5B21B6]">{b.type}</Badge></td>
                  <td className="px-4 py-3 font-mono-nb font-semibold text-[#0F172A]">{b.value}</td>
                  <td className="px-4 py-3 text-[#475569]">{b.reason || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(b.id)} className="rounded-md bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#991B1B] hover:brightness-95">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
