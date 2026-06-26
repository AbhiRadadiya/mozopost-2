'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/admin/referrals'),
        api.get('/admin/referrals/stats'),
      ]);
      setReferrals(listRes.data.referrals);
      setStats(statsRes.data.stats);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function payout(id: string) {
    setPayingId(id);
    try {
      const { data } = await api.post(`/admin/referrals/${id}/payout`);
      alert(data.message);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setPayingId(null); }
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Referral Management</h1>
        <p className="text-sm text-[#64748B] mt-1">Track and manage referral commissions and payouts.</p>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Total Referrals</div>
            <div className="text-2xl font-bold text-[#0F172A] font-mono">{stats.total_referrals}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Commission Earned</div>
            <div className="text-2xl font-bold text-[#16A34A] font-mono">₹{parseFloat(stats.total_commission_earned || 0).toFixed(0)}</div>
          </div>
          <div className="bg-[#FEF9C3] p-5 rounded-2xl border border-[#FEF08A] shadow-sm">
            <div className="text-[10px] font-bold text-[#854D0E] uppercase tracking-widest mb-2">Pending Payout</div>
            <div className="text-2xl font-bold text-[#CA8A04] font-mono">₹{parseFloat(stats.pending_payout || 0).toFixed(0)}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Active Referrals</div>
            <div className="text-2xl font-bold text-[#4F46E5] font-mono">{stats.active}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB]">
          <h2 className="text-sm font-bold text-[#0F172A]">All Referrals</h2>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading referrals...</div>
        ) : referrals.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">🔗</div>
            <div className="text-sm font-semibold text-[#0F172A]">No referrals yet</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Referrer</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Code</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Referred</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Commission</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Earned</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Paid</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {referrals.map(r => {
                  const pending = parseFloat(r.total_commission || 0) - parseFloat(r.paid_commission || 0);
                  return (
                    <tr key={r.id} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="text-sm font-semibold text-[#0F172A]">{r.referrer_name}</div>
                        <div className="text-xs text-[#94A3B8]">{r.referrer_email}</div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#4F46E5]">{r.referral_code}</td>
                      <td className="px-5 py-3.5 text-sm text-[#0F172A]">{r.referred_name || '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#0F172A]">{r.commission_pct}%</td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#0F172A]">₹{parseFloat(r.total_commission || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#16A34A]">₹{parseFloat(r.paid_commission || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${r.status === 'paid' ? 'bg-[#D1FAE5] text-[#065F46]' : r.status === 'active' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#FEF9C3] text-[#854D0E]'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {pending > 0 && (
                          <button disabled={payingId === r.id} onClick={() => payout(r.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition-colors disabled:opacity-50">
                            Pay ₹{pending.toFixed(0)}
                          </button>
                        )}
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
  );
}
