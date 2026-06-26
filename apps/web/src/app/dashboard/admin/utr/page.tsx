'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

const STATUS_STYLE: Record<string, string> = {
  pending:    'bg-[#FEF9C3] text-[#854D0E]',
  settled:    'bg-[#D1FAE5] text-[#065F46]',
  processing: 'bg-[#DBEAFE] text-[#1E40AF]',
  on_hold:    'bg-[#FEE2E2] text-[#991B1B]',
};

export default function UtrPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [utrForm, setUtrForm] = useState({ utrNumber: '', paymentMode: 'neft', bankReference: '' });
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
      setUtrForm({ utrNumber: '', paymentMode: 'neft', bankReference: '' });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">UTR Entry — COD Settlements</h1>
        <p className="text-sm text-[#64748B] mt-1">Enter UTR numbers to mark COD settlements as paid.</p>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}
      {success && <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">✓ {success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settlements List */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">Pending COD Settlements</h2>
          </div>
          {loading ? (
            <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Merchant</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">UTR</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {settlements.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#94A3B8]">No settlements yet</td></tr>
                  )}
                  {settlements.map(s => (
                    <tr key={s.id} className={`hover:bg-[#F8F9FB] transition-colors ${selected?.id === s.id ? 'bg-[#EEF2FF]' : ''}`}>
                      <td className="px-4 py-3 text-sm font-semibold text-[#0F172A]">{s.business_name}</td>
                      <td className="px-4 py-3 text-sm font-bold font-mono text-[#16A34A]">₹{parseFloat(s.net_amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[s.status] || 'bg-[#F1F5F9] text-[#475569]'}`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-[#475569]">{s.utr_number || '—'}</td>
                      <td className="px-4 py-3">
                        {s.status !== 'settled' && (
                          <button onClick={() => setSelected(s)} className="px-3 py-1.5 text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-lg hover:bg-[#E0E7FF] transition-colors">
                            Enter UTR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* UTR Form */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-gradient-to-r from-[#EEF2FF] to-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">Enter UTR / Payment Details</h2>
          </div>
          {selected ? (
            <form onSubmit={submitUtr} className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-[#F4F6F9] border border-[#E5E8EF]">
                <div className="font-semibold text-sm text-[#0F172A]">{selected.business_name}</div>
                <div className="text-xs text-[#64748B] mt-1">Amount: <span className="font-bold font-mono text-[#16A34A]">₹{parseFloat(selected.net_amount).toFixed(2)}</span></div>
                <div className="text-xs text-[#64748B]">Orders: {selected.total_orders}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">UTR Number *</label>
                <input
                  required value={utrForm.utrNumber}
                  onChange={e => setUtrForm(p => ({ ...p, utrNumber: e.target.value }))}
                  placeholder="e.g. HDFC000123456789"
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Payment Mode</label>
                <select
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                  value={utrForm.paymentMode} onChange={e => setUtrForm(p => ({ ...p, paymentMode: e.target.value }))}>
                  <option value="neft">NEFT</option>
                  <option value="rtgs">RTGS</option>
                  <option value="imps">IMPS</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Bank Reference (Optional)</label>
                <input
                  value={utrForm.bankReference}
                  onChange={e => setUtrForm(p => ({ ...p, bankReference: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>
              <div className="flex gap-3 pt-2 border-t border-[#F1F5F9]">
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50">
                  {submitting ? 'Saving...' : '✓ Confirm & Mark Settled'}
                </button>
                <button type="button" onClick={() => setSelected(null)}
                  className="px-4 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center">
              <div className="text-3xl mb-3">🧾</div>
              <div className="text-sm font-semibold text-[#0F172A]">No settlement selected</div>
              <div className="text-xs text-[#94A3B8] mt-1">Select a row from the table to enter UTR details</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
