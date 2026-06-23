'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge } from '@/components/ui';

interface DisputeSummary {
  open: string; under_review: string; approved: string;
  rejected: string; refund_pending: string; refund_processed: string;
  total_disputed: number; total_approved: number; auto_flagged_count: string;
}

interface Dispute {
  id: string;
  order_id: string;
  mozopost_order_id: string;
  awb_number: string | null;
  courier_name: string | null;
  seller_weight_gm: number;
  volumetric_weight_gm: number | null;
  courier_weight_gm: number;
  difference_gm: number;
  difference_pct: string;
  disputed_amount: string;
  approved_refund_amount: string | null;
  status: string;
  auto_flagged: boolean;
  escalated: boolean;
  created_at: string;
}

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-c4',
  under_review: 'bg-c1',
  approved: 'bg-c3',
  rejected: 'bg-[#999] text-white',
  refund_pending: 'bg-c4',
  refund_processed: 'bg-c3',
};

const raiseForm = { orderId: '', courierWeightGm: '', reason: 'wrong_weight', sellerRemarks: '' };

export default function WeightDisputesPage() {
  const [summary, setSummary] = useState<DisputeSummary | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(raiseForm);
  const [raising, setRaising] = useState(false);
  const [raiseError, setRaiseError] = useState('');
  const [raiseSuccess, setRaiseSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [sumRes, listRes] = await Promise.all([
        api.get('/weight-disputes/summary'),
        api.get('/weight-disputes'),
      ]);
      setSummary(sumRes.data.summary);
      setDisputes(listRes.data.disputes);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function filterByStatus(status: string) {
    setFilterStatus(status);
    try {
      const res = await api.get('/weight-disputes', { params: status ? { status } : {} });
      setDisputes(res.data.disputes);
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  function setField(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }

  async function handleRaise(e: React.FormEvent) {
    e.preventDefault();
    setRaiseError(''); setRaiseSuccess('');
    if (!form.orderId || !form.courierWeightGm) {
      setRaiseError('Order ID and courier weight are required');
      return;
    }
    setRaising(true);
    try {
      const { data } = await api.post('/weight-disputes', {
        orderId: form.orderId,
        courierWeightGm: parseInt(form.courierWeightGm),
        reason: form.reason,
        sellerRemarks: form.sellerRemarks || undefined,
      });
      setRaiseSuccess(
        `Dispute raised! Difference: ${data.dispute.difference_gm}g (${parseFloat(data.dispute.difference_pct).toFixed(1)}%). Disputed amount: ₹${parseFloat(data.dispute.disputed_amount).toFixed(2)}`
      );
      setForm(raiseForm);
      load();
    } catch (err) { setRaiseError(apiErrorMessage(err)); }
    finally { setRaising(false); }
  }

  async function acceptCharges(id: string) {
    try {
      await api.patch(`/weight-disputes/${id}/accept`);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  async function escalate(id: string) {
    try {
      await api.patch(`/weight-disputes/${id}/escalate`);
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Weight Discrepancy Management</h1>
      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}

      {/* Summary cards */}
      {summary && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <button onClick={() => filterByStatus('open')} className={`nb-card p-3 text-left cursor-pointer ${filterStatus==='open'?'bg-c4':''}`}>
            <div className="font-mono-nb text-[9px] uppercase">Open Disputes</div>
            <div className="font-mono-nb text-2xl font-bold">{summary.open}</div>
          </button>
          <button onClick={() => filterByStatus('refund_pending')} className={`nb-card p-3 text-left cursor-pointer ${filterStatus==='refund_pending'?'bg-c3':''}`}>
            <div className="font-mono-nb text-[9px] uppercase">Refund Pending</div>
            <div className="font-mono-nb text-2xl font-bold">{summary.refund_pending}</div>
          </button>
          <button onClick={() => filterByStatus('refund_processed')} className={`nb-card p-3 text-left cursor-pointer ${filterStatus==='refund_processed'?'bg-c3':''}`}>
            <div className="font-mono-nb text-[9px] uppercase">Refund Received</div>
            <div className="font-mono-nb text-2xl font-bold text-green-700">{summary.refund_processed}</div>
          </button>
          <button onClick={() => filterByStatus('')} className={`nb-card p-3 text-left cursor-pointer ${!filterStatus?'bg-c5':''}`}>
            <div className="font-mono-nb text-[9px] uppercase">Total Disputed (₹)</div>
            <div className="font-mono-nb text-xl font-bold">₹{summary.total_disputed.toFixed(0)}</div>
          </button>
        </div>
      )}

      {summary && parseInt(summary.auto_flagged_count) > 0 && (
        <div className="mb-4 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb flex items-center justify-between">
          <span>🚨 {summary.auto_flagged_count} shipment(s) auto-flagged for possible overcharge (&gt;20% weight difference)</span>
          <Btn variant="dark" onClick={() => filterByStatus('open')}>Review now</Btn>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Raise dispute form */}
        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">⚖ Raise Weight Dispute</span>
          </CardHead>
          <form onSubmit={handleRaise} className="p-4">
            <Field label="Order ID (UUID from your shipments)" required>
              <Input value={form.orderId} onChange={e => setField('orderId', e.target.value)}
                placeholder="Paste order ID from shipments list" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Courier charged weight (grams)" required>
                <Input type="number" value={form.courierWeightGm}
                  onChange={e => setField('courierWeightGm', e.target.value)}
                  placeholder="e.g. 900 for 900g" required />
              </Field>
              <Field label="Reason">
                <select className="nb-input w-full" value={form.reason} onChange={e => setField('reason', e.target.value)}>
                  <option value="wrong_weight">Wrong weight charged</option>
                  <option value="volumetric_mismatch">Volumetric mismatch</option>
                  <option value="dimensional_error">Dimension error</option>
                  <option value="courier_error">Courier system error</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            <Field label="Your remarks (optional)">
              <textarea className="nb-input w-full" rows={2} value={form.sellerRemarks}
                onChange={e => setField('sellerRemarks', e.target.value)}
                placeholder="Describe what you packed and how you measured..." />
            </Field>

            <div className="mb-3 border-2 border-black bg-c5 p-2 text-[11px]">
              <strong>How it works:</strong> We calculate the weight difference vs your declared weight. If the courier charged &gt;20% more, the order is auto-flagged as a possible overcharge. You can also upload evidence (images, video) after raising.
            </div>

            {raiseError && <div className="mb-3 border-2 border-black bg-c2 p-2 text-xs font-bold text-white">⚠ {raiseError}</div>}
            {raiseSuccess && <div className="mb-3 border-2 border-black bg-c3 p-2 text-xs font-bold">✓ {raiseSuccess}</div>}

            <Btn type="submit" variant="dark" disabled={raising} className="w-full justify-center py-2.5">
              {raising ? 'Raising dispute...' : '⚖ Raise Dispute'}
            </Btn>
          </form>
        </Card>

        {/* Evidence upload instructions */}
        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">📎 Evidence Guide</span>
          </CardHead>
          <div className="p-4 space-y-3 text-xs">
            <div className="border-2 border-black p-3 bg-c5">
              <div className="font-bold mb-1">What to upload after raising</div>
              <div className="text-[11px] space-y-1">
                <div>📸 <strong>Product images</strong> — show the item, ideally with a scale</div>
                <div>📦 <strong>Packaging images</strong> — packed box with measuring tape</div>
                <div>🎥 <strong>Packing video</strong> — weighing video with date/time visible</div>
                <div>🧾 <strong>Invoice copy</strong> — shows declared value and item details</div>
              </div>
            </div>
            <div className="border-2 border-black p-3">
              <div className="font-bold mb-1">Dispute timeline</div>
              <div className="space-y-1 text-[11px]">
                <div><Badge color="bg-c4">Open</Badge> <span className="ml-1">You raised it</span></div>
                <div><Badge color="bg-c1">Under review</Badge> <span className="ml-1">Admin reviewing</span></div>
                <div><Badge color="bg-c3">Approved</Badge> <span className="ml-1">Refund approved by admin</span></div>
                <div><Badge color="bg-c4">Refund pending</Badge> <span className="ml-1">Being processed</span></div>
                <div><Badge color="bg-c3">Refund processed</Badge> <span className="ml-1">Credited to wallet ✓</span></div>
              </div>
            </div>
            <div className="border-2 border-black bg-c2 p-2 text-xs font-bold text-white text-center">
              🚨 Auto-flagged when courier charges &gt;20% more than declared weight
            </div>
          </div>
        </Card>
      </div>

      {/* Disputes list */}
      <h2 className="mb-3 mt-6 text-lg font-bold">
        {filterStatus ? `Disputes — ${filterStatus.replace('_', ' ')}` : 'All Disputes'}
        {filterStatus && <button onClick={() => filterByStatus('')} className="ml-2 text-xs font-normal underline text-[#777]">clear filter</button>}
      </h2>
      <Card>
        {loading ? <div className="p-4 text-sm">Loading...</div>
        : disputes.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#777]">
            No disputes {filterStatus ? `with status "${filterStatus}"` : 'yet'}. When a courier charges more than your declared weight, raise a dispute here.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Order</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Your wt</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Courier wt</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Diff</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Disputed ₹</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map(d => (
                  <tr key={d.id} className={`border-b border-[#eee] ${d.auto_flagged ? 'bg-[#fff5f5]' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="font-mono-nb font-bold">{d.mozopost_order_id}</div>
                      {d.auto_flagged && <div className="text-[9px] font-bold text-c2 font-mono-nb">🚨 AUTO-FLAGGED</div>}
                    </td>
                    <td className="px-3 py-2">{d.courier_name || '—'}</td>
                    <td className="font-mono-nb px-3 py-2">{d.seller_weight_gm}g</td>
                    <td className="font-mono-nb px-3 py-2 font-bold text-c2">{d.courier_weight_gm}g</td>
                    <td className="font-mono-nb px-3 py-2">
                      <div className="font-bold">+{d.difference_gm}g</div>
                      <div className="text-[9px] text-c2">{parseFloat(d.difference_pct).toFixed(1)}%</div>
                    </td>
                    <td className="font-mono-nb px-3 py-2 font-bold">
                      ₹{parseFloat(d.disputed_amount).toFixed(2)}
                      {d.approved_refund_amount && (
                        <div className="text-[9px] text-green-700">Approved: ₹{parseFloat(d.approved_refund_amount).toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={STATUS_COLOR[d.status] || 'bg-c5'}>
                        {d.status.replace('_', ' ')}
                      </Badge>
                      {d.escalated && <div className="mt-0.5"><Badge color="bg-c2 text-white">escalated</Badge></div>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {['open', 'under_review'].includes(d.status) && !d.escalated && (
                          <Btn variant="warn" onClick={() => escalate(d.id)}>Escalate</Btn>
                        )}
                        {['open', 'under_review'].includes(d.status) && (
                          <Btn variant="default" onClick={() => acceptCharges(d.id)}>Accept charges</Btn>
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
