'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

export default function UtrPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [utrForm, setUtrForm] = useState({ utrNumber:'', paymentMode:'neft', bankReference:'' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/cod-settlements');
      setSettlements(data.settlements);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function submitUtr(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !utrForm.utrNumber) return;
    setSubmitting(true); setError(''); setSuccess('');
    try {
      const { data } = await api.patch(`/admin/cod-settlements/${selected.id}/utr`, utrForm);
      setSuccess(data.message);
      setSelected(null);
      setUtrForm({ utrNumber:'', paymentMode:'neft', bankReference:'' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  const STATUS_COLOR: Record<string,string> = { pending:'bg-c4', settled:'bg-c3', processing:'bg-c1', on_hold:'bg-c2 text-white' };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">UTR Entry — COD Settlements</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}
      {success && <div className="mb-3 border-2 border-black bg-c3 p-3 text-xs font-bold">✓ {success}</div>}

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">Pending COD Settlements</span></CardHead>
          {loading ? <div className="p-4 text-sm">Loading...</div>
          : (
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Amount</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Due</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">UTR</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
              </tr></thead><tbody>
                {settlements.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-[#777]">No settlements yet</td></tr>
                )}
                {settlements.map(s => (
                  <tr key={s.id} className={`border-b border-[#eee] ${selected?.id===s.id?'bg-c5':''}`}>
                    <td className="px-3 py-2 font-bold">{s.business_name}</td>
                    <td className="font-mono-nb px-3 py-2 font-bold">₹{parseFloat(s.net_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">{s.due_date ? new Date(s.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-3 py-2"><Badge color={STATUS_COLOR[s.status]||'bg-c5'}>{s.status}</Badge></td>
                    <td className="font-mono-nb px-3 py-2">{s.utr_number || <span className="text-[#777]">—</span>}</td>
                    <td className="px-3 py-2">
                      {s.status !== 'settled' && (
                        <Btn variant="success" onClick={() => setSelected(s)}>Enter UTR</Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </Card>

        <Card>
          <CardHead className="bg-c4"><span className="font-bold">Enter UTR / Payment Details</span></CardHead>
          {selected ? (
            <form onSubmit={submitUtr} className="p-4">
              <div className="mb-3 border-2 border-black bg-c5 p-3 text-xs">
                <div className="font-bold">{selected.business_name}</div>
                <div>Amount: <span className="font-mono-nb font-bold">₹{parseFloat(selected.net_amount).toFixed(2)}</span></div>
                <div>Orders: {selected.total_orders}</div>
              </div>
              <Field label="UTR Number" required>
                <Input value={utrForm.utrNumber}
                  onChange={e => setUtrForm(p=>({...p, utrNumber:e.target.value}))}
                  placeholder="e.g. HDFC000123456789" required />
              </Field>
              <Field label="Payment mode">
                <select className="nb-input w-full" value={utrForm.paymentMode}
                  onChange={e => setUtrForm(p=>({...p, paymentMode:e.target.value}))}>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="imps">IMPS</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </Field>
              <Field label="Bank reference (optional)">
                <Input value={utrForm.bankReference}
                  onChange={e => setUtrForm(p=>({...p, bankReference:e.target.value}))} />
              </Field>
              <div className="flex gap-2">
                <Btn type="submit" variant="success" disabled={submitting} className="flex-1 justify-center">
                  {submitting ? 'Saving...' : '✓ Confirm & Mark Settled'}
                </Btn>
                <Btn variant="default" onClick={() => setSelected(null)}>Cancel</Btn>
              </div>
            </form>
          ) : (
            <div className="p-6 text-center text-sm text-[#777]">
              Select a settlement from the left table to enter UTR details
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
