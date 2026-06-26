'use client';

import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '@/lib/api';

const REASON_LABELS: Record<string,string> = {
  customer_not_available: 'Not available', wrong_address: 'Wrong address',
  refused_delivery: 'Refused delivery', premises_closed: 'Premises closed',
  out_of_delivery_area: 'Out of area', fake_attempt: 'Fake attempt', other: 'Other',
};

export default function NdrPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState<string|null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/ndr');
      setRecords(data.ndrRecords);
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setLoading(false); }
  }

  async function takeAction(orderId: string, action: string) {
    setActionId(orderId);
    try {
      await api.post(`/ndr/${orderId}/action`, { action });
      load();
    } catch (err) { setError(apiErrorMessage(err)); }
    finally { setActionId(null); }
  }

  return (
    <div className="animate-fade-up max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-3">
            NDR Management
            {records.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#EF4444] text-xs font-bold uppercase tracking-wider">
                {records.length} Pending
              </span>
            )}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">Manage non-delivery reports and prevent RTOs.</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-sm font-medium text-[#991B1B] flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          {error}
        </div>
      )}

      {records.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-[#FFFBEB] border border-[#FEF08A] flex items-start gap-3">
          <div className="mt-0.5 w-6 h-6 rounded-full bg-[#FEF08A] flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#92400E]">Action Required</h4>
            <p className="text-xs font-medium text-[#B45309] mt-0.5">
              Unresolved NDRs auto-convert to RTO after 3 days. Act now to protect your COD revenue.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-[#94A3B8] text-center py-12">Loading NDR records...</div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-1">No pending NDRs</h3>
          <p className="text-sm font-medium text-[#64748B]">All your deliveries are on track. Great job!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map(n => {
            const isCritical = n.attempt_number >= 3;
            return (
              <div key={n.id} className="bg-white rounded-2xl shadow-sm border border-[#E5E8EF] overflow-hidden flex flex-col group hover:border-[#CBD5E1] transition-colors">
                {/* Header */}
                <div className={`px-5 py-4 border-b ${isCritical ? 'bg-[#FEF2F2] border-[#FECACA]' : 'bg-[#F8F9FB] border-[#E5E8EF]'} flex items-start justify-between`}>
                  <div>
                    <div className={`font-mono text-sm font-bold ${isCritical ? 'text-[#991B1B]' : 'text-[#4F46E5]'}`}>
                      #{n.mozopost_order_id}
                    </div>
                    <div className="text-xs font-medium text-[#64748B] mt-1 flex items-center gap-1.5">
                      <span>{n.courier_name}</span>
                      <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                      <span>Attempt {n.attempt_number}/3</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isCritical ? 'bg-[#FECACA] text-[#991B1B]' : 'bg-[#EEF2FF] text-[#4F46E5]'}`}>
                    {REASON_LABELS[n.ndr_reason] || n.ndr_reason}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#F4F6F9] flex items-center justify-center text-[#475569] font-bold text-sm shrink-0">
                      {n.consignee_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0F172A]">{n.consignee_name}</div>
                      <div className="text-xs font-mono text-[#64748B] mt-0.5">{n.consignee_phone}</div>
                    </div>
                  </div>

                  {isCritical && (
                    <div className="mb-4 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs font-medium text-[#991B1B]">
                      Max attempts reached. You must initiate RTO.
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {n.attempt_number < 3 && (
                      <button disabled={actionId===n.order_id} onClick={() => takeAction(n.order_id, 'reattempt')}
                        className="flex-1 bg-[#4F46E5] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#4338CA] transition-colors disabled:opacity-50">
                        Re-attempt
                      </button>
                    )}
                    <button disabled={actionId===n.order_id} onClick={() => takeAction(n.order_id, 'update_address')}
                      className="flex-1 bg-white border border-[#E5E8EF] text-[#475569] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#F8F9FB] hover:text-[#0F172A] transition-colors disabled:opacity-50">
                      Update Address
                    </button>
                    <button disabled={actionId===n.order_id} onClick={() => takeAction(n.order_id, 'rto')}
                      className="flex-none bg-[#FEF2F2] text-[#EF4444] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#FEE2E2] hover:text-[#B91C1C] transition-colors disabled:opacity-50">
                      Mark RTO
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
