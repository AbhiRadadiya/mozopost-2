'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

interface Margin { id: string; courier_name: string | null; business_name: string | null; margin_type: string; margin_value: string; }

export default function MarginsPage() {
  const [margins, setMargins] = useState<Margin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [marginType, setMarginType] = useState<'fixed' | 'percentage'>('fixed');
  const [marginValue, setMarginValue] = useState('5');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/margins');
      setMargins(data.margins);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function handleSetGlobal(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(''); setMessage('');
    try {
      await api.post('/admin/margins', { marginType, marginValue: Number(marginValue) });
      setMessage('Global margin rule applied successfully!');
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Margin Management</h1>
        <p className="text-sm text-[#64748B] mt-1">Configure shipping cost margins across the platform.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Set Global Margin */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-gradient-to-r from-[#EEF2FF] to-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">Set Global Margin Rule</h2>
            <p className="text-xs text-[#64748B] mt-0.5">This applies to all couriers unless overridden.</p>
          </div>
          <form onSubmit={handleSetGlobal} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Margin Type</label>
              <div className="flex rounded-xl border border-[#E5E8EF] overflow-hidden">
                <button type="button" onClick={() => setMarginType('fixed')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${marginType === 'fixed' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-white text-[#94A3B8] hover:bg-[#F8F9FB]'}`}>
                  Fixed (₹)
                </button>
                <button type="button" onClick={() => setMarginType('percentage')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#E5E8EF] ${marginType === 'percentage' ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-white text-[#94A3B8] hover:bg-[#F8F9FB]'}`}>
                  Percentage (%)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">
                Value ({marginType === 'fixed' ? '₹' : '%'})
              </label>
              <input
                type="number" required value={marginValue} onChange={e => setMarginValue(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
              />
            </div>
            {error && <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}
            {message && <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">✓ {message}</div>}
            <button type="submit" disabled={submitting}
              className="w-full py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50">
              {submitting ? 'Applying...' : 'Apply Global Margin Rule'}
            </button>
          </form>
        </div>

        {/* Active Rules */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">Active Margin Rules</h2>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-[#94A3B8] animate-pulse">Loading...</div>
          ) : (
            <div className="max-h-[340px] overflow-y-auto divide-y divide-[#F1F5F9]">
              {margins.map(m => (
                <div key={m.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-[#F8F9FB] transition-colors">
                  <div>
                    {m.business_name || m.courier_name ? (
                      <div className="flex items-center gap-2">
                        {m.business_name && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5]">{m.business_name}</span>}
                        {m.courier_name && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#16A34A]">{m.courier_name}</span>}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#854D0E]">GLOBAL</span>
                    )}
                    <div className="text-xs text-[#94A3B8] mt-0.5">{m.margin_type}</div>
                  </div>
                  <div className="text-base font-bold font-mono text-[#0F172A]">
                    {m.margin_type === 'fixed' ? `₹${m.margin_value}` : `${m.margin_value}%`}
                  </div>
                </div>
              ))}
              {margins.length === 0 && <div className="py-12 text-center text-sm text-[#94A3B8]">No margin rules configured.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
