'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge } from '@/components/ui';

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string|null>(null);

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

  const STATUS_COLOR: Record<string,string> = { pending:'bg-c4', active:'bg-c1', paid:'bg-c3' };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Referral Management</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white">⚠ {error}</div>}

      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="nb-card p-3 bg-black text-white"><div className="font-mono-nb text-[8px] uppercase opacity-70">Total Referrals</div><div className="font-mono-nb text-2xl font-bold">{stats.total_referrals}</div></div>
          <div className="nb-card p-3 bg-c3"><div className="font-mono-nb text-[8px] uppercase">Commission Earned</div><div className="font-mono-nb text-xl font-bold">₹{parseFloat(stats.total_commission_earned||0).toFixed(0)}</div></div>
          <div className="nb-card p-3 bg-c4"><div className="font-mono-nb text-[8px] uppercase">Pending Payout</div><div className="font-mono-nb text-xl font-bold">₹{parseFloat(stats.pending_payout||0).toFixed(0)}</div></div>
          <div className="nb-card p-3 bg-c5"><div className="font-mono-nb text-[8px] uppercase">Active</div><div className="font-mono-nb text-2xl font-bold">{stats.active}</div></div>
        </div>
      )}

      <Card>
        <CardHead className="bg-black text-white"><span className="font-bold">All Referrals</span></CardHead>
        {loading ? <div className="p-4 text-sm">Loading...</div>
        : referrals.length === 0 ? <div className="p-6 text-center text-sm text-[#777]">No referrals yet.</div>
        : (
          <div className="overflow-auto">
            <table className="w-full text-xs"><thead><tr className="bg-black text-c3">
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Referrer</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Code</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Referred</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Commission %</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Earned ₹</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Paid ₹</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
              <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Action</th>
            </tr></thead><tbody>
              {referrals.map(r => {
                const pending = parseFloat(r.total_commission||0) - parseFloat(r.paid_commission||0);
                return (
                  <tr key={r.id} className="border-b border-[#eee]">
                    <td className="px-3 py-2"><div className="font-bold">{r.referrer_name}</div><div className="text-[#777]">{r.referrer_email}</div></td>
                    <td className="font-mono-nb px-3 py-2 font-bold">{r.referral_code}</td>
                    <td className="px-3 py-2">{r.referred_name || '—'}</td>
                    <td className="font-mono-nb px-3 py-2">{r.commission_pct}%</td>
                    <td className="font-mono-nb px-3 py-2 font-bold">₹{parseFloat(r.total_commission||0).toFixed(2)}</td>
                    <td className="font-mono-nb px-3 py-2 text-green-700">₹{parseFloat(r.paid_commission||0).toFixed(2)}</td>
                    <td className="px-3 py-2"><Badge color={STATUS_COLOR[r.status]||'bg-c5'}>{r.status}</Badge></td>
                    <td className="px-3 py-2">
                      {pending > 0 && (
                        <Btn variant="success" disabled={payingId===r.id} onClick={() => payout(r.id)}>
                          Pay ₹{pending.toFixed(0)}
                        </Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody></table>
          </div>
        )}
      </Card>
    </div>
  );
}
