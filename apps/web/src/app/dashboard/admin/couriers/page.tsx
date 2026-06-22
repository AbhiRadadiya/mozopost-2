'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

interface Courier {
  id: string;
  name: string;
  code: string;
  status: string;
  isLive: boolean;
}

export default function CourierIntegrationsPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/couriers');
      setCouriers(data.couriers);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(id: string, current: string) {
    setActionId(id);
    try {
      await api.patch(`/super-admin/couriers/${id}/status`, { status: current === 'active' ? 'inactive' : 'active' });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">
        Courier Integrations <Badge color="bg-c2 text-white">SUPER ADMIN</Badge>
      </h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      <div className="mb-4 border-2 border-black bg-c5 p-3 text-xs font-semibold shadow-nb">
        ℹ Couriers marked <strong>LIVE</strong> have API keys configured in <code className="font-mono-nb">apps/api/.env</code>.
        Couriers marked <strong>mock</strong> will generate realistic fake AWBs and tracking events so orders can be
        tested end-to-end before going live with that carrier.
      </div>

      <Card>
        {loading ? (
          <div className="p-4 text-sm">Loading...</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Code</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Mode</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {couriers.map((c) => (
                  <tr key={c.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2 font-bold">{c.name}</td>
                    <td className="font-mono-nb px-3 py-2">{c.code}</td>
                    <td className="px-3 py-2">
                      <Badge color={c.isLive ? 'bg-c3' : 'bg-c4'}>{c.isLive ? 'LIVE' : 'mock'}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={c.status === 'active' ? 'bg-c3' : 'bg-[#999] text-white'}>{c.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Btn
                        variant={c.status === 'active' ? 'danger' : 'success'}
                        disabled={actionId === c.id}
                        onClick={() => toggleStatus(c.id, c.status)}
                      >
                        {c.status === 'active' ? 'Disable' : 'Enable'}
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
