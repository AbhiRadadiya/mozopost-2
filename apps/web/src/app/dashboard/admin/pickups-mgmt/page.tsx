'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

const STATUS_COLOR: Record<string,string> = { scheduled:'bg-c4',picked_up:'bg-c3',failed:'bg-c2 text-white',cancelled:'bg-[#999] text-white' };

export default function PickupsMgmtPage() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/pickups');
      setPickups(data.pickups);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.patch(`/admin/pickups/${id}/status`, { status });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Pickup Management</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">{error}</div>}
      <Card>
        <CardHead className="bg-black text-white"><span className="font-bold">All Pickup Requests</span></CardHead>
        {loading ? <div className="p-4 text-sm">Loading...</div>
        : pickups.length === 0
          ? <div className="p-6 text-center text-sm text-[#777]">No pickup requests yet.</div>
          : (
            <div className="overflow-auto">
              <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Date</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Warehouse</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Pkgs</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Actions</th>
              </tr></thead><tbody>
                {pickups.map((p: any) => (
                  <tr key={p.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2">{new Date(p.pickup_date).toLocaleDateString('en-IN')}</td>
                    <td className="px-3 py-2 font-bold">{p.business_name}</td>
                    <td className="px-3 py-2">{p.courier_name || 'Auto'}</td>
                    <td className="px-3 py-2">{p.warehouse_name || '—'}</td>
                    <td className="font-mono-nb px-3 py-2">{p.expected_package_count}</td>
                    <td className="px-3 py-2"><Badge color={STATUS_COLOR[p.status]||'bg-c5'}>{p.status.replace('_',' ')}</Badge></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        {p.status==='scheduled' && <Btn variant="success" onClick={() => updateStatus(p.id,'picked_up')}>Picked Up</Btn>}
                        {p.status==='scheduled' && <Btn variant="danger" onClick={() => updateStatus(p.id,'failed')}>Failed</Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
      </Card>
    </div>
  );
}
