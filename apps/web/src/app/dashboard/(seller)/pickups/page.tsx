'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

const STATUS_BADGE: Record<string, { classes: string; label: string }> = {
  scheduled: { classes: 'bg-[#DBEAFE] text-[#1E40AF]', label: 'Scheduled' },
  picked_up: { classes: 'bg-[#D1FAE5] text-[#065F46]', label: 'Picked Up' },
  failed:    { classes: 'bg-[#FEE2E2] text-[#991B1B]', label: 'Failed' },
  cancelled: { classes: 'bg-[#F1F5F9] text-[#64748B]', label: 'Cancelled' },
};

export default function PickupsPage() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ courierId:'', pickupDate:'', expectedPackageCount:'1', timeSlot:'10:00 AM – 12:00 PM' });

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    api.get('/pickups').then(r => setPickups(r.data.pickups)).catch(()=>{}).finally(() => setLoading(false));
    api.get('/couriers').then(r => setCouriers(r.data.couriers)).catch(()=>{});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await api.post('/pickups', {
        courierId: form.courierId || undefined,
        pickupDate: form.pickupDate || tomorrowStr,
        expectedPackageCount: parseInt(form.expectedPackageCount),
        timeSlot: form.timeSlot,
      });
      setSuccess('Pickup request created successfully.');
      const r = await api.get('/pickups');
      setPickups(r.data.pickups);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setSubmitting(false); }
  }

  async function cancel(id: string) {
    try {
      await api.patch(`/pickups/${id}/cancel`);
      setPickups(p => p.map(pk => pk.id===id ? {...pk,status:'cancelled'} : pk));
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <div className="animate-fade-up max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Pickups</h1>
          <p className="text-sm text-[#64748B] mt-1">Schedule and manage your courier pickups.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Create Form ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
              <h2 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Schedule Pickup
              </h2>
            </div>
            <form onSubmit={handleCreate} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Pickup Date</label>
                <input type="date" required
                  value={form.pickupDate || tomorrowStr}
                  onChange={e => setForm(p=>({...p,pickupDate:e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Time Slot</label>
                <select 
                  value={form.timeSlot} onChange={e => setForm(p=>({...p,timeSlot:e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                >
                  <option>10:00 AM – 12:00 PM</option>
                  <option>12:00 PM – 2:00 PM</option>
                  <option>2:00 PM – 4:00 PM</option>
                  <option>4:00 PM – 6:00 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Courier</label>
                <select 
                  value={form.courierId} onChange={e => setForm(p=>({...p,courierId:e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                >
                  <option value="">Auto (Assign dynamically)</option>
                  {couriers.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Package Count</label>
                <input type="number" min="1" required
                  value={form.expectedPackageCount}
                  onChange={e => setForm(p=>({...p,expectedPackageCount:e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none transition-all focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B]">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-sm font-medium text-[#166534]">
                  {success}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full flex items-center justify-center py-2.5 mt-2 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors shadow-sm disabled:opacity-50">
                {submitting ? 'Creating...' : 'Schedule Pickup'}
              </button>
            </form>
          </div>
        </div>

        {/* ── History Table ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E8EF] bg-white flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#0F172A]">History</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F9FB] border-b border-[#E5E8EF]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Time Slot</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Courier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Pkgs</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">Loading...</td>
                    </tr>
                  ) : pickups.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#F4F6F9] flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                          </div>
                          <p className="text-sm font-medium text-[#64748B]">No pickups scheduled yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pickups.map((p:any) => {
                      const s = STATUS_BADGE[p.status] || { classes: 'bg-[#F1F5F9] text-[#64748B]', label: p.status };
                      return (
                        <tr key={p.id} className="border-b border-[#F1F3F7] hover:bg-[#F8F9FB] transition-colors">
                          <td className="px-4 py-3.5 text-[#0F172A] font-medium">
                            {new Date(p.pickup_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3.5 text-[#475569] text-xs">
                            {p.time_slot || '—'}
                          </td>
                          <td className="px-4 py-3.5 text-[#0F172A] font-medium">
                            {p.courier_name || 'Auto'}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-[#0F172A]">
                            {p.expected_package_count}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${s.classes}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />{s.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {p.status === 'scheduled' && (
                              <button onClick={() => cancel(p.id)}
                                className="text-xs font-semibold text-[#EF4444] hover:text-[#991B1B] transition-colors bg-[#FEF2F2] px-2.5 py-1.5 rounded-md hover:bg-[#FEE2E2]">
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
