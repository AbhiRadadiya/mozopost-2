'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

export default function KycPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

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

  const pending = merchants.filter(m => ['pending', 'submitted'].includes(m.kyc_status));
  const rejected = merchants.filter(m => m.kyc_status === 'rejected');

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">KYC Verification</h1>
          <p className="text-sm text-[#64748B] mt-1">Review and approve merchant KYC submissions.</p>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#FEF9C3] text-[#854D0E]">
              {pending.length} Pending
            </span>
          )}
          {rejected.length > 0 && (
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-[#FEE2E2] text-[#991B1B]">
              {rejected.length} Rejected
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] font-medium">{error}</div>
      )}

      {/* Pending Section */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-[#0F172A] mb-4">Pending Verification</h2>
          <div className="space-y-4">
            {pending.map(m => (
              <div key={m.id} className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm p-6">
                <div className="grid grid-cols-2 gap-6 mb-5">
                  <div>
                    <div className="font-bold text-[#0F172A] mb-1">{m.business_name}</div>
                    <div className="text-sm text-[#64748B]">{m.email}</div>
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div><span className="text-[#94A3B8]">GSTIN:</span> <span className="font-mono font-semibold text-[#0F172A]">{m.gstin || '—'}</span></div>
                      <div><span className="text-[#94A3B8]">Orders:</span> <span className="font-semibold text-[#0F172A]">{m.order_count}</span></div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#0F172A] mb-3">KYC Checklist</div>
                    {['GSTIN valid & active', 'PAN matches business', 'Bank account verified', 'Address proof submitted'].map(item => (
                      <div key={item} className="flex items-center gap-2 py-1 text-sm text-[#475569]">
                        <div className="w-4 h-4 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-xs font-semibold bg-[#F4F6F9] text-[#475569] rounded-lg hover:bg-[#E5E8EF] transition-colors">👁 GST Cert</button>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-[#F4F6F9] text-[#475569] rounded-lg hover:bg-[#E5E8EF] transition-colors">👁 PAN Card</button>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-[#F4F6F9] text-[#475569] rounded-lg hover:bg-[#E5E8EF] transition-colors">👁 Bank Proof</button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={actionId === m.id}
                      onClick={() => setKyc(m.id, 'verified')}
                      className="px-4 py-2 text-sm font-semibold bg-[#4F46E5] text-white rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
                    >
                      ✓ Approve KYC
                    </button>
                    <button
                      disabled={actionId === m.id}
                      onClick={() => setKyc(m.id, 'rejected')}
                      className="px-4 py-2 text-sm font-semibold bg-[#FEE2E2] text-[#991B1B] rounded-xl hover:bg-[#FECACA] transition-colors disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                    <button className="px-4 py-2 text-sm font-semibold bg-[#F4F6F9] text-[#475569] rounded-xl hover:bg-[#E5E8EF] transition-colors">
                      📨 Request Docs
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Section */}
      {rejected.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-[#0F172A] mb-4">Rejected Applications</h2>
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Merchant</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {rejected.map(m => (
                  <tr key={m.id} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-sm text-[#0F172A]">{m.business_name}</td>
                    <td className="px-5 py-3.5 text-sm text-[#64748B]">{m.email}</td>
                    <td className="px-5 py-3.5">
                      <button
                        disabled={actionId === m.id}
                        onClick={() => setKyc(m.id, 'verified')}
                        className="px-3 py-1.5 text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-lg hover:bg-[#E0E7FF] transition-colors disabled:opacity-50"
                      >
                        Re-approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && pending.length === 0 && rejected.length === 0 && (
        <div className="bg-[#F0FDF4] border border-[#A7F3D0] rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-base font-bold text-[#065F46]">All merchants are KYC verified!</div>
          <div className="text-sm text-[#6EE7B7] mt-1">No pending or rejected applications.</div>
        </div>
      )}
    </div>
  );
}
