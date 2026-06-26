'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

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

const STATUS_STYLE: Record<string, string> = {
  active:      'bg-[#D1FAE5] text-[#065F46]',
  suspended:   'bg-[#FEE2E2] text-[#991B1B]',
  pending_kyc: 'bg-[#FEF9C3] text-[#854D0E]',
  inactive:    'bg-[#F1F5F9] text-[#475569]',
};
const KYC_STYLE: Record<string, string> = {
  verified:  'bg-[#D1FAE5] text-[#065F46]',
  rejected:  'bg-[#FEE2E2] text-[#991B1B]',
  pending:   'bg-[#FEF9C3] text-[#854D0E]',
  submitted: 'bg-[#DBEAFE] text-[#1E40AF]',
};

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/merchants');
      setMerchants(data.merchants);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function setStatus(sellerId: string, status: string) {
    setActionId(sellerId);
    try {
      await api.patch(`/admin/merchants/${sellerId}/status`, { status });
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setActionId(null); }
  }

  async function setKyc(sellerId: string, kycStatus: string) {
    setActionId(sellerId);
    try {
      await api.patch(`/admin/merchants/${sellerId}/kyc`, { kycStatus });
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setActionId(null); }
  }

  const filtered = merchants.filter(m =>
    !search || m.business_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Merchant Management</h1>
          <p className="text-sm text-[#64748B] mt-1">{merchants.length} merchants registered on the platform.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search merchant..."
            className="px-4 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 w-56"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B] font-medium flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading merchants...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">👥</div>
            <div className="text-sm font-semibold text-[#0F172A]">No merchants found</div>
            <div className="text-xs text-[#94A3B8] mt-1">Try adjusting your search</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Merchant</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Orders</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Wallet</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">KYC</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-sm text-[#0F172A]">{m.business_name}</div>
                      {m.gstin && <div className="text-[11px] text-[#94A3B8] font-mono mt-0.5">{m.gstin}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-[#64748B]">{m.email}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A] font-mono">{m.order_count}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A] font-mono">₹{parseFloat(m.wallet_balance || '0').toFixed(0)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${KYC_STYLE[m.kyc_status] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                        {m.kyc_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[m.status] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {m.kyc_status !== 'verified' && (
                          <button
                            disabled={actionId === m.id}
                            onClick={() => setKyc(m.id, 'verified')}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#D1FAE5] text-[#065F46] rounded-lg hover:bg-[#A7F3D0] transition-colors disabled:opacity-50"
                          >
                            Approve KYC
                          </button>
                        )}
                        {m.status === 'active' ? (
                          <button
                            disabled={actionId === m.id}
                            onClick={() => setStatus(m.id, 'suspended')}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] rounded-lg hover:bg-[#FECACA] transition-colors disabled:opacity-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            disabled={actionId === m.id}
                            onClick={() => setStatus(m.id, 'active')}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-lg hover:bg-[#E0E7FF] transition-colors disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
