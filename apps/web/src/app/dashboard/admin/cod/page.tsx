'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

interface Settlement { id: string; business_name: string; total_orders: number; net_amount: string; status: string; due_date: string | null; }

const STATUS_STYLE: Record<string, string> = {
  pending:    'bg-[#FEF9C3] text-[#854D0E]',
  processing: 'bg-[#DBEAFE] text-[#1E40AF]',
  settled:    'bg-[#D1FAE5] text-[#065F46]',
  on_hold:    'bg-[#FEE2E2] text-[#991B1B]',
  disputed:   'bg-[#FEE2E2] text-[#991B1B]',
};

export default function CodSettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/cod');
      setSettlements(data.remittances || data.settlements || []);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function release(id: string) {
    setActionId(id);
    try {
      await api.patch(`/admin/cod/${id}/status`, { status: 'settled' });
      await load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setActionId(null); }
  }

  const pending = settlements.filter(s => s.status === 'pending');
  const total = settlements.reduce((sum, s) => sum + parseFloat(s.net_amount || '0'), 0);

  return (
    <div className="animate-fade-up max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">COD Settlements</h1>
          <p className="text-sm text-[#64748B] mt-1">Process cash-on-delivery remittances to sellers.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Total Settlements</div>
          <div className="text-2xl font-bold text-[#0F172A] font-mono">{settlements.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Pending Release</div>
          <div className="text-2xl font-bold text-[#CA8A04] font-mono">{pending.length}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-[#E5E8EF] shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-2">Total Payable</div>
          <div className="text-2xl font-bold text-[#16A34A] font-mono">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
        </div>
      </div>

      {error && <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#991B1B]">{error}</div>}

      <div className="bg-white rounded-2xl border border-[#E5E8EF] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-[#94A3B8] animate-pulse">Loading settlements...</div>
        ) : settlements.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-3xl mb-3">💵</div>
            <div className="text-sm font-semibold text-[#0F172A]">No COD settlements yet</div>
            <div className="text-xs text-[#94A3B8] mt-1">Settlements are created automatically as COD orders are delivered.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E5E8EF] bg-[#F8F9FB]">
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Merchant</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Orders</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Net Amount</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Due Date</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {settlements.map(s => (
                  <tr key={s.id} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-sm text-[#0F172A]">{s.business_name}</td>
                    <td className="px-5 py-3.5 text-sm text-[#0F172A] font-mono">{s.total_orders}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-[#16A34A] font-mono">₹{parseFloat(s.net_amount).toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-sm text-[#64748B]">{s.due_date ? new Date(s.due_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_STYLE[s.status] || 'bg-[#F1F5F9] text-[#475569]'}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.status !== 'settled' && (
                        <button
                          disabled={actionId === s.id}
                          onClick={() => release(s.id)}
                          className="px-3 py-1.5 text-xs font-semibold bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338CA] transition-colors disabled:opacity-50"
                        >
                          {actionId === s.id ? 'Releasing...' : 'Release'}
                        </button>
                      )}
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
