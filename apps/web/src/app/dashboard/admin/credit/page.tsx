'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';
import { Btn, Card, CardHead, Field, Input, Badge, StatCard } from '@/components/ui';

interface CreditFacility {
  id: string;
  seller_id: string;
  business_name: string;
  email: string;
  credit_limit: string;
  wallet_balance: string;
  credit_outstanding: string;
  available_credit: string;
  utilization_pct: string;
  status: string;
  billing_cycle: string;
  auto_block_at_limit: boolean;
}

interface Stats {
  total_merchants_with_credit: string;
  total_credit_limit: number;
  total_outstanding: number;
  total_available: number;
  frozen_count: string;
  exhausted_count: string;
  near_limit_count: string;
}

interface Merchant { id: string; business_name: string; email: string; }

const STATUS_COLOR: Record<string, string> = {
  active: 'bg-c3', frozen: 'bg-c2 text-white', suspended: 'bg-c2 text-white', removed: 'bg-[#999] text-white',
};
const RISK_COLOR: Record<string, string> = { ok: 'bg-c3', near_limit: 'bg-c4', exhausted: 'bg-c2 text-white' };

export default function AdminCreditPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [facilities, setFacilities] = useState<CreditFacility[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Assign form
  const [assignForm, setAssignForm] = useState({
    sellerId: '', creditLimit: '', billingCycle: 'D2',
    autoBlockAtLimit: true, alertThresholdPct: 80,
  });
  const [assigning, setAssigning] = useState(false);

  // COD recovery
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
      const { data } = await api.post(`/admin/credit/${recoverFacilityId}/recover-from-cod`, {
        codSettlementAmount: parseFloat(codAmount),
      });
      setMessage(`Recovered ₹${data.recovered.toFixed(2)} · Released ₹${data.releasedToMerchant.toFixed(2)} to merchant`);
      setCodAmount(''); setRecoverFacilityId('');
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setRecovering(false); }
  }

  const utilizationPct = stats && stats.total_credit_limit > 0
    ? Math.round((stats.total_outstanding / stats.total_credit_limit) * 100) : 0;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Credit / Postpaid Wallet Management</h1>

      {error && <div className="mb-3 border-2 border-black bg-c2 p-3 text-xs font-bold text-white shadow-nb">⚠ {error}</div>}
      {message && <div className="mb-3 border-2 border-black bg-c3 p-3 text-xs font-bold shadow-nb">✓ {message}</div>}

      {stats && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <StatCard label="Total credit limit (₹)" value={`₹${stats.total_credit_limit.toFixed(0)}`} bg="bg-black text-white" />
          <StatCard label="Total outstanding (₹)" value={`₹${stats.total_outstanding.toFixed(0)}`} bg="bg-c2 text-white" />
          <StatCard label="Available credit (₹)" value={`₹${stats.total_available.toFixed(0)}`} bg="bg-c3" />
          <StatCard label="Platform utilization" value={`${utilizationPct}%`} bg={utilizationPct >= 80 ? 'bg-c2 text-white' : 'bg-c4'} />
          <StatCard label="Merchants on credit" value={stats.total_merchants_with_credit} bg="bg-c5" />
          <StatCard label="Near limit" value={stats.near_limit_count} bg="bg-c4" />
          <StatCard label="Exhausted" value={stats.exhausted_count} bg="bg-c2 text-white" />
          <StatCard label="Frozen" value={stats.frozen_count} bg="bg-[#555] text-white" />
        </div>
      )}

      {parseInt(stats?.near_limit_count || '0') > 0 && (
        <div className="mb-4 border-2 border-black bg-c4 p-3 text-xs font-bold shadow-nb flex items-center gap-2">
          🟡 {stats?.near_limit_count} merchant(s) have used &gt;80% of their credit limit
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Assign / update credit */}
        <Card className="bg-c4">
          <CardHead className="bg-c4">
            <span className="text-sm font-bold">💳 Assign / Update Credit</span>
          </CardHead>
          <form onSubmit={handleAssign} className="p-4">
            <Field label="Merchant" required>
              <select className="nb-input w-full" value={assignForm.sellerId}
                onChange={e => setAssignForm(p => ({ ...p, sellerId: e.target.value }))} required>
                <option value="">Select merchant...</option>
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.business_name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Credit limit (₹)" required>
                <Input type="number" value={assignForm.creditLimit}
                  onChange={e => setAssignForm(p => ({ ...p, creditLimit: e.target.value }))} required />
              </Field>
              <Field label="Billing cycle">
                <select className="nb-input w-full" value={assignForm.billingCycle}
                  onChange={e => setAssignForm(p => ({ ...p, billingCycle: e.target.value }))}>
                  <option value="daily">Daily</option>
                  <option value="D1">D+1</option>
                  <option value="D2">D+2</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-between border-2 border-black p-2 mb-3 bg-white">
              <div>
                <div className="text-xs font-bold">Auto-block at limit</div>
                <div className="text-[10px] text-[#777]">Block new orders when credit exhausted</div>
              </div>
              <button type="button"
                className={`w-9 h-5 border-2 border-black rounded-full relative transition-colors ${assignForm.autoBlockAtLimit ? 'bg-c3' : 'bg-[#ddd]'}`}
                onClick={() => setAssignForm(p => ({ ...p, autoBlockAtLimit: !p.autoBlockAtLimit }))}>
                <span className={`absolute top-0.5 w-3 h-3 border-2 border-black rounded-full bg-white transition-all ${assignForm.autoBlockAtLimit ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
            <Btn type="submit" variant="dark" disabled={assigning} className="w-full justify-center py-2.5">
              {assigning ? 'Saving...' : '💳 Assign / Update credit'}
            </Btn>
          </form>
        </Card>

        {/* COD recovery */}
        <Card>
          <CardHead className="bg-black text-white">
            <span className="text-sm font-bold">♻ Auto COD Recovery</span>
          </CardHead>
          <form onSubmit={handleRecover} className="p-4">
            <div className="mb-3 border-2 border-black bg-c5 p-2 text-[11px]">
              <strong>How it works:</strong><br />
              When a COD settlement arrives, the system first recovers the outstanding credit balance, then releases the remainder to the merchant's wallet.
              <div className="font-mono-nb mt-1 text-[10px] border-l-2 border-black pl-2">
                Outstanding: ₹500 · COD: ₹2,000 → Recover ₹500 · Release ₹1,500
              </div>
            </div>
            <Field label="Merchant credit facility" required>
              <select className="nb-input w-full" value={recoverFacilityId} onChange={e => setRecoverFacilityId(e.target.value)} required>
                <option value="">Select merchant...</option>
                {facilities.filter(f => parseFloat(f.credit_outstanding) > 0).map(f => (
                  <option key={f.id} value={f.id}>
                    {f.business_name} — outstanding ₹{parseFloat(f.credit_outstanding).toFixed(2)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="COD settlement amount (₹)" required>
              <Input type="number" value={codAmount} onChange={e => setCodAmount(e.target.value)} placeholder="Total COD received" required />
            </Field>
            <Btn type="submit" variant="success" disabled={recovering} className="w-full justify-center py-2.5">
              {recovering ? 'Processing...' : '♻ Recover & release'}
            </Btn>
          </form>
        </Card>
      </div>

      {/* Facilities table */}
      <h2 className="mb-3 text-lg font-bold">Credit Utilization Dashboard</h2>
      <Card>
        {loading ? <div className="p-4 text-sm">Loading...</div>
        : facilities.length === 0 ? (
          <div className="p-4 text-sm text-[#777]">No credit facilities assigned yet. Use the form above to assign credit to a merchant.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-black text-c3">
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Merchant</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Wallet bal</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Credit limit</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Used credit</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Available</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Utilization</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Cycle</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Status</th>
                  <th className="px-3 py-2 text-left font-mono-nb text-[9px] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map(f => {
                  const utilPct = parseFloat(f.utilization_pct);
                  const riskBand = parseFloat(f.credit_outstanding) >= parseFloat(f.credit_limit) ? 'exhausted'
                    : utilPct >= 80 ? 'near_limit' : 'ok';
                  return (
                    <tr key={f.id} className={`border-b border-[#eee] ${riskBand === 'exhausted' ? 'bg-[#fff5f5]' : riskBand === 'near_limit' ? 'bg-[#fffbeb]' : ''}`}>
                      <td className="px-3 py-2 font-bold">
                        {f.business_name}
                        {riskBand !== 'ok' && (
                          <div><Badge color={RISK_COLOR[riskBand]} className="mt-0.5">{riskBand === 'exhausted' ? '❌ exhausted' : '🟡 near limit'}</Badge></div>
                        )}
                      </td>
                      <td className="font-mono-nb px-3 py-2">₹{parseFloat(f.wallet_balance).toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2">₹{parseFloat(f.credit_limit).toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2 font-bold text-c2">₹{parseFloat(f.credit_outstanding).toFixed(0)}</td>
                      <td className="font-mono-nb px-3 py-2 font-bold text-green-700">₹{parseFloat(f.available_credit).toFixed(0)}</td>
                      <td className="px-3 py-2">
                        <div className="text-xs font-mono-nb font-bold">{utilPct.toFixed(1)}%</div>
                        <div className="mt-0.5 h-2 bg-[#eee] border border-[#ccc] rounded-sm overflow-hidden w-16">
                          <div className={`h-full ${riskBand === 'exhausted' ? 'bg-c2' : riskBand === 'near_limit' ? 'bg-c4' : 'bg-c3'}`}
                            style={{ width: `${Math.min(100, utilPct)}%` }} />
                        </div>
                      </td>
                      <td className="font-mono-nb px-3 py-2">{f.billing_cycle}</td>
                      <td className="px-3 py-2">
                        <Badge color={STATUS_COLOR[f.status] || 'bg-c5'}>{f.status}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1.5">
                          {f.status === 'active' && (
                            <Btn variant="warn" onClick={() => changeStatus(f.id, 'freeze')}>Freeze</Btn>
                          )}
                          {f.status === 'frozen' && (
                            <Btn variant="success" onClick={() => changeStatus(f.id, 'unfreeze')}>Unfreeze</Btn>
                          )}
                          {f.status !== 'removed' && (
                            <Btn variant="danger" onClick={() => changeStatus(f.id, 'remove')}>Remove</Btn>
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
      </Card>
    </div>
  );
}
