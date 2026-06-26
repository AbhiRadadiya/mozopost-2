'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

interface CreditFacility {
  id: string; seller_id: string; business_name: string; email: string;
  credit_limit: string; wallet_balance: string; credit_outstanding: string;
  available_credit: string; utilization_pct: string; status: string;
  billing_cycle: string; auto_block_at_limit: boolean;
}
interface Stats {
  total_merchants_with_credit: string; total_credit_limit: number;
  total_outstanding: number; total_available: number;
  frozen_count: string; exhausted_count: string; near_limit_count: string;
}
interface Merchant { id: string; business_name: string; email: string; }

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-[#D1FAE5] text-[#065F46]',
  frozen:    'bg-[#DBEAFE] text-[#1E40AF]',
  suspended: 'bg-[#FEE2E2] text-[#991B1B]',
  removed:   'bg-[#F1F5F9] text-[#475569]',
};

export default function AdminCreditPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [facilities, setFacilities] = useState<CreditFacility[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [assignForm, setAssignForm] = useState({ sellerId: '', creditLimit: '', billingCycle: 'D2', autoBlockAtLimit: true, alertThresholdPct: 80 });
  const [assigning, setAssigning] = useState(false);
  const [recoverFacilityId, setRecoverFacilityId] = useState('');
  const [codAmount, setCodAmount] = useState('');
  const [recovering, setRecovering] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [statsRes, facilitiesRes, merchantsRes] = await Promise.all([
        api.get('/admin/credit/stats'),
        api.get('/admin/credit'),
        api.get('/admin/merchants'),
      ]);
      setStats(statsRes.data.stats);
      setFacilities(facilitiesRes.data.creditFacilities);
      setMerchants(merchantsRes.data.merchants);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssigning(true); setError(''); setMessage('');
    try {
      const { data } = await api.post('/admin/credit/assign', {
        sellerId: assignForm.sellerId,
        creditLimit: parseFloat(assignForm.creditLimit),
        billingCycle: assignForm.billingCycle,
        autoBlockAtLimit: assignForm.autoBlockAtLimit,
        alertThresholdPct: assignForm.alertThresholdPct,
      });
      setMessage(data.message);
      setAssignForm({ sellerId: '', creditLimit: '', billingCycle: 'D2', autoBlockAtLimit: true, alertThresholdPct: 80 });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setAssigning(false); }
  }

  async function changeStatus(id: string, action: 'freeze' | 'unfreeze' | 'remove') {
    try {
      await api.patch(`/admin/credit/${id}/status`, { action });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function handleRecover(e: React.FormEvent) {
    e.preventDefault();
    setRecovering(true); setError(''); setMessage('');
    try {
      const { data } = await api.post(`/admin/credit/${recoverFacilityId}/recover-from-cod`, { codSettlementAmount: parseFloat(codAmount) });
      setMessage(`Recovered ₹${data.recovered.toFixed(2)} · Released ₹${data.releasedToMerchant.toFixed(2)} to merchant`);
      setCodAmount(''); setRecoverFacilityId('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setRecovering(false); }
  }

  const utilizationPct = stats && stats.total_credit_limit > 0
    ? Math.round((stats.total_outstanding / stats.total_credit_limit) * 100) : 0;

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Credit / Postpaid Wallet Management</h1>
        <p className="text-sm text-[#64748B] mt-1">Manage merchant credit facilities and outstanding balances.</p>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}
      {message && <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#A7F3D0] text-sm text-[#065F46]">✓ {message}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Total Credit Limit</div>
            <div className="text-2xl font-bold text-[#0F172A] font-mono">₹{stats.total_credit_limit.toFixed(0)}</div>
          </div>
          <div className="bg-[#FEF2F2] p-5 rounded-2xl border border-[#FECACA] shadow-sm">
            <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-2">Total Outstanding</div>
            <div className="text-2xl font-bold text-[#DC2626] font-mono">₹{stats.total_outstanding.toFixed(0)}</div>
          </div>
          <div className="bg-[#F0FDF4] p-5 rounded-2xl border border-[#A7F3D0] shadow-sm">
            <div className="text-[10px] font-bold text-[#065F46] uppercase tracking-widest mb-2">Available Credit</div>
            <div className="text-2xl font-bold text-[#16A34A] font-mono">₹{stats.total_available.toFixed(0)}</div>
          </div>
          <div className={`p-5 rounded-2xl border shadow-sm ${utilizationPct >= 80 ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#FEF9C3] border-[#FEF08A]'}`}>
            <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${utilizationPct >= 80 ? 'text-[#991B1B]' : 'text-[#854D0E]'}`}>Platform Utilization</div>
            <div className={`text-2xl font-bold font-mono ${utilizationPct >= 80 ? 'text-[#DC2626]' : 'text-[#CA8A04]'}`}>{utilizationPct}%</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">On Credit</div>
            <div className="text-2xl font-bold text-[#4F46E5] font-mono">{stats.total_merchants_with_credit}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Near Limit</div>
            <div className="text-2xl font-bold text-[#CA8A04] font-mono">{stats.near_limit_count}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Exhausted</div>
            <div className="text-2xl font-bold text-[#DC2626] font-mono">{stats.exhausted_count}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Frozen</div>
            <div className="text-2xl font-bold text-[#1E40AF] font-mono">{stats.frozen_count}</div>
          </div>
        </div>
      )}

      {parseInt(stats?.near_limit_count || '0') > 0 && (
        <div className="p-4 rounded-xl bg-[#FEF9C3] border border-[#FEF08A] text-sm font-semibold text-[#854D0E] flex items-center gap-2">
          ⚠ {stats?.near_limit_count} merchant(s) have used &gt;80% of their credit limit
        </div>
      )}

      {/* Forms Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assign Credit */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-gradient-to-r from-[#EEF2FF] to-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">💳 Assign / Update Credit Facility</h2>
          </div>
          <form onSubmit={handleAssign} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Merchant *</label>
              <select required value={assignForm.sellerId} onChange={e => setAssignForm(p => ({ ...p, sellerId: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10">
                <option value="">Select merchant...</option>
                {merchants.map(m => <option key={m.id} value={m.id}>{m.business_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Credit Limit (₹) *</label>
                <input type="number" required value={assignForm.creditLimit} onChange={e => setAssignForm(p => ({ ...p, creditLimit: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Billing Cycle</label>
                <select value={assignForm.billingCycle} onChange={e => setAssignForm(p => ({ ...p, billingCycle: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10">
                  <option value="daily">Daily</option>
                  <option value="D1">D+1</option>
                  <option value="D2">D+2</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F4F6F9] border border-[#E5E8EF]">
              <div>
                <div className="text-sm font-semibold text-[#0F172A]">Auto-block at limit</div>
                <div className="text-xs text-[#94A3B8]">Block new orders when credit exhausted</div>
              </div>
              <button type="button" onClick={() => setAssignForm(p => ({ ...p, autoBlockAtLimit: !p.autoBlockAtLimit }))}
                className={`w-10 h-6 rounded-full relative transition-colors border-2 ${assignForm.autoBlockAtLimit ? 'bg-[#4F46E5] border-[#4F46E5]' : 'bg-[#E5E8EF] border-[#E5E8EF]'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow ${assignForm.autoBlockAtLimit ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
            <button type="submit" disabled={assigning}
              className="w-full py-2.5 bg-[#4F46E5] text-white text-sm font-semibold rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50">
              {assigning ? 'Saving...' : '💳 Assign / Update Credit'}
            </button>
          </form>
        </div>

        {/* COD Recovery */}
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
            <h2 className="text-sm font-bold text-[#0F172A]">♻ Auto COD Recovery</h2>
          </div>
          <form onSubmit={handleRecover} className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-xs text-[#4338CA]">
              <div className="font-bold mb-1">How it works:</div>
              When a COD settlement arrives, the system first recovers the outstanding credit balance, then releases the remainder to the merchant's wallet.
              <div className="font-mono mt-2 bg-[#E0E7FF] px-2 py-1 rounded text-[11px]">Outstanding: ₹500 · COD: ₹2,000 → Recover ₹500 · Release ₹1,500</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Merchant Credit Facility *</label>
              <select required value={recoverFacilityId} onChange={e => setRecoverFacilityId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10">
                <option value="">Select merchant...</option>
                {facilities.filter(f => parseFloat(f.credit_outstanding) > 0).map(f => (
                  <option key={f.id} value={f.id}>{f.business_name} — outstanding ₹{parseFloat(f.credit_outstanding).toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">COD Settlement Amount (₹) *</label>
              <input type="number" required value={codAmount} onChange={e => setCodAmount(e.target.value)} placeholder="Total COD received"
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]" />
            </div>
            <button type="submit" disabled={recovering}
              className="w-full py-2.5 bg-[#16A34A] text-white text-sm font-semibold rounded-xl hover:bg-[#15803D] transition-colors disabled:opacity-50">
              {recovering ? 'Processing...' : '♻ Recover & Release'}
            </button>
          </form>
        </div>
      </div>

      {/* Credit Utilization Table */}
      <div>
        <h2 className="text-base font-bold text-[#0F172A] mb-4">Credit Utilization Dashboard</h2>
        <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading facilities...</div>
          ) : facilities.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-3xl mb-3">💳</div>
              <div className="text-sm font-semibold text-[#0F172A]">No credit facilities assigned yet</div>
              <div className="text-xs text-[#94A3B8] mt-1">Use the form above to assign credit to a merchant.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Merchant</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Wallet Bal</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Credit Limit</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Used Credit</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Available</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Utilization</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Cycle</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {facilities.map(f => {
                    const utilPct = parseFloat(f.utilization_pct);
                    const isExhausted = parseFloat(f.credit_outstanding) >= parseFloat(f.credit_limit);
                    const isNear = utilPct >= 80 && !isExhausted;
                    return (
                      <tr key={f.id} className={`hover:bg-[#F8F9FB] transition-colors ${isExhausted ? 'bg-[#FFF7F7]' : isNear ? 'bg-[#FFFBEB]' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-[#0F172A]">{f.business_name}</div>
                          {isExhausted && <span className="text-[10px] font-bold text-[#DC2626]">❌ exhausted</span>}
                          {isNear && <span className="text-[10px] font-bold text-[#CA8A04]">⚠ near limit</span>}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-[#0F172A]">₹{parseFloat(f.wallet_balance).toFixed(0)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-[#0F172A]">₹{parseFloat(f.credit_limit).toFixed(0)}</td>
                        <td className="px-4 py-3 text-sm font-bold font-mono text-[#DC2626]">₹{parseFloat(f.credit_outstanding).toFixed(0)}</td>
                        <td className="px-4 py-3 text-sm font-bold font-mono text-[#16A34A]">₹{parseFloat(f.available_credit).toFixed(0)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${isExhausted ? 'bg-[#DC2626]' : isNear ? 'bg-[#CA8A04]' : 'bg-[#16A34A]'}`}
                                style={{ width: `${Math.min(100, utilPct)}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${isExhausted ? 'text-[#DC2626]' : isNear ? 'text-[#CA8A04]' : 'text-[#16A34A]'}`}>{utilPct.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-[#475569]">{f.billing_cycle}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[f.status] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                            {f.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {f.status === 'active' && (
                              <button onClick={() => changeStatus(f.id, 'freeze')}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-[#DBEAFE] text-[#1E40AF] rounded-lg hover:bg-[#BFDBFE] transition-colors">Freeze</button>
                            )}
                            {f.status === 'frozen' && (
                              <button onClick={() => changeStatus(f.id, 'unfreeze')}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-[#D1FAE5] text-[#065F46] rounded-lg hover:bg-[#A7F3D0] transition-colors">Unfreeze</button>
                            )}
                            {f.status !== 'removed' && (
                              <button onClick={() => changeStatus(f.id, 'remove')}
                                className="px-2.5 py-1.5 text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] rounded-lg hover:bg-[#FECACA] transition-colors">Remove</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
