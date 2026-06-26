'use client';

import { useEffect, useState, useCallback } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Card, CardHead, Badge } from '@/components/ui';
import { RISK_BADGE, PageHeader, Toast, ErrorBar } from '../_shared';

const LEVELS = ['', 'New', 'Verified', 'Trusted', 'Enterprise'];

export default function RiskScoresPage() {
  const [scores, setScores] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async (level = '') => {
    setLoading(true);
    try {
      const { data } = await api.get('/super-admin/risk/scores', { params: level ? { riskLevel: level } : {} });
      setScores(data.scores || []); setSummary(data.summary || null);
    } catch (e) { setErr(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(filter); }, [filter, load]);

  async function evaluate(id: string) {
    setBusy(true);
    try { await api.post(`/super-admin/risk/scores/${id}/evaluate`); flash('Risk score re-evaluated'); load(filter); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function action(id: string, act: string) {
    const reason = act === 'activate' ? '' : window.prompt(`Reason for "${act}"?`) || '';
    if (act !== 'activate' && !reason) return;
    setBusy(true);
    try { const { data } = await api.patch(`/super-admin/risk/merchants/${id}/action`, { action: act, reason }); flash(data.message); load(filter); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }
  async function setLevel(id: string, level: number) {
    setBusy(true);
    try { const { data } = await api.patch(`/super-admin/risk/merchants/${id}/level`, { level }); flash(data.message); load(filter); }
    catch (e) { setErr(apiErrorMessage(e)); } finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Merchant Risk Scores" subtitle="Evaluate and act on merchant fraud risk" />
      <Toast msg={toast} onClose={() => setToast('')} />
      <ErrorBar msg={err} onClose={() => setErr('')} />

      {summary && (
        <div className="mb-4 grid grid-cols-4 gap-3">
          {(['safe', 'medium', 'high', 'critical'] as const).map(lvl => (
            <button key={lvl} onClick={() => setFilter(filter === lvl ? '' : lvl)}
              className={`nb-card p-4 text-left transition-all ${filter === lvl ? 'ring-2 ring-[#7C3AED]' : ''}`}>
              <div className="font-mono-nb text-[10px] uppercase tracking-wide text-[#64748B]">{lvl}</div>
              <div className="font-mono-nb text-2xl font-bold text-[#0F172A]">{summary[lvl] ?? 0}</div>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHead>
          <span className="font-bold text-[#0F172A]">Merchants {filter && `· ${filter}`}</span>
          {filter && <button onClick={() => setFilter('')} className="text-xs font-semibold text-[#7C3AED]">Clear filter</button>}
        </CardHead>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8FAFC] text-left font-mono-nb text-[10px] uppercase text-[#64748B]">
                <th className="px-4 py-2.5">Merchant</th><th className="px-4 py-2.5">Score</th>
                <th className="px-4 py-2.5">Level</th><th className="px-4 py-2.5">Balance</th>
                <th className="px-4 py-2.5">Flags</th><th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">Loading…</td></tr>}
              {!loading && scores.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[#94A3B8]">No merchants found</td></tr>}
              {scores.map((s: any) => (
                <tr key={s.seller_id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#0F172A]">{s.business_name}</div>
                    <div className="font-mono-nb text-[11px] text-[#94A3B8]">{s.email}</div>
                  </td>
                  <td className="px-4 py-3"><span className="font-mono-nb font-bold text-[#0F172A]">{s.risk_score}</span></td>
                  <td className="px-4 py-3"><Badge className={RISK_BADGE[s.risk_level]}>{s.risk_level}</Badge></td>
                  <td className="px-4 py-3 font-mono-nb">₹{Number(s.balance || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(s.flags) ? s.flags : []).slice(0, 3).map((f: string, i: number) => (
                        <span key={i} className="rounded bg-[#FEF3C7] px-1.5 py-0.5 font-mono-nb text-[9px] text-[#92400E]">{f}</span>
                      ))}
                      {(!s.flags || s.flags.length === 0) && <span className="text-[11px] text-[#CBD5E1]">none</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <button disabled={busy} onClick={() => evaluate(s.seller_id)}
                        className="rounded-md border border-[#E5E8EF] px-2 py-1 text-[11px] font-semibold text-[#475569] hover:bg-[#F1F5F9]">Re-evaluate</button>
                      <select disabled={busy} value={s.merchant_level || 1} onChange={e => setLevel(s.seller_id, Number(e.target.value))}
                        className="rounded-md border border-[#E5E8EF] px-1.5 py-1 text-[11px] font-semibold text-[#475569]">
                        {[1, 2, 3, 4].map(l => <option key={l} value={l}>L{l} {LEVELS[l]}</option>)}
                      </select>
                      <button disabled={busy} onClick={() => action(s.seller_id, 'hold_cod')}
                        className="rounded-md bg-[#FEF3C7] px-2 py-1 text-[11px] font-semibold text-[#92400E] hover:brightness-95">Hold COD</button>
                      <button disabled={busy} onClick={() => action(s.seller_id, 'suspend')}
                        className="rounded-md bg-[#FEE2E2] px-2 py-1 text-[11px] font-semibold text-[#991B1B] hover:brightness-95">Suspend</button>
                      <button disabled={busy} onClick={() => action(s.seller_id, 'activate')}
                        className="rounded-md bg-[#D1FAE5] px-2 py-1 text-[11px] font-semibold text-[#065F46] hover:brightness-95">Activate</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
