'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

interface Dispute {
  id: string; business_name: string; mozopost_order_id: string;
  awb_number: string | null; courier_name: string | null;
  seller_weight_gm: number; courier_weight_gm: number;
  difference_gm: number; difference_pct: string; disputed_amount: string;
  approved_refund_amount: string | null; status: string;
  auto_flagged: boolean; escalated: boolean; reason: string;
  seller_remarks: string | null; created_at: string;
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

const STATUS_STYLE: Record<string, string> = {
  open:             'bg-[#FEF9C3] text-[#854D0E]',
  under_review:     'bg-[#DBEAFE] text-[#1E40AF]',
  approved:         'bg-[#D1FAE5] text-[#065F46]',
  rejected:         'bg-[#F1F5F9] text-[#475569]',
  refund_pending:   'bg-[#FEF9C3] text-[#854D0E]',
  refund_processed: 'bg-[#D1FAE5] text-[#065F46]',
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
  const [statusFilter, setStatusFilter] = useState('');

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

  async function filterByStatus(status: string) {
    setStatusFilter(status);
    const res = await api.get('/admin/weight-disputes', { params: status ? { status } : {} });
    setDisputes(res.data.disputes);
  }

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Weight Dispute Management</h1>
          <p className="text-sm text-[#64748B] mt-1">Review and resolve courier weight discrepancies.</p>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Open</div>
            <div className="text-2xl font-bold text-[#CA8A04] font-mono">{stats.open}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Under Review</div>
            <div className="text-2xl font-bold text-[#1E40AF] font-mono">{stats.under_review}</div>
          </div>
          <div className="bg-[#FEF9C3] p-5 rounded-2xl border border-[#FEF08A] shadow-sm">
            <div className="text-[10px] font-bold text-[#854D0E] uppercase tracking-widest mb-2">Refund Pending</div>
            <div className="text-2xl font-bold text-[#CA8A04] font-mono">₹{stats.refund_pending_amt.toFixed(0)}</div>
          </div>
          <div className="bg-[#F0FDF4] p-5 rounded-2xl border border-[#A7F3D0] shadow-sm">
            <div className="text-[10px] font-bold text-[#065F46] uppercase tracking-widest mb-2">Refunded</div>
            <div className="text-2xl font-bold text-[#16A34A] font-mono">₹{stats.refund_done_amt.toFixed(0)}</div>
          </div>
          <div className="bg-[#FEF2F2] p-5 rounded-2xl border border-[#FECACA] shadow-sm">
            <div className="text-[10px] font-bold text-[#991B1B] uppercase tracking-widest mb-2">Auto-Flagged</div>
            <div className="text-2xl font-bold text-[#DC2626] font-mono">{stats.auto_flagged}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Total Disputed</div>
            <div className="text-2xl font-bold text-[#0F172A] font-mono">₹{stats.total_disputed.toFixed(0)}</div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {resolveId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-96 border border-[#E5E8EF]">
            <h3 className="text-base font-bold text-[#0F172A] mb-4">Resolve Dispute</h3>
            <div className="flex rounded-xl border border-[#E5E8EF] overflow-hidden mb-4">
              <button type="button" onClick={() => setResolveAction('approve')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${resolveAction === 'approve' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-white text-[#94A3B8]'}`}>
                ✓ Approve Refund
              </button>
              <button type="button" onClick={() => setResolveAction('reject')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-l border-[#E5E8EF] ${resolveAction === 'reject' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-white text-[#94A3B8]'}`}>
                ✕ Reject
              </button>
            </div>
            {resolveAction === 'approve' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Approved Refund Amount (₹)</label>
                <input type="number" value={approveAmt} onChange={e => setApproveAmt(e.target.value)}
                  placeholder="Leave blank = full disputed amount"
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 placeholder:text-[#94A3B8]" />
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#475569] mb-1.5 uppercase tracking-wide">Admin Remarks</label>
              <textarea rows={2} value={adminRemarks} onChange={e => setAdminRemarks(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#E5E8EF] rounded-xl outline-none focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/10 resize-none" />
            </div>
            <div className="flex gap-3">
              <button disabled={resolving} onClick={resolve}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${resolveAction === 'approve' ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]' : 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'}`}>
                {resolving ? 'Saving...' : resolveAction === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
              <button onClick={() => setResolveId(null)}
                className="px-4 py-2.5 bg-white border border-[#E5E8EF] text-[#475569] text-sm font-semibold rounded-xl hover:bg-[#F8F9FB] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disputes Table */}
      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E8EF] bg-[#F8F9FB] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F172A]">All Disputes</h2>
          <select value={statusFilter} onChange={e => filterByStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E8EF] rounded-xl bg-white text-[#0F172A] outline-none focus:border-[#4F46E5]">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="refund_pending">Refund Pending</option>
            <option value="refund_processed">Refund Processed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading disputes...</div>
        ) : disputes.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">⚖️</div>
            <div className="text-sm font-semibold text-[#0F172A]">No disputes found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Merchant</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Courier</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Seller Wt</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Courier Wt</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Diff%</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Disputed ₹</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {disputes.map(d => (
                  <tr key={d.id} className={`hover:bg-[#F8F9FB] transition-colors ${d.auto_flagged ? 'bg-[#FFF7F7]' : ''}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0F172A]">{d.business_name}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#4F46E5]">{d.mozopost_order_id}</div>
                      <div className="flex gap-1 mt-1">
                        {d.auto_flagged && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEE2E2] text-[#991B1B]">auto-flagged</span>}
                        {d.escalated && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEE2E2] text-[#991B1B]">escalated</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#64748B]">{d.courier_name || '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[#0F172A]">{d.seller_weight_gm}g</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-[#0F172A]">{d.courier_weight_gm}g</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-[#DC2626]">+{parseFloat(d.difference_pct).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-sm font-mono font-bold text-[#0F172A]">₹{parseFloat(d.disputed_amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[d.status] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {['open', 'under_review'].includes(d.status) && (
                          <button onClick={() => { setResolveId(d.id); setResolveAction('approve'); setApproveAmt(d.disputed_amount); }}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] rounded-lg hover:bg-[#E0E7FF] transition-colors">
                            Resolve
                          </button>
                        )}
                        {d.status === 'refund_pending' && (
                          <button disabled={refunding === d.id} onClick={() => processRefund(d.id)}
                            className="px-3 py-1.5 text-xs font-semibold bg-[#D1FAE5] text-[#065F46] rounded-lg hover:bg-[#A7F3D0] transition-colors disabled:opacity-50">
                            {refunding === d.id ? '...' : 'Process Refund'}
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

      {/* Courier-wise Report */}
      {report.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-[#0F172A] mb-4">Courier-wise Dispute Report</h2>
          <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Courier</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Open</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Approved</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Rejected</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Avg Diff%</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Disputed ₹</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Refunded ₹</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {report.map(r => (
                    <tr key={r.courier_code} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="px-5 py-3.5 text-sm font-semibold text-[#0F172A]">{r.courier_name || r.courier_code}</td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#0F172A]">{r.total_disputes}</td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FEF9C3] text-[#854D0E]">{r.open}</span></td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#D1FAE5] text-[#065F46]">{r.approved}</span></td>
                      <td className="px-5 py-3.5"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569]">{r.rejected}</span></td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#DC2626]">{r.avg_diff_pct}%</td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[#0F172A]">₹{r.total_disputed_amt.toFixed(0)}</td>
                      <td className="px-5 py-3.5 text-sm font-bold font-mono text-[#16A34A]">₹{r.total_refunded_amt.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
