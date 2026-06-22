'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

interface Merchant {
  id: string;
  business_name: string;
  gstin: string | null;
  email: string;
  status: string;
  kyc_status: string;
  wallet_balance: string;
  order_count: string;
}

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-c3',
  suspended: 'bg-c2 text-white',
  pending_kyc: 'bg-c4',
  inactive: 'bg-[#999] text-white',
};
const KYC_COLOR: Record<string, string> = {
  verified: 'bg-c3',
  rejected: 'bg-c2 text-white',
  pending: 'bg-c4',
  submitted: 'bg-c1',
};

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/merchants');
      setMerchants(data.merchants);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(sellerId: string, status: string) {
    setActionId(sellerId);
    try {
      await api.patch(`/admin/merchants/${sellerId}/status`, { status });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function setKyc(sellerId: string, kycStatus: string) {
    setActionId(sellerId);
    try {
      await api.patch(`/admin/merchants/${sellerId}/kyc`, { kycStatus });
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Merchant Management</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      <Card>
        {loading ? (
          <div className="p-4 text-sm">Loading...</div>
        ) : merchants.length === 0 ? (
          <div className="p-4 text-sm text-[#777]">No merchants yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Email</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Orders</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Wallet</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">KYC</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((m) => (
                  <tr key={m.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2 font-bold">{m.business_name}</td>
                    <td className="px-3 py-2 text-[#777]">{m.email}</td>
                    <td className="font-mono-nb px-3 py-2">{m.order_count}</td>
                    <td className="font-mono-nb px-3 py-2">₹{parseFloat(m.wallet_balance || '0').toFixed(0)}</td>
                    <td className="px-3 py-2">
                      <Badge color={KYC_COLOR[m.kyc_status] || 'bg-c5'}>{m.kyc_status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={STATUS_COLOR[m.status] || 'bg-c5'}>{m.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        {m.kyc_status !== 'verified' && (
                          <Btn variant="success" disabled={actionId === m.id} onClick={() => setKyc(m.id, 'verified')}>
                            Approve KYC
                          </Btn>
                        )}
                        {m.status === 'active' ? (
                          <Btn variant="danger" disabled={actionId === m.id} onClick={() => setStatus(m.id, 'suspended')}>
                            Suspend
                          </Btn>
                        ) : (
                          <Btn variant="success" disabled={actionId === m.id} onClick={() => setStatus(m.id, 'active')}>
                            Activate
                          </Btn>
                        )}
                      </div>
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
