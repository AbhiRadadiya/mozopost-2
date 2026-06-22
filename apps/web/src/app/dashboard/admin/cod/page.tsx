'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

interface Settlement {
  id: string;
  business_name: string;
  total_orders: number;
  net_amount: string;
  status: string;
  due_date: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-c4',
  processing: 'bg-c1',
  settled: 'bg-c3',
  on_hold: 'bg-c2 text-white',
  disputed: 'bg-c2 text-white',
};

export default function CodSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/cod-settlements');
      setSettlements(data.settlements);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function release(id: string) {
    setActionId(id);
    try {
      await api.patch(`/admin/cod-settlements/${id}/release`);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">COD Settlements</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      <Card>
        {loading ? (
          <div className="p-4 text-sm">Loading...</div>
        ) : settlements.length === 0 ? (
          <div className="p-4 text-sm text-[#777]">
            No COD settlements yet. These are created automatically as COD orders are delivered.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Orders</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Net Amount</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Due</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2 font-bold">{s.business_name}</td>
                    <td className="font-mono-nb px-3 py-2">{s.total_orders}</td>
                    <td className="font-mono-nb px-3 py-2 font-bold">₹{parseFloat(s.net_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">{s.due_date ? new Date(s.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-3 py-2">
                      <Badge color={STATUS_COLOR[s.status] || 'bg-c5'}>{s.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      {s.status !== 'settled' && (
                        <Btn variant="success" disabled={actionId === s.id} onClick={() => release(s.id)}>
                          Release
                        </Btn>
                      )}
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
