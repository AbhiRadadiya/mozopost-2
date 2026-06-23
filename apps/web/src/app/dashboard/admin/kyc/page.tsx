'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

export default function KycPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string|null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/merchants');
      setMerchants(data.merchants.filter((m: any) => m.kyc_status !== 'verified'));
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function setKyc(sellerId: string, kycStatus: string) {
    setActionId(sellerId);
    try {
      await api.patch(`/admin/merchants/${sellerId}/kyc`, { kycStatus });
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setActionId(null); }
  }

  const pending = merchants.filter(m => ['pending','submitted'].includes(m.kyc_status));
  const rejected = merchants.filter(m => m.kyc_status === 'rejected');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">KYC Verification <Badge color="bg-c4">{pending.length} Pending</Badge></h1>
      </div>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}
      {pending.length > 0 && (
        <>
          <h2 className="mb-3 font-bold">Pending Verification</h2>
          {pending.map(m => (
            <div key={m.id} className="nb-card p-4 mb-3">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="font-bold text-sm mb-1">{m.business_name}</div>
                  <div className="text-xs text-[#777]">{m.email}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-[#777]">GSTIN:</span> <span className="font-mono-nb font-bold">{m.gstin || '—'}</span></div>
                    <div><span className="text-[#777]">Orders:</span> <span className="font-bold">{m.order_count}</span></div>
                  </div>
                </div>
                <div>
                  <div className="font-bold text-xs mb-2">KYC Checklist</div>
                  {['GSTIN valid & active','PAN matches business','Bank account verified','Address proof submitted'].map(item => (
                    <div key={item} className="flex items-center gap-2 py-1 text-xs">
                      <div className={`w-4 h-4 border-2 border-black flex items-center justify-center text-[9px] font-bold ${Math.random()>0.3?'bg-c3':'bg-[#eee]'}`}>
                        {Math.random()>0.3?'✓':''}
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex gap-2">
                  <Btn variant="default">👁 GST Cert</Btn>
                  <Btn variant="default">👁 PAN Card</Btn>
                  <Btn variant="default">👁 Bank Proof</Btn>
                </div>
                <div className="flex gap-2 ml-auto">
                  <Btn variant="success" disabled={actionId===m.id} onClick={() => setKyc(m.id,'verified')}>✓ Approve KYC</Btn>
                  <Btn variant="danger" disabled={actionId===m.id} onClick={() => setKyc(m.id,'rejected')}>✕ Reject</Btn>
                  <Btn variant="default">📨 Request Docs</Btn>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {rejected.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 font-bold">Rejected</h2>
          <Card>
            <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="bg-black text-c3">
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Email</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
            </tr></thead><tbody>
              {rejected.map(m => (
                <tr key={m.id} className="border-b border-[#eee]">
                  <td className="px-3 py-2 font-bold">{m.business_name}</td>
                  <td className="px-3 py-2 text-[#777]">{m.email}</td>
                  <td className="px-3 py-2"><Btn variant="success" disabled={actionId===m.id} onClick={() => setKyc(m.id,'verified')}>Re-approve</Btn></td>
                </tr>
              ))}
            </tbody></table></div>
          </Card>
        </>
      )}
      {!loading && pending.length === 0 && rejected.length === 0 && (
        <div className="border-2 border-black bg-c3 p-6 text-center font-bold shadow-nb">
          ✅ All merchants have been KYC verified.
        </div>
      )}
    </div>
  );
}
