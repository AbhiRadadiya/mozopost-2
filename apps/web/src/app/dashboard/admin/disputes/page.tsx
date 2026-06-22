'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Badge, StatCard } from '@/components/ui';

interface Dispute {
  id: string;
  business_name: string;
  mozopost_order_id: string;
  awb_number: string | null;
  courier_name: string | null;
  seller_weight_gm: number;
  courier_weight_gm: number;
  difference_gm: number;
  difference_pct: string;
  disputed_amount: string;
  approved_refund_amount: string | null;
  status: string;
  auto_flagged: boolean;
  escalated: boolean;
  reason: string;
  seller_remarks: string | null;
  created_at: string;
}

interface Stats {
  open: string; under_review: string; refund_pending: string;
  refund_processed: string; auto_flagged: string;
  total_disputed: number; refund_pending_amt: number; refund_done_amt: number;
}

interface CourierReport {
  courier_name: string; courier_code: string;
  total_disputes: string; open: string; approved: string; rejected: string;
  total_disputed_amt: number; total_refunded_amt: number; avg_diff_pct: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-c4', under_review: 'bg-c1', approved: 'bg-c3',
  rejected: 'bg-[#999] text-white', refund_pending: 'bg-c4', refund_processed: 'bg-c3',
};

export default function AdminDisputesPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [report, setReport] = useState<CourierReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<'approve' | 'reject'>('approve');
  const [approveAmt, setApproveAmt] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [resolving, setResolving] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [statsRes, listRes, reportRes] = await Promise.all([
        api.get('/admin/weight-disputes/stats'),
        api.get('/admin/weight-disputes'),
        api.get('/admin/weight-disputes/courier-report'),
      ]);
      setStats(statsRes.data.stats);
      setDisputes(listRes.data.disputes);
      setReport(reportRes.data.report);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function resolve() {
    if (!resolveId) return;
    setResolving(true);
    try {
      await api.patch(`/admin/weight-disputes/${resolveId}/resolve`, {
        action: resolveAction,
        approvedAmount: resolveAction === 'approve' ? parseFloat(approveAmt) : undefined,
        adminRemarks: adminRemarks || undefined,
      });
      setResolveId(null); setApproveAmt(''); setAdminRemarks('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setResolving(false); }
  }

  async function processRefund(id: string) {
    setRefunding(id);
    try {
      await api.post(`/admin/weight-disputes/${id}/refund`);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setRefunding(null); }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Weight Dispute Management</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      {stats && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <StatCard label="Open" value={stats.open} bg="bg-c4" />
          <StatCard label="Under review" value={stats.under_review} bg="bg-c1" />
          <StatCard label="Refund pending (₹)" value={`₹${stats.refund_pending_amt.toFixed(0)}`} bg="bg-c4" />
          <StatCard label="Refunded (₹)" value={`₹${stats.refund_done_amt.toFixed(0)}`} bg="bg-c3" />
          <StatCard label="Auto-flagged" value={stats.auto_flagged} bg="bg-c2 text-white" />
          <StatCard label="Total disputed (₹)" value={`₹${stats.total_disputed.toFixed(0)}`} bg="bg-[#555] text-white" />
        </div>
      )}

      {/* Resolve modal inline */}
      {resolveId && (
        <div style={{ minHeight: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <div className="nb-card p-5 w-96 bg-white">
            <div className="font-bold mb-3">Resolve Dispute</div>
            <div className="flex gap-2 mb-3">
              <Btn variant={resolveAction === 'approve' ? 'success' : 'default'} onClick={() => setResolveAction('approve')}>Approve refund</Btn>
              <Btn variant={resolveAction === 'reject' ? 'danger' : 'default'} onClick={() => setResolveAction('reject')}>Reject</Btn>
            </div>
            {resolveAction === 'approve' && (
              <div className="mb-3">
                <label className="font-mono-nb text-[9px] uppercase font-bold block mb-1">Approved refund amount (₹)</label>
                <input className="nb-input w-full" type="number" value={approveAmt} onChange={e => setApproveAmt(e.target.value)} placeholder="Leave blank = full disputed amount" />
              </div>
            )}
            <div className="mb-3">
              <label className="font-mono-nb text-[9px] uppercase font-bold block mb-1">Admin remarks</label>
              <textarea className="nb-input w-full" rows={2} value={adminRemarks} onChange={e => setAdminRemarks(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Btn variant={resolveAction === 'approve' ? 'success' : 'danger'} disabled={resolving} onClick={resolve}>
                {resolving ? 'Saving...' : resolveAction === 'approve' ? 'Confirm approve' : 'Confirm reject'}
              </Btn>
              <Btn onClick={() => setResolveId(null)}>Cancel</Btn>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHead className="bg-black text-white">
          <span className="text-sm font-bold">All Disputes</span>
          <div className="flex gap-2">
            <select className="nb-input text-xs py-1" onChange={async e => {
              const res = await api.get('/admin/weight-disputes', { params: e.target.value ? { status: e.target.value } : {} });
              setDisputes(res.data.disputes);
            }}>
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under review</option>
              <option value="refund_pending">Refund pending</option>
              <option value="refund_processed">Refund processed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </CardHead>
        {loading ? <div className="p-4 text-sm">Loading...</div>
        : disputes.length === 0 ? <div className="p-4 text-sm text-[#777]">No disputes yet.</div>
        : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Seller wt</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier wt</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Diff %</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Disputed ₹</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map(d => (
                  <tr key={d.id} className={`border-b border-[#eee] ${d.auto_flagged ? 'bg-[#fff5f5]' : ''}`}>
                    <td className="px-3 py-2 font-bold">{d.business_name}</td>
                    <td className="font-mono-nb px-3 py-2">
                      <div>{d.mozopost_order_id}</div>
                      {d.auto_flagged && <Badge color="bg-c2 text-white">auto-flagged</Badge>}
                      {d.escalated && <Badge color="bg-c2 text-white">escalated</Badge>}
                    </td>
                    <td className="px-3 py-2">{d.courier_name || '—'}</td>
                    <td className="font-mono-nb px-3 py-2">{d.seller_weight_gm}g</td>
                    <td className="font-mono-nb px-3 py-2 font-bold">{d.courier_weight_gm}g</td>
                    <td className="font-mono-nb px-3 py-2 font-bold text-c2">+{parseFloat(d.difference_pct).toFixed(1)}%</td>
                    <td className="font-mono-nb px-3 py-2 font-bold">₹{parseFloat(d.disputed_amount).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <Badge color={STATUS_COLOR[d.status] || 'bg-c5'}>{d.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5">
                        {['open', 'under_review'].includes(d.status) && (
                          <Btn variant="success" onClick={() => { setResolveId(d.id); setResolveAction('approve'); setApproveAmt(d.disputed_amount); }}>
                            Resolve
                          </Btn>
                        )}
                        {d.status === 'refund_pending' && (
                          <Btn variant="success" disabled={refunding === d.id} onClick={() => processRefund(d.id)}>
                            {refunding === d.id ? '...' : 'Process refund'}
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

      {/* Courier-wise report */}
      {report.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 text-lg font-bold">Courier-wise Dispute Report</h2>
          <Card>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-black text-c3">
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Total</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Open</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Approved</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Rejected</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Avg diff %</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Disputed ₹</th>
                    <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Refunded ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map(r => (
                    <tr key={r.courier_code} className="border-b border-[#eee]">
                      <td className="px-3 py-2 font-bold">{r.courier_name || r.courier_code}</td>
                      <td className="font-mono-nb px-3 py-2">{r.total_disputes}</td>
                      <td className="px-3 py-2"><Badge color="bg-c4">{r.open}</Badge></td>
                      <td className="px-3 py-2"><Badge color="bg-c3">{r.approved}</Badge></td>
                      <td className="px-3 py-2"><Badge color="bg-[#999] text-white">{r.rejected}</Badge></td>
                      <td className="font-mono-nb px-3 py-2 font-bold text-c2">{r.avg_diff_pct}%</td>
                      <td className="font-mono-nb px-3 py-2">₹{r.total_disputed_amt.toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2 text-green-700 font-bold">₹{r.total_refunded_amt.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
