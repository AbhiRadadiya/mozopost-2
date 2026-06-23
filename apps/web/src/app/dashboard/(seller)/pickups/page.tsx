'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

const STATUS_COLOR: Record<string,string> = {
  scheduled:'bg-c4', picked_up:'bg-c3', failed:'bg-c2 text-white', cancelled:'bg-[#999] text-white',
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
      setSuccess('Pickup request created!');
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
    <div>
      <h1 className="mb-4 text-xl font-bold">Pickup Requests</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">🚚 Create Pickup Request</span></CardHead>
          <form onSubmit={handleCreate} className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pickup Date" required>
                <Input type="date" value={form.pickupDate || tomorrowStr}
                  onChange={e => setForm(p=>({...p,pickupDate:e.target.value}))} required />
              </Field>
              <Field label="Time Slot">
                <select className="nb-input w-full" value={form.timeSlot} onChange={e => setForm(p=>({...p,timeSlot:e.target.value}))}>
                  <option>10:00 AM – 12:00 PM</option>
                  <option>12:00 PM – 2:00 PM</option>
                  <option>2:00 PM – 4:00 PM</option>
                  <option>4:00 PM – 6:00 PM</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Courier">
                <select className="nb-input w-full" value={form.courierId} onChange={e => setForm(p=>({...p,courierId:e.target.value}))}>
                  <option value="">Auto (based on orders)</option>
                  {couriers.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Package count" required>
                <Input type="number" min="1" value={form.expectedPackageCount}
                  onChange={e => setForm(p=>({...p,expectedPackageCount:e.target.value}))} required />
              </Field>
            </div>
            {error && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">⚠ {error}</div>}
            {success && <div className="mb-3 border-2 border-black bg-c3 p-2 text-xs font-bold">✓ {success}</div>}
            <Btn type="submit" variant="success" disabled={submitting} className="w-full justify-center">
              {submitting ? 'Creating...' : '🚚 Create Pickup Request'}
            </Btn>
          </form>
        </Card>

        <Card>
          <CardHead className="bg-black text-white"><span className="font-bold">Pickup History</span></CardHead>
          {loading ? <div className="p-4 text-sm">Loading...</div>
          : pickups.length === 0 ? <div className="p-4 text-sm text-[#777]">No pickup requests yet.</div>
          : (
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Date</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Time Slot</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Pkgs</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
              </tr></thead><tbody>
                {pickups.map((p:any) => (
                  <tr key={p.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2">{new Date(p.pickup_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-3 py-2 text-[10px]">{p.time_slot || '—'}</td>
                    <td className="px-3 py-2">{p.courier_name || 'Auto'}</td>
                    <td className="font-mono-nb px-3 py-2">{p.expected_package_count}</td>
                    <td className="px-3 py-2"><Badge color={STATUS_COLOR[p.status]||'bg-c5'}>{p.status.replace('_',' ')}</Badge></td>
                    <td className="px-3 py-2">
                      {p.status === 'scheduled' && (
                        <Btn variant="danger" onClick={() => cancel(p.id)}>Cancel</Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
